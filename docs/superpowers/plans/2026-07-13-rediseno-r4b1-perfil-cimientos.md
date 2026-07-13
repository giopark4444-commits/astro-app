# R4b-1 — Perfil, cimientos del santuario: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** que el 6º mundo deje de ser «Ajustes» y sea **Perfil** — el espacio personal: foto de perfil (Supabase Storage), firma celeste, datos de nacimiento, las personas guardadas, y las preferencias (mudadas desde /ajustes, que se jubila). Las manifestaciones y el diario son R4b-2.

**Architecture:** una ruta nueva `app/(app)/perfil/` que absorbe todo lo de `/ajustes` (`SettingsControls` + `PlanCard`) y añade el hero de identidad + personas. `/ajustes` queda como redirect permanente a `/perfil` (para links viejos y el return_url de Dodo, que se actualiza). La foto vive en un bucket público `avatars` de Storage escribible solo por el dueño (RLS por carpeta `{uid}/`), su ruta se guarda en `profiles_user.avatar_url` (columna nueva). Todo con el cliente browser + sesión (anon key) respetando RLS — NUNCA service-role. Sigue el sistema R3 (tokens + `.card`/`.chip`/`.seg`) y el mockup aprobado `docs/redesign/r4-mockups/06-cupula-topnav.html` pantalla 3.

**Tech Stack:** Next.js 15 App Router, `@supabase/ssr` (browser + server clients ya existentes en `lib/supabase/`), Supabase Storage, `@aluna/core` (numerología + firma de la carta vía `/api/chart`), CSS Modules + tokens R3, next-intl, Vitest.

## Global Constraints

- **Seguridad:** todo write va con el cliente browser + sesión verificada; RLS aísla por `auth.uid()`. NUNCA service-role en esta feature. La subida de foto escribe solo bajo `avatars/{auth.uid()}/`.
- **Móvil intacto bajo 1080px** y **desktop** siguen el shell de R4a (top-nav ya existe; solo cambia el destino de Perfil de `/ajustes` a `/perfil`). El breakpoint desktop de la página nueva es `@media (min-width: 1080px)` con comentario `/* bp desktop R4a */` (mismo literal que el resto).
- **i18n:** toda clave nueva en `messages/es.json` **y** `messages/en.json` (test de paridad `app/__tests__/i18n.test.tsx`).
- Tokens R3; glifos unicode con `U+FE0E` (`"︎"`).
- `database.types.ts` (`packages/supabase/src/database.types.ts`) debe reflejar la columna nueva (regenerar con el MCP o a mano; los tipos generados necesitan `Relationships` o el cliente colapsa a `never`).
- Gate por tarea (desde `apps/web/`, cd absoluto — el cwd del shell no persiste): `npx tsc --noEmit && npx vitest run && rm -rf .next && npx next build`. Suite actual: 153 tests.
- Sin dependencias nuevas. Sin tocar `apps/mobile`. Commits `feat(r4b1):`.

---

### Task 1: Migración — `avatar_url` + bucket `avatars` + RLS de Storage + tipos

**Files:**
- Create: `supabase/migrations/0008_avatars.sql`
- Modify: `packages/supabase/src/database.types.ts` (columna `avatar_url` en `profiles_user` Row/Insert/Update)

**Interfaces:**
- Produces: columna `public.profiles_user.avatar_url text` (nullable); bucket público `avatars`; políticas de `storage.objects` que permiten a `authenticated` insertar/actualizar/borrar solo bajo su carpeta `{uid}/`.

- [ ] **Step 1: Escribir la migración** — `supabase/migrations/0008_avatars.sql`:

```sql
-- Aluna · R4b-1 — foto de perfil (Storage) + avatar_url
-- La foto es del USUARIO (cuenta), no de un birth_profile → vive en profiles_user.
-- Bucket público (lectura directa por URL pública para render sin firmar);
-- escritura restringida por RLS a la carpeta del propio usuario: avatars/{uid}/...

alter table public.profiles_user add column if not exists avatar_url text;

insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

-- storage.objects ya tiene RLS habilitada por Supabase. El usuario solo escribe
-- en su carpeta: el primer segmento del path debe ser su uid.
create policy "avatar insert own"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatar update own"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatar delete own"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- lectura pública: el bucket es public → no hace falta policy de select para render.
```

- [ ] **Step 2: Aplicar la migración** — el controlador la aplica con el MCP de Supabase (`apply_migration`, name `0008_avatars`, project `xcilrdpcanielalpfvld`) o el implementador la deja lista para que el controlador la aplique. NO requiere llaves de Gio (el MCP tiene acceso admin).

- [ ] **Step 3: Verificar en vivo** (controlador, vía MCP `execute_sql`):
  - `select column_name from information_schema.columns where table_name='profiles_user' and column_name='avatar_url';` → 1 fila.
  - `select id, public from storage.buckets where id='avatars';` → `public=true`.
  - `select policyname from pg_policies where tablename='objects' and policyname like 'avatar %';` → 3 filas.

- [ ] **Step 4: Reflejar en los tipos** — en `packages/supabase/src/database.types.ts`, en `profiles_user`, añadir `avatar_url: string | null;` a `Row`, y `avatar_url?: string | null;` a `Insert` y `Update` (junto a `display_name`).

- [ ] **Step 5: Gate** — `npx tsc --noEmit` (desde apps/web) verde. (Sin vitest nuevo; el build valida los tipos.)

- [ ] **Step 6: Commit** — `git add supabase/migrations/0008_avatars.sql packages/supabase/src/database.types.ts && git commit -m "feat(r4b1): migración avatares — avatar_url + bucket + RLS de storage"`.

---

### Task 2: Subida de avatar — helper puro testeado + `AvatarUpload`

**Files:**
- Create: `apps/web/lib/avatar.ts` (helper puro `validateAvatarFile` + `avatarPath`)
- Create: `apps/web/lib/__tests__/avatar.test.ts`
- Create: `apps/web/components/avatar-upload.tsx`
- Create: `apps/web/components/avatar-upload.module.css`
- Modify: `apps/web/messages/es.json`, `apps/web/messages/en.json` (namespace `profile`: `changePhoto`, `photoTooBig`, `photoBadType`, `uploading`)

**Interfaces:**
- Consumes: `createClient` de `@/lib/supabase/client` (browser).
- Produces: `validateAvatarFile(file: {type:string; size:number}): { ok: true } | { ok: false; error: "type" | "size" }` (límite 5 MB, tipos image/png|jpeg|webp); `avatarPath(userId: string): string` → `${userId}/avatar`; componente `AvatarUpload` con props `{ userId: string; initialUrl: string | null; fallback: string }`.

- [ ] **Step 1: Test que falla** — `apps/web/lib/__tests__/avatar.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { validateAvatarFile, avatarPath } from "../avatar";

describe("validateAvatarFile", () => {
  it("acepta png/jpeg/webp bajo 5MB", () => {
    expect(validateAvatarFile({ type: "image/png", size: 1_000_000 })).toEqual({ ok: true });
    expect(validateAvatarFile({ type: "image/jpeg", size: 4_999_999 })).toEqual({ ok: true });
    expect(validateAvatarFile({ type: "image/webp", size: 10 })).toEqual({ ok: true });
  });
  it("rechaza tipos no imagen", () => {
    expect(validateAvatarFile({ type: "application/pdf", size: 10 })).toEqual({ ok: false, error: "type" });
    expect(validateAvatarFile({ type: "image/gif", size: 10 })).toEqual({ ok: false, error: "type" });
  });
  it("rechaza > 5MB", () => {
    expect(validateAvatarFile({ type: "image/png", size: 5_000_001 })).toEqual({ ok: false, error: "size" });
  });
});

describe("avatarPath", () => {
  it("es la carpeta del usuario (para que la RLS de storage la acepte)", () => {
    expect(avatarPath("abc-123")).toBe("abc-123/avatar");
  });
});
```

- [ ] **Step 2: Verlo fallar** — `cd apps/web && npx vitest run lib/__tests__/avatar.test.ts` → FAIL.

- [ ] **Step 3: Helper** — `apps/web/lib/avatar.ts`:

```ts
const MAX_BYTES = 5 * 1024 * 1024;
const OK_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export function validateAvatarFile(file: { type: string; size: number }):
  { ok: true } | { ok: false; error: "type" | "size" } {
  if (!OK_TYPES.has(file.type)) return { ok: false, error: "type" };
  if (file.size > MAX_BYTES) return { ok: false, error: "size" };
  return { ok: true };
}

/** Ruta en el bucket `avatars`. El primer segmento DEBE ser el uid (RLS). */
export function avatarPath(userId: string): string {
  return `${userId}/avatar`;
}
```

- [ ] **Step 4: Verlo pasar** — mismo comando → PASS (4 tests).

- [ ] **Step 5: i18n** — `es.json` namespace nuevo `profile`: `{ "changePhoto": "Cambiar foto", "photoTooBig": "La imagen supera los 5 MB", "photoBadType": "Formato no válido (usa PNG, JPG o WEBP)", "uploading": "Subiendo…" }`. `en.json`: `{ "changePhoto": "Change photo", "photoTooBig": "The image is over 5 MB", "photoBadType": "Invalid format (use PNG, JPG or WEBP)", "uploading": "Uploading…" }`.

- [ ] **Step 6: Componente** — `apps/web/components/avatar-upload.tsx`:

```tsx
"use client";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { validateAvatarFile, avatarPath } from "@/lib/avatar";
import styles from "./avatar-upload.module.css";

/** Avatar de la cuenta con subida a Storage. La foto es pública (bucket public);
 *  la escritura la restringe la RLS a la carpeta {userId}/. El cache-bust ?v=
 *  fuerza refresco tras sobrescribir la misma ruta. */
export function AvatarUpload({ userId, initialUrl, fallback }: { userId: string; initialUrl: string | null; fallback: string }) {
  const t = useTranslations("profile");
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string | null>(initialUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite re-elegir el mismo archivo
    if (!file) return;
    const check = validateAvatarFile(file);
    if (!check.ok) { setError(t(check.error === "size" ? "photoTooBig" : "photoBadType")); return; }
    setError(null);
    setBusy(true);
    try {
      const path = avatarPath(userId);
      const up = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
      if (up.error) throw up.error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const busted = `${data.publicUrl}?v=${Date.now()}`;
      const { error: dbErr } = await supabase.from("profiles_user").update({ avatar_url: path }).eq("id", userId);
      if (dbErr) throw dbErr;
      setUrl(busted);
    } catch {
      setError(t("photoBadType"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <button type="button" className={styles.ring} onClick={() => inputRef.current?.click()} aria-label={t("changePhoto")}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className={styles.img} src={url} alt="" />
        ) : (
          <span className={styles.fallback}>{fallback}</span>
        )}
        <span className={styles.enso} aria-hidden />
      </button>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={onPick} />
      <button type="button" className={styles.changeBtn} onClick={() => inputRef.current?.click()}>
        {busy ? t("uploading") : t("changePhoto")}
      </button>
      {error && <p className={styles.err} role="alert">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 7: Estilos** — `apps/web/components/avatar-upload.module.css` (anillo dorado + punto enso, tokens R3):

```css
.wrap { display: flex; flex-direction: column; align-items: center; gap: var(--sp-2); }
.ring {
  position: relative; width: 132px; height: 132px; border-radius: 50%;
  border: 1px solid rgba(var(--acc-rgb), 0.5); background: var(--surface-2);
  display: grid; place-items: center; cursor: pointer; overflow: hidden; padding: 0;
  box-shadow: 0 0 24px rgba(var(--acc-rgb), 0.18);
}
.img { width: 100%; height: 100%; object-fit: cover; }
.fallback { font-family: var(--font-display); font-size: 48px; color: var(--acc-text); }
.enso { position: absolute; top: 10px; right: 14px; width: 7px; height: 7px; border-radius: 50%; background: var(--acc); }
.changeBtn {
  display: inline-flex; align-items: center; gap: var(--sp-1);
  background: none; border: 0; cursor: pointer;
  color: var(--soft); font-family: var(--font-ui); font-size: var(--text-2xs);
  letter-spacing: 0.5px; text-transform: uppercase;
}
.changeBtn:hover { color: var(--ink); }
.err { color: var(--tone-warm); font-size: var(--text-xs); margin: 0; }
```

- [ ] **Step 8: Gate** — tsc + vitest (157) + `rm -rf .next && npx next build` verde.

- [ ] **Step 9: Commit** — `git commit -m "feat(r4b1): subida de foto de perfil — validación testeada + AvatarUpload"`.

---

### Task 3: Página `/perfil` — hero de identidad + personas

**Files:**
- Create: `apps/web/app/(app)/perfil/page.tsx` (Server Component — auth + carga)
- Create: `apps/web/app/(app)/perfil/perfil-hero.tsx` (`"use client"` — firma celeste vía /api/chart + numerología)
- Create: `apps/web/app/(app)/perfil/personas.tsx` (`"use client"`)
- Create: `apps/web/app/(app)/perfil/perfil.module.css`
- Modify: `apps/web/messages/es.json`, `apps/web/messages/en.json` (namespace `profile`: `sanctuary`, `birthData`, `people`, `peopleSub`, `addPerson`, `compatibility`, `lifePath`)

**Interfaces:**
- Consumes: `createClient` (server) para user + `profiles_user.avatar_url`; `ProfilesProvider`/`useProfiles` (perfil activo + lista); `AvatarUpload` (Task 2); patrón de fetch de `/api/chart` de `hub-view.tsx`; `computeNumerology` + `parseBirth` como los usa `day-number-card.tsx`; `astroLabels`/`SIGN_GLYPH`/`signOfLongitude` como `carta-view.tsx`.
- Produces: la ruta `/perfil` (destino del tab Perfil en Task 4).

- [ ] **Step 1: Server page** — `apps/web/app/(app)/perfil/page.tsx` (carga el avatar del usuario; el resto es client porque necesita el perfil activo y /api/chart):

```tsx
import { createClient } from "@/lib/supabase/server";
import { PerfilHero } from "./perfil-hero";
import { Personas } from "./personas";
import styles from "./perfil.module.css";

export default async function PerfilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: row } = user
    ? await supabase.from("profiles_user").select("avatar_url").eq("id", user.id).maybeSingle()
    : { data: null };
  const avatarPathValue = (row as { avatar_url: string | null } | null)?.avatar_url ?? null;
  const publicUrl = avatarPathValue
    ? supabase.storage.from("avatars").getPublicUrl(avatarPathValue).data.publicUrl
    : null;

  return (
    <main className={styles.page}>
      <PerfilHero userId={user!.id} avatarUrl={publicUrl} />
      <Personas />
      {/* Preferencias las inserta Task 4 aquí */}
    </main>
  );
}
```

- [ ] **Step 2: Hero** — `apps/web/app/(app)/perfil/perfil-hero.tsx`. Firma celeste = Sol/Luna/Asc del perfil activo (fetch `/api/chart` natal, mismo patrón que hub-view) + Camino de vida (numerología, mismo patrón que day-number-card). Degrada con gracia (chips que faltan no se muestran).

```tsx
"use client";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { computeNumerology } from "@aluna/core";
import { signOfLongitude } from "@aluna/core";
import { useProfiles } from "@/lib/profiles/profiles-provider";
import { astroLabels } from "@/lib/content/astrology-labels";
import { AvatarUpload } from "@/components/avatar-upload";
import styles from "./perfil.module.css";

type Core = { sunSign: string; moonSign: string; ascSign: string } | null;

export function PerfilHero({ userId, avatarUrl }: { userId: string; avatarUrl: string | null }) {
  const t = useTranslations("profile");
  const locale = useLocale();
  const L = astroLabels(locale);
  const { active } = useProfiles();
  const [core, setCore] = useState<Core>(null);

  useEffect(() => {
    if (!active) return;
    let alive = true;
    void (async () => {
      try {
        const res = await fetch("/api/chart", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ profileId: active.id, kind: "natal" }),
        });
        const data = await res.json();
        const bodies: Array<{ body: string; sign: string }> = data.chart?.bodies ?? [];
        const asc = data.chart?.houses?.ascendant;
        const sun = bodies.find((b) => b.body === "sun")?.sign;
        const moon = bodies.find((b) => b.body === "moon")?.sign;
        if (alive && sun && moon && asc != null) {
          setCore({ sunSign: sun, moonSign: moon, ascSign: signOfLongitude(asc).sign });
        }
      } catch { /* degrada: sin chips de carta */ }
    })();
    return () => { alive = false; };
  }, [active]);

  const lifePath = active ? computeNumerology({ fullName: active.name, birthDate: active.birth_date }).lifePath.value : null;

  return (
    <section className={styles.hero}>
      <AvatarUpload userId={userId} initialUrl={avatarUrl} fallback={(active?.name ?? "A").slice(0, 1)} />
      <div className={styles.identity}>
        <p className={styles.eyebrow}>{t("sanctuary")}</p>
        <h1 className={styles.name}>{active?.name ?? "Aluna"}</h1>
        <div className={styles.sig}>
          {core && <span className={`chip ${styles.sigChip}`}>☉ {L.signs[core.sunSign]}</span>}
          {core && <span className={`chip ${styles.sigChip}`}>☽ {L.signs[core.moonSign]}</span>}
          {core && <span className={`chip ${styles.sigChip}`}>AC {L.signs[core.ascSign]}</span>}
          {lifePath != null && <span className={`chip ${styles.sigChip}`}>{t("lifePath")} {lifePath}</span>}
        </div>
      </div>
      {active && (
        <div className={`card ${styles.birth}`}>
          <p className={styles.birthH}>{t("birthData")}</p>
          <p className={styles.birthMain}>{new Date(active.birth_date + "T00:00:00").toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })}</p>
          <p className={styles.birthSub}>{active.birth_time ? active.birth_time.slice(0, 5) + " · " : ""}{active.place_name}</p>
        </div>
      )}
    </section>
  );
}
```

Nota: verificar contra `@aluna/core` la firma de `computeNumerology` (day-number-card usa `parseBirth` + `computeNumerology`; usa EXACTAMENTE ese patrón — el snippet de arriba asume `{ fullName, birthDate }`; si day-number-card difiere, cópialo). `signOfLongitude(asc).sign` = mismo uso que carta-view:101. Si `active.birth_date` ya es aceptado por computeNumerology sin `parseBirth`, mejor; si no, usa `parseBirth`.

- [ ] **Step 3: Personas** — `apps/web/app/(app)/perfil/personas.tsx` (lista de `birth_profiles` como avatares + añadir + link a compatibilidad):

```tsx
"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useProfiles } from "@/lib/profiles/profiles-provider";
import styles from "./perfil.module.css";

export function Personas() {
  const t = useTranslations("profile");
  const { profiles, active } = useProfiles();
  return (
    <section className={`card ${styles.people}`}>
      <div className={styles.peopleHead}>
        <div>
          <p className={styles.sectionEyebrow}>{t("people")}</p>
          <p className={styles.peopleSub}>{t("peopleSub")}</p>
        </div>
        <Link href="/compatibilidad" className={styles.compatLink}>{t("compatibility")} →</Link>
      </div>
      <div className={styles.avatars}>
        {profiles.map((p) => (
          <div key={p.id} className={styles.persona}>
            <span className={`${styles.personaAvatar} ${p.id === active?.id ? styles.personaOn : ""}`}>{p.name.slice(0, 1)}</span>
            <span className={styles.personaName}>{p.name}</span>
          </div>
        ))}
        <Link href="/onboarding" className={styles.persona}>
          <span className={`${styles.personaAvatar} ${styles.personaAdd}`} aria-hidden>+</span>
          <span className={styles.personaName}>{t("addPerson")}</span>
        </Link>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: i18n** — `es.json` en `profile`: `"sanctuary": "Tu santuario", "birthData": "Datos de nacimiento", "people": "Personas", "peopleSub": "Los cielos de los tuyos, guardados junto al tuyo.", "addPerson": "Añadir persona", "compatibility": "Compatibilidad", "lifePath": "Camino de vida"`. `en.json`: `"sanctuary": "Your sanctuary", "birthData": "Birth data", "people": "People", "peopleSub": "The skies of your loved ones, kept beside yours.", "addPerson": "Add person", "compatibility": "Compatibility", "lifePath": "Life path"`.

- [ ] **Step 5: Estilos** — `apps/web/app/(app)/perfil/perfil.module.css`. Móvil = pila; desktop = hero en fila + resto. Usa tokens R3. (Escribe el módulo completo: `.page` con padding y `max-width` como las otras páginas + el cap de R4a NO aplica aquí porque /perfil SÍ es diseño desktop; en su lugar `@media (min-width:1080px)` con el hero en grid `auto 1fr auto`.)

```css
.page { position: relative; padding: var(--sp-6) var(--sp-5) var(--sp-7); max-width: 520px; margin: 0 auto; display: flex; flex-direction: column; gap: var(--sp-5); }

.hero { display: flex; flex-direction: column; align-items: center; gap: var(--sp-4); text-align: center; }
.identity { display: flex; flex-direction: column; align-items: center; gap: var(--sp-2); }
.eyebrow { font-size: var(--text-2xs); letter-spacing: 2px; text-transform: uppercase; color: var(--acc-text); margin: 0; }
.name { font-family: var(--font-display); font-size: clamp(30px, 8vw, 40px); font-style: italic; color: var(--ink); margin: 0; }
.sig { display: flex; flex-wrap: wrap; gap: var(--sp-2); justify-content: center; }
.sigChip { font-size: var(--text-xs); }
.birth { display: flex; flex-direction: column; gap: 2px; text-align: left; width: 100%; }
.birthH { font-size: var(--text-2xs); letter-spacing: 1px; text-transform: uppercase; color: var(--acc-text); margin: 0; }
.birthMain { font-family: var(--font-display); font-size: var(--text-lg); color: var(--ink); margin: 0; }
.birthSub { font-size: var(--text-xs); color: var(--soft); margin: 0; }

.people {} /* card global */
.peopleHead { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--sp-3); margin-bottom: var(--sp-4); }
.sectionEyebrow { font-size: var(--text-2xs); letter-spacing: 1.5px; text-transform: uppercase; color: var(--acc-text); font-weight: 700; margin: 0; }
.peopleSub { font-size: var(--text-xs); color: var(--soft); margin: 2px 0 0; }
.compatLink { font-size: var(--text-xs); color: var(--acc-text); white-space: nowrap; }
.avatars { display: flex; flex-wrap: wrap; gap: var(--sp-4); }
.persona { display: flex; flex-direction: column; align-items: center; gap: var(--sp-1); width: 64px; text-align: center; }
.personaAvatar { width: 52px; height: 52px; border-radius: 50%; display: grid; place-items: center; background: var(--surface-2); border: 1px solid var(--line); font-family: var(--font-display); font-size: var(--text-lg); color: var(--acc-text); }
.personaOn { border-color: rgba(var(--acc-rgb), 0.6); box-shadow: 0 0 14px rgba(var(--acc-rgb), 0.28); }
.personaAdd { border-style: dashed; color: var(--soft); }
.personaName { font-size: var(--text-2xs); color: var(--soft); }

@media (min-width: 1080px) { /* bp desktop R4a */
  .page { max-width: min(1080px, calc(100% - 112px)); }
  .hero { flex-direction: row; align-items: center; text-align: left; gap: var(--sp-6); }
  .identity { align-items: flex-start; flex: 1; }
  .name { font-size: 44px; }
  .sig { justify-content: flex-start; }
  .birth { width: auto; min-width: 260px; align-self: stretch; justify-content: center; }
}
```

- [ ] **Step 6: Gate** — tsc + vitest (157) + `rm -rf .next && npx next build` verde (`/perfil` en la lista de rutas).

- [ ] **Step 7: Commit** — `git commit -m "feat(r4b1): página /perfil — hero de identidad (avatar+firma+datos) + personas"`.

---

### Task 4: Mudar preferencias a `/perfil` + jubilar `/ajustes`

**Files:**
- Modify: `apps/web/app/(app)/perfil/page.tsx` (insertar Preferencias)
- Modify: `apps/web/app/(app)/perfil/perfil.module.css` (título de sección de prefs)
- Replace: `apps/web/app/(app)/ajustes/page.tsx` (redirect a `/perfil`)
- Move: `apps/web/app/(app)/ajustes/plan-card.tsx` → `apps/web/app/(app)/perfil/plan-card.tsx`; `settings-controls.tsx` → `perfil/settings-controls.tsx`; `settings.module.css` → `perfil/settings.module.css` (mismo contenido; solo cambia la carpeta y los imports relativos si los hay)
- Modify: `apps/web/app/api/billing/checkout/route.ts:51` y `apps/web/app/api/billing/portal/route.ts:37` (return_url `/ajustes` → `/perfil`)
- Modify: `apps/web/components/top-nav.tsx` (Perfil `href` `/ajustes` → `/perfil`)
- Modify: `apps/web/components/profile-menu.tsx:43` (`/ajustes` → `/perfil`)

**Interfaces:**
- Consumes: `PlanCard`, `SettingsControls` (movidos), `getTranslations`/`getLocale`, `createClient` (server) para la subscription (misma lógica que hoy en ajustes/page.tsx).
- Produces: `/perfil` con Preferencias; `/ajustes` redirige a `/perfil`.

- [ ] **Step 1: Mover los 3 archivos de prefs** — `git mv` de `ajustes/plan-card.tsx`, `ajustes/settings-controls.tsx`, `ajustes/settings.module.css` a `perfil/`. Verificar que sus imports son de `@/...` (absolutos) y no rompen; el import de `styles from "./settings.module.css"` sigue válido tras el move.

- [ ] **Step 2: Preferencias en /perfil** — en `perfil/page.tsx`, cargar la subscription (copiar la lógica exacta de `ajustes/page.tsx`: `getUser` → `subscriptions.select("status, current_period_end").eq("user_id", user.id).maybeSingle()` + el cast `planRow`) y renderizar bajo Personas:

```tsx
// imports añadidos
import { getTranslations, getLocale } from "next-intl/server";
import { PlanCard } from "./plan-card";
import { SettingsControls } from "./settings-controls";
import type { SubscriptionStatus } from "@aluna/core";
// ...la page pasa a leer también searchParams para el checkout:
export default async function PerfilPage({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const t = await getTranslations("profile");
  const locale = await getLocale();
  const { checkout } = await searchParams;
  // ...user + avatar como en Task 3...
  const { data: subRow } = user
    ? await supabase.from("subscriptions").select("status, current_period_end").eq("user_id", user.id).maybeSingle()
    : { data: null };
  const planRow = subRow as { status: SubscriptionStatus; current_period_end: string | null } | null;

  return (
    <main className={styles.page}>
      <PerfilHero userId={user!.id} avatarUrl={publicUrl} />
      <Personas />
      <section className={styles.prefs}>
        <h2 className={styles.prefsTitle}>{t("preferences")}</h2>
        <PlanCard row={planRow} checkoutSuccess={checkout === "success"} />
        <SettingsControls currentLocale={locale} />
      </section>
    </main>
  );
}
```

- [ ] **Step 2b: i18n** — añadir `"preferences": "Preferencias"` (es) / `"Preferences"` (en) al namespace `profile`.

- [ ] **Step 3: Estilo de la sección prefs** — en `perfil.module.css`: `.prefs { display: flex; flex-direction: column; gap: var(--sp-4); } .prefsTitle { font-family: var(--font-display); font-size: var(--text-xl); color: var(--ink); margin: 0; }`.

- [ ] **Step 4: Jubilar /ajustes** — reemplazar `ajustes/page.tsx` entero por un redirect (conserva la ruta pública para links viejos + el return_url por si algún checkout viejo quedó en vuelo):

```tsx
import { redirect } from "next/navigation";

// /ajustes se jubiló: Perfil (R4b) absorbió preferencias + plan. Preserva
// ?checkout=success reenviándolo a /perfil.
export default async function AjustesRedirect({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const { checkout } = await searchParams;
  redirect(checkout ? `/perfil?checkout=${checkout}` : "/perfil");
}
```

- [ ] **Step 5: return_url + nav** — en `checkout/route.ts:51` y `portal/route.ts:37`, cambiar `/ajustes` → `/perfil` (el de checkout conserva `?checkout=success`). En `top-nav.tsx`, el item `perfil`: `href: "/perfil"` (y actualiza el comentario que decía "→ /ajustes hasta R4b"). En `profile-menu.tsx:43`, `href="/perfil"`. El activo del TopNav ahora casa `/perfil`.

- [ ] **Step 6: Ajustar el test del TopNav** — `components/__tests__/top-nav.test.tsx` asertaba `href="/ajustes"` y activación en `/ajustes` para Perfil. Cambiar a `/perfil` en las 2 aserciones (la del href y la de `renderNav("/ajustes")` → `renderNav("/perfil")`). Documentarlo en el reporte.

- [ ] **Step 7: Gate completo** — `cd apps/web && npx tsc --noEmit && npx vitest run && rm -rf .next && npx next build`. Verde. `middleware.test.ts` asertaba `isPublicPath("/ajustes")===false` — sigue válido (la ruta existe como redirect protegido). Confirmar que la suite (157) pasa; si algún test más referencia `/ajustes` como destino, adaptarlo y anotarlo.

- [ ] **Step 8: Commit** — `git commit -m "feat(r4b1): mudar preferencias a /perfil + jubilar /ajustes (redirect + return_url + nav)"`.

---

### Task 5: Subida de avatar por ruta server-side (service-role) — decisión de Gio tras Fase 5

**Contexto (hallazgo de la Fase 5):** la subida client-side directa a Storage da 403 RLS
porque el servicio de Storage de este proyecto NO resuelve `auth.uid()` de los tokens ES256
(llaves de firma asimétricas): PostgREST sí los verifica (probado: 200 + fila propia), Storage
no. No es bug del código; es config de plataforma. Gio eligió el refactor a ruta server-side
con service-role (patrón estándar y seguro), robusto sin importar el problema de Storage.

**Files:**
- Create: `apps/web/app/api/avatar/route.ts`
- Create: `apps/web/app/api/avatar/__tests__/route.test.ts`
- Modify: `apps/web/components/avatar-upload.tsx` (subir vía `fetch("/api/avatar")` en vez del cliente storage)
- Modify: `apps/web/messages/es.json`, `apps/web/messages/en.json` (opcional: `profile.photoUnavailable` si se quiere distinguir el 503; si no, reusar `photoError`)

**Interfaces:**
- Consumes: `authenticateRoute` (`@/lib/supabase/route-auth`, devuelve `{ supabase, user }`), `createServiceSupabaseClient` (`@aluna/supabase/server`), `validateAvatarFile`/`avatarPath` (`@/lib/avatar`).
- Produces: `POST /api/avatar` (multipart `file`) → `{ url }` | error; `AvatarUpload` ahora sube por la ruta.

**SEGURIDAD (el corazón de la tarea):** el path SIEMPRE se deriva de `user.id` de la sesión
verificada (`authenticateRoute`), NUNCA de un campo del cliente. El único input del cliente es
el archivo. La validación de tipo/tamaño se REPITE en el server (la del cliente es solo UX; el
server es el límite de confianza). service-role SOLO en el server, tras verificar identidad.

- [ ] **Step 1: Test que falla** — `apps/web/app/api/avatar/__tests__/route.test.ts`. Mockea `@/lib/supabase/route-auth` (authenticateRoute), `@aluna/supabase/server` (createServiceSupabaseClient con un doble que registra el path del upload) y `process.env.SUPABASE_SERVICE_ROLE_KEY`. Casos:
  - sin user (`authenticateRoute` → `{user:null}`) → 401, no toca storage.
  - sin `SUPABASE_SERVICE_ROLE_KEY` → 503 (latente), no toca storage.
  - archivo inválido (pdf / >5MB) → 400.
  - éxito: sube al path `${user.id}/avatar` (asertar que el upload recibió EXACTAMENTE ese path, aunque el FormData intente colar otro) + actualiza `profiles_user.avatar_url=path` con `.eq("id", user.id)` + responde `{url}`.

- [ ] **Step 2: Verlo fallar** — `cd apps/web && npx vitest run app/api/avatar/__tests__/route.test.ts` → FAIL.

- [ ] **Step 3: La ruta** — `apps/web/app/api/avatar/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { authenticateRoute } from "@/lib/supabase/route-auth";
import { createServiceSupabaseClient } from "@aluna/supabase/server";
import { validateAvatarFile, avatarPath } from "@/lib/avatar";
import type { TablesUpdate } from "@aluna/supabase";

// Subida de avatar server-side. El path se deriva de la sesión verificada (NUNCA
// del cliente) → service-role puede subir sin RLS de storage con seguridad. Nace
// de la Fase 5: Storage no valida los tokens ES256 del proyecto, así que la
// subida client-side no es viable; esta ruta es robusta a ese problema.
export async function POST(req: NextRequest) {
  const { user } = await authenticateRoute(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ error: "unavailable" }, { status: 503 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "nofile" }, { status: 400 });

  const check = validateAvatarFile({ type: file.type, size: file.size });
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });

  const path = avatarPath(user.id); // ← de la sesión, no del cliente
  const svc = createServiceSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
  const bytes = new Uint8Array(await file.arrayBuffer());

  const up = await svc.storage.from("avatars").upload(path, bytes, { upsert: true, contentType: file.type });
  if (up.error) return NextResponse.json({ error: "upload" }, { status: 500 });

  const builder = svc.from("profiles_user") as unknown as {
    update: (v: TablesUpdate<"profiles_user">) => { eq: (c: string, val: string) => Promise<{ error: unknown }> };
  };
  const { error: dbErr } = await builder.update({ avatar_url: path }).eq("id", user.id);
  if (dbErr) return NextResponse.json({ error: "db" }, { status: 500 });

  const { data } = svc.storage.from("avatars").getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
```

Verificar la firma real de `createServiceSupabaseClient` y `TablesUpdate` en `@aluna/supabase` (lib/reports/request.ts:51 la usa — copiar su forma). El shim de `.update()` espeja el de `components/avatar-upload.tsx`/`onboarding/actions.ts`.

- [ ] **Step 4: Verlo pasar** — el test de la ruta en verde.

- [ ] **Step 5: Refactor del cliente** — en `components/avatar-upload.tsx`, reemplazar el bloque de subida (storage.upload + getPublicUrl + profiles_user.update) por:

```tsx
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/avatar", { method: "POST", body: fd });
      if (!res.ok) throw new Error(String(res.status));
      const { url } = (await res.json()) as { url: string };
      setUrl(`${url}?v=${Date.now()}`);
```

Quitar los imports/uso del cliente supabase y de `avatarPath` en el componente si quedan sin uso (la validación client-side con `validateAvatarFile` se queda para feedback instantáneo). No cambia la UI ni los estados busy/error.

- [ ] **Step 6: Gate** — `cd apps/web && npx tsc --noEmit && npx vitest run && rm -rf .next && npx next build`. La suite sube con los tests nuevos de la ruta.

- [ ] **Step 7: Commit** — `git commit -m "feat(r4b1): subida de avatar por ruta server-side (service-role, path de la sesión)"`.

---

## Self-Review

1. **Cobertura del spec:** avatar Storage + RLS (T1) · subida validada (T2) · página /perfil hero+personas (T3) · preferencias mudadas + /ajustes jubilado + nav/return_url (T4). Las **manifestaciones y el diario son R4b-2** (decisión de Gio: lunar de verdad, motor de efemérides) — fuera de este plan, anotado.
2. **Datos de nacimiento editables:** el mockup muestra un lápiz; R4b-1 los MUESTRA (no edita) — editar birth_profiles es una interacción aparte (afecta cartas cacheadas). Anotado como deuda; el hero deja el espacio pero sin el lápiz activo (YAGNI para esta tanda).
3. **Placeholders:** los snippets con "verificar contra @aluna/core / copiar de day-number-card" son por precisión de firma, no huecos — el implementador tiene los archivos de referencia nombrados (day-number-card.tsx, carta-view.tsx:101, hub-view.tsx).
4. **Seguridad:** avatar escribe solo bajo `{uid}/` (RLS de storage.objects); `avatar_url` lo actualiza el dueño vía RLS "own profile update" (ya existe); ningún service-role. La foto es pública por diseño (bucket public) — aceptable para un avatar; anotar por si Gio quiere privado luego (necesitaría signed URLs).
5. **Consistencia:** `avatarPath` (T2) produce `{uid}/avatar`; la RLS (T1) valida `foldername(name)[1] === uid` → `{uid}` es el primer segmento ✓. `avatar_url` guarda la RUTA (no la URL pública) → el render deriva `getPublicUrl` (server en page, client tras subir) ✓.

**Verificación del controlador (Fase 5, NO tarea del plan):** navegador real con usuario de prueba (SQL) — /perfil renderiza hero con firma + datos + personas + preferencias; subir una imagen real → aparece y persiste (recargar); /ajustes redirige a /perfil; return de checkout cae en /perfil; TopNav Perfil activo en /perfil; móvil intacto. Borrar usuario + objeto de storage de prueba. Luego review whole-branch + merge.
