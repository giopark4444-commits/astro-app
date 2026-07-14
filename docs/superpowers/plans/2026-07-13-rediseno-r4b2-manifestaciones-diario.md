# R4b-2 — Manifestaciones lunares + Diario (la joya del santuario): plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** el corazón del santuario — **manifestaciones** que se siembran a horizontes de tiempo REALES (próxima luna nueva/llena calculadas con el motor de efemérides, tu revolución solar, +3 meses, +1 año) con la fase (sembrada→creciendo→cosechada) derivada del tiempo; y un **diario** (cuaderno nocturno). Ambas secciones viven en `/perfil`, bajo Personas.

**Architecture:** las fechas lunares/solares se calculan SERVER-SIDE al crear la manifestación (el motor `@aluna/ephemeris` es solo-servidor por `sweph` nativo) y se guardan como `target_date` en la fila — el cliente nunca toca efemérides. La fase es una función PURA de (sembrada, target, ahora) en `@aluna/core` (RN-safe). CRUD de `manifestations` y `journal_notes` por rutas server-side (`authenticateRoute`, RLS por dueño = patrón `birth_profiles`), `user_id` SIEMPRE de la sesión verificada. UI en `/perfil` siguiendo el sistema R3 + el mockup `docs/redesign/r4-mockups/06-cupula-topnav.html` pantalla 3.

**Tech Stack:** `@aluna/ephemeris` (sweph, server-only), `@aluna/core` (puro), Next.js 15 route handlers, `@supabase/ssr` + RLS, Supabase Postgres, CSS Modules + tokens R3, next-intl, Vitest.

## Global Constraints
- **Seguridad:** `user_id` SIEMPRE de `authenticateRoute(req).user.id` (sesión verificada), NUNCA del body. RLS CRUD por dueño (`user_id = auth.uid()`) en ambas tablas. Las rutas escriben con el cliente de sesión (RLS) — NO service-role (a diferencia de avatar, aquí PostgREST sí valida los tokens ES256, probado en R4b-1: PostgREST 200).
- **Efemérides solo servidor:** `@aluna/ephemeris` NUNCA se importa desde componentes cliente ni desde `apps/mobile`. El cálculo de fecha ocurre en la ruta de creación.
- **Fase derivada, no almacenada:** no hay columna de fase; se computa con `manifestationPhase()` (decisión de Gio: "la fase se deriva sola del tiempo").
- i18n es/en paridad (test `app/__tests__/i18n.test.tsx`). Tokens R3. Glifos unicode con `U+FE0E`.
- Gate por tarea (desde `apps/web/`, cd absoluto): `npx tsc --noEmit && npx vitest run && rm -rf .next && npx next build`. Suite actual: 165 tests.
- Migración aplicada por el controlador vía MCP (no necesita llaves de Gio). Sin deps nuevas. Commits `feat(r4b2):`.

---

### Task 1: `@aluna/ephemeris` — fecha de próxima luna nueva/llena + revolución solar

**Files:**
- Create: `packages/ephemeris/src/lunar.ts`
- Modify: `packages/ephemeris/src/index.ts` (exportar)
- Create: `packages/ephemeris/src/__tests__/lunar.test.ts`

**Interfaces:**
- Produces: `nextLunarPhase(phase: "new" | "full", fromIso?: string): string` (ISO UTC del próximo instante donde la elongación Luna-Sol cruza 0°/180°); `solarReturnDate(natal: ChartInput, fromIso?: string): string` (ISO UTC del regreso del Sol a su longitud natal).

**Técnica (validada por el controlador contra sweph real):** iteración Newton sobre la elongación Luna-Sol, que crece monótona ~12.19°/día (la Luna nunca retrograda respecto al Sol) → converge en ~4 pasos. Referencia real: desde `2026-07-13T12:00:00Z`, próxima nueva = 2026-07-14, próxima llena = 2026-07-29; ciclo nueva→nueva ≈ 29.3–29.5 días.

- [ ] **Step 1: Test que falla** — `packages/ephemeris/src/__tests__/lunar.test.ts` (el paquete ya resuelve la ruta .se1 en su vitest.setup):

```ts
import { describe, it, expect } from "vitest";
import { DateTime } from "luxon";
import { nextLunarPhase } from "../lunar";
import { computeBodies } from "../bodies";
import { localToJulianDay } from "../time";

function elongationAt(iso: string): number {
  const dt = DateTime.fromISO(iso, { zone: "utc" });
  const { julianDayEt } = localToJulianDay({ year: dt.year, month: dt.month, day: dt.day, hour: dt.hour, minute: dt.minute, timeZone: "utc" });
  const b = computeBodies(julianDayEt);
  const sun = b.find((x) => x.body === "sun")!.longitude;
  const moon = b.find((x) => x.body === "moon")!.longitude;
  return (((moon - sun) % 360) + 360) % 360;
}

describe("nextLunarPhase", () => {
  const FROM = "2026-07-13T12:00:00Z";

  it("la próxima luna nueva tiene elongación ≈ 0 y es posterior a 'from'", () => {
    const iso = nextLunarPhase("new", FROM);
    expect(iso > FROM).toBe(true);
    const e = elongationAt(iso);
    expect(Math.min(e, 360 - e)).toBeLessThan(0.05); // cerca de 0/360
    expect(iso.slice(0, 10)).toBe("2026-07-14"); // fecha real (sweph)
  });

  it("la próxima luna llena tiene elongación ≈ 180", () => {
    const iso = nextLunarPhase("full", FROM);
    expect(Math.abs(elongationAt(iso) - 180)).toBeLessThan(0.05);
    expect(iso.slice(0, 10)).toBe("2026-07-29");
  });

  it("el ciclo nueva→nueva es ~29.5 días", () => {
    const a = nextLunarPhase("new", FROM);
    const b = nextLunarPhase("new", a);
    const days = DateTime.fromISO(b).diff(DateTime.fromISO(a), "days").days;
    expect(days).toBeGreaterThan(29);
    expect(days).toBeLessThan(30);
  });
});
```

- [ ] **Step 2: Verlo fallar** — `cd packages/ephemeris && npx vitest run src/__tests__/lunar.test.ts` → FAIL (no existe `../lunar`).

- [ ] **Step 3: Implementación** — `packages/ephemeris/src/lunar.ts`:

```ts
import { DateTime } from "luxon";
import type { ChartInput } from "@aluna/core";
import { computeBodies } from "./bodies";
import { localToJulianDay } from "./time";
import { computeChart } from "./chart";

const MOON_SUN_DEG_PER_DAY = 12.19; // elongación media Luna-Sol
const SUN_DEG_PER_DAY = 0.98563;

function elongationAt(dt: DateTime): number {
  const { julianDayEt } = localToJulianDay({
    year: dt.year, month: dt.month, day: dt.day, hour: dt.hour, minute: dt.minute, timeZone: "utc",
  });
  const b = computeBodies(julianDayEt);
  const sun = b.find((x) => x.body === "sun")!.longitude;
  const moon = b.find((x) => x.body === "moon")!.longitude;
  return (((moon - sun) % 360) + 360) % 360;
}

/** ISO UTC del próximo instante (posterior a fromIso) donde la Luna está en
 *  conjunción (new, elong 0°) u oposición (full, 180°) con el Sol. */
export function nextLunarPhase(phase: "new" | "full", fromIso?: string): string {
  const target = phase === "new" ? 0 : 180;
  let dt = fromIso ? DateTime.fromISO(fromIso, { zone: "utc" }) : DateTime.utc();
  // salto inicial hacia adelante hasta el próximo cruce
  let delta = (((target - elongationAt(dt)) % 360) + 360) % 360; // 0..360 adelante
  if (delta < 0.5) delta += 360; // ya en el target → la SIGUIENTE, no esta
  dt = dt.plus({ days: delta / MOON_SUN_DEG_PER_DAY });
  for (let i = 0; i < 10; i++) {
    const resid = ((((target - elongationAt(dt)) % 360) + 540) % 360) - 180; // -180..180
    if (Math.abs(resid) < 0.02) break;
    dt = dt.plus({ days: resid / MOON_SUN_DEG_PER_DAY });
  }
  return dt.toUTC().toISO()!;
}

/** ISO UTC del regreso del Sol a su longitud natal (revolución solar), buscando
 *  hacia adelante desde fromIso. Reusa la técnica de derived.ts. */
export function solarReturnDate(natal: ChartInput, fromIso?: string): string {
  const natalSunLon = computeChart(natal).bodies.find((b) => b.body === "sun")!.longitude;
  const from = fromIso ? DateTime.fromISO(fromIso, { zone: "utc" }) : DateTime.utc();
  const local = from.setZone(natal.timeZone);
  // candidato: el cumpleaños solar de ESTE año; si ya pasó, el del próximo
  let dt = DateTime.fromObject(
    { year: local.year, month: natal.month, day: natal.day, hour: natal.hour, minute: natal.minute },
    { zone: natal.timeZone },
  );
  if (dt.toUTC() < from) dt = dt.plus({ years: 1 });
  for (let i = 0; i < 8; i++) {
    const sunNow = computeChart({ ...natal, year: dt.year, month: dt.month, day: dt.day, hour: dt.hour, minute: dt.minute })
      .bodies.find((b) => b.body === "sun")!.longitude;
    const diff = (((natalSunLon - sunNow + 540) % 360)) - 180;
    if (Math.abs(diff) < 1e-4) break;
    dt = dt.plus({ days: diff / SUN_DEG_PER_DAY });
  }
  return dt.toUTC().toISO()!;
}
```

- [ ] **Step 4: Verlo pasar** — mismo comando → PASS (3 tests). Añadir un test de `solarReturnDate` (con la carta de Gio `{year:1990,month:2,day:4,...}` y `fromIso` fijo, asertar que el mes resultante es febrero y el Sol vuelve a ♒ ~15°57′ — reusar `computeChart` en el test para verificar la longitud del Sol en la fecha devuelta ≈ la natal).

- [ ] **Step 5: Exportar** — en `packages/ephemeris/src/index.ts`, `export { nextLunarPhase, solarReturnDate } from "./lunar";`.

- [ ] **Step 6: Gate** — `cd apps/web && npx tsc --noEmit && npx vitest run` verde (el paquete se testea en su propio proyecto; el monorepo turbo los corre — o correr en packages/ephemeris). Commit.

- [ ] **Step 7: Commit** — `git commit -m "feat(r4b2): efemérides — nextLunarPhase (nueva/llena) + solarReturnDate"`.

---

### Task 2: Migración `manifestations` + `journal_notes` (RLS CRUD del dueño) + tipos

**Files:**
- Create: `supabase/migrations/0010_manifestations_journal.sql`
- Modify: `packages/supabase/src/database.types.ts`

**Interfaces:**
- Produces: tablas `public.manifestations` y `public.journal_notes` con RLS CRUD por `user_id = auth.uid()`.

- [ ] **Step 1: Migración** — `supabase/migrations/0010_manifestations_journal.sql`:

```sql
-- Aluna · R4b-2 — el corazón del santuario: manifestaciones + diario.
-- Ambas por USUARIO, escritas por el propio usuario (RLS CRUD, patrón birth_profiles).

create table public.manifestations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles_user(id) on delete cascade,
  intention text not null check (char_length(intention) between 1 and 280),
  horizon text not null check (horizon in ('new_moon','full_moon','solar_return','three_months','one_year')),
  target_date date not null,   -- calculada server-side al crear (efemérides para las lunares/solar)
  created_at timestamptz not null default now()  -- fecha de "siembra"
);
alter table public.manifestations enable row level security;
create policy "own manifestations select" on public.manifestations for select using (user_id = auth.uid());
create policy "own manifestations insert" on public.manifestations for insert with check (user_id = auth.uid());
create policy "own manifestations update" on public.manifestations for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own manifestations delete" on public.manifestations for delete using (user_id = auth.uid());

create table public.journal_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles_user(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  kind text not null default 'note' check (kind in ('dream','transit','idea','note')),
  created_at timestamptz not null default now()
);
alter table public.journal_notes enable row level security;
create policy "own journal select" on public.journal_notes for select using (user_id = auth.uid());
create policy "own journal insert" on public.journal_notes for insert with check (user_id = auth.uid());
create policy "own journal update" on public.journal_notes for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own journal delete" on public.journal_notes for delete using (user_id = auth.uid());
```

- [ ] **Step 2: Aplicar** (controlador, MCP `apply_migration` name `0010_manifestations_journal`, project `xcilrdpcanielalpfvld`).

- [ ] **Step 3: Verificar** (controlador, MCP): las 2 tablas existen, RLS on, 4 políticas c/u (8 total).

- [ ] **Step 4: Tipos** — en `packages/supabase/src/database.types.ts`, añadir `manifestations` y `journal_notes` a `Tables` (Row/Insert/Update/Relationships), espejando la forma de `user_reports`/`birth_profiles` (ver cómo se declararon a mano las tablas post-0004). Campos con sus tipos: intention/horizon/target_date/created_at, body/kind/created_at.

- [ ] **Step 5: Gate** — `cd apps/web && npx tsc --noEmit` verde. Commit.

- [ ] **Step 6: Commit** — `git commit -m "feat(r4b2): migración manifestations + journal_notes (RLS CRUD del dueño)"`.

---

### Task 3: Lógica pura — horizontes + fase (TDD)

**Files:**
- Create: `packages/core/src/manifestations/phase.ts` (+ export en el index del core)
- Create: `packages/core/src/manifestations/__tests__/phase.test.ts`
- Create: `apps/web/lib/manifestations/horizon.ts` (server: resuelve la fecha; importa @aluna/ephemeris)

**Interfaces:**
- Produces (core, PURO): `HORIZONS` (los 5 tipos); `manifestationPhase(seededIso: string, targetIso: string, nowIso: string): { phase: "sembrada" | "creciendo" | "cosechada"; progress: number; daysToTarget: number }`.
- Produces (web, SERVER): `resolveHorizonDate(horizon: Horizon, natal: ChartInput | null, nowIso: string): string` (ISO date `YYYY-MM-DD`).

- [ ] **Step 1: Test de la fase (puro)** — `packages/core/src/manifestations/__tests__/phase.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { manifestationPhase } from "../phase";

describe("manifestationPhase", () => {
  const seeded = "2026-07-01T00:00:00Z";
  const target = "2026-07-31T00:00:00Z";
  it("recién sembrada", () => {
    const r = manifestationPhase(seeded, target, "2026-07-01T06:00:00Z");
    expect(r.phase).toBe("sembrada");
    expect(r.progress).toBeCloseTo(0, 1);
  });
  it("a mitad de camino = creciendo", () => {
    const r = manifestationPhase(seeded, target, "2026-07-16T00:00:00Z");
    expect(r.phase).toBe("creciendo");
    expect(r.progress).toBeGreaterThan(0.4);
    expect(r.progress).toBeLessThan(0.6);
    expect(r.daysToTarget).toBe(15);
  });
  it("pasado el objetivo = cosechada", () => {
    const r = manifestationPhase(seeded, target, "2026-08-05T00:00:00Z");
    expect(r.phase).toBe("cosechada");
    expect(r.progress).toBe(1);
  });
});
```

- [ ] **Step 2: Verlo fallar** — `cd packages/core && npx vitest run src/manifestations/__tests__/phase.test.ts` → FAIL.

- [ ] **Step 3: Implementación pura** — `packages/core/src/manifestations/phase.ts`:

```ts
export const HORIZONS = ["new_moon", "full_moon", "solar_return", "three_months", "one_year"] as const;
export type Horizon = (typeof HORIZONS)[number];

const MS_DAY = 86_400_000;

/** Fase derivada del tiempo (decisión de Gio): sembrada al crear, creciendo
 *  mientras avanza hacia el horizonte, cosechada al alcanzarlo. progress 0..1. */
export function manifestationPhase(seededIso: string, targetIso: string, nowIso: string): {
  phase: "sembrada" | "creciendo" | "cosechada";
  progress: number;
  daysToTarget: number;
} {
  const seeded = Date.parse(seededIso);
  const target = Date.parse(targetIso);
  const now = Date.parse(nowIso);
  const span = Math.max(target - seeded, MS_DAY);
  const progress = Math.min(Math.max((now - seeded) / span, 0), 1);
  const daysToTarget = Math.ceil((target - now) / MS_DAY);
  let phase: "sembrada" | "creciendo" | "cosechada";
  if (now >= target) phase = "cosechada";
  else if (progress < 0.08) phase = "sembrada"; // reciencita
  else phase = "creciendo";
  return { phase, progress, daysToTarget };
}
```

Exportar desde el index de `@aluna/core` (junto a los otros dominios). NO importa efemérides (puro, RN-safe).

- [ ] **Step 4: Verlo pasar** — PASS.

- [ ] **Step 5: Resolver de fecha (server)** — `apps/web/lib/manifestations/horizon.ts`:

```ts
import { DateTime } from "luxon";
import type { ChartInput } from "@aluna/core";
import type { Horizon } from "@aluna/core";
import { nextLunarPhase, solarReturnDate } from "@aluna/ephemeris";

/** Resuelve el horizonte a una fecha YYYY-MM-DD. Lunares/solar via efemérides
 *  (server-only); relativos por aritmética de fecha. `nowIso` fija el "ahora". */
export function resolveHorizonDate(horizon: Horizon, natal: ChartInput | null, nowIso: string): string {
  const now = DateTime.fromISO(nowIso, { zone: "utc" });
  switch (horizon) {
    case "new_moon": return nextLunarPhase("new", nowIso).slice(0, 10);
    case "full_moon": return nextLunarPhase("full", nowIso).slice(0, 10);
    case "solar_return":
      // sin carta (perfil sin hora igual sirve: la longitud del Sol no depende de la hora al día)
      return natal ? solarReturnDate(natal, nowIso).slice(0, 10) : now.plus({ years: 1 }).toISODate()!;
    case "three_months": return now.plus({ months: 3 }).toISODate()!;
    case "one_year": return now.plus({ years: 1 }).toISODate()!;
  }
}
```

(Sin test unitario propio de `resolveHorizonDate` — las lunares ya se testean en T1 y este es un router delgado; se ejercita en el test de la ruta de T4 y en la Fase 5.)

- [ ] **Step 6: Gate** — tsc + vitest verde. Commit.

- [ ] **Step 7: Commit** — `git commit -m "feat(r4b2): fase pura (core) + resolver de horizontes (server)"`.

---

### Task 4: Rutas API — CRUD de manifestaciones y diario

**Files:**
- Create: `apps/web/app/api/manifestations/route.ts` (GET lista, POST crea)
- Create: `apps/web/app/api/manifestations/[id]/route.ts` (DELETE)
- Create: `apps/web/app/api/journal/route.ts` (GET, POST)
- Create: `apps/web/app/api/journal/[id]/route.ts` (DELETE)
- Create: `apps/web/app/api/manifestations/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `authenticateRoute` (`{ supabase, user }`), `resolveHorizonDate` (T3), `HORIZONS`/`Horizon` (core), la carta activa del perfil (para solar_return: el POST recibe `profileId` y la ruta computa el `ChartInput` con `computeChart`... NO — el server necesita el natal; reusar el mapper `lib/chart.ts` que arma ChartInput desde un birth_profile, como hace `/api/chart`). El `user_id` va de `user.id`.
- Produces: los endpoints. Respuestas JSON.

**Diseño (léelo):** POST /api/manifestations recibe `{ intention, horizon, profileId }`. Valida horizon ∈ HORIZONS + intención 1..280. Si horizon = solar_return, carga el birth_profile (RLS, del user) → ChartInput (mapper de lib/chart.ts) → resolveHorizonDate con la carta; si no, natal=null. Inserta `{ user_id: user.id, intention, horizon, target_date }` con el cliente de sesión (RLS). GET devuelve las del user ordenadas por target_date. DELETE /[id] borra la propia (RLS ya lo garantiza; igual filtra por user_id defensivo). Journal es igual pero sin efemérides: POST `{ body, kind }`.

- [ ] **Step 1: Test de la ruta** (mockea authenticateRoute + el cliente supabase + resolveHorizonDate). Casos: 401 sin user; 400 horizon inválido; 400 intención vacía/>280; 200 crea con `user_id` de sesión (asertar que el insert recibió `user.id`, NO un user_id del body aunque se intente colar) + `target_date` del resolver. Ver el patrón del test de `/api/avatar` (R4b-1).

- [ ] **Step 2..N:** implementar las 4 rutas siguiendo el patrón de rutas server-side del repo (`export const runtime = "nodejs"`, `authenticateRoute`, validación, RLS, `console.error` en fallos sin filtrar al cliente). El `user_id` SIEMPRE de `user.id`. Gate + commit.

- [ ] **Commit** — `git commit -m "feat(r4b2): rutas CRUD de manifestaciones (con horizonte lunar) y diario"`.

---

### Task 5: UI — sección Manifestaciones en `/perfil` (la joya)

**Files:**
- Create: `apps/web/app/(app)/perfil/manifestations.tsx` (`"use client"`)
- Modify: `apps/web/app/(app)/perfil/page.tsx` (montar bajo Personas)
- Modify: `apps/web/app/(app)/perfil/perfil.module.css`
- Modify: `apps/web/messages/{es,en}.json` (namespace `manifest`)

**Interfaces:** Consume `/api/manifestations` (GET/POST/DELETE), `manifestationPhase` (core, para la fase/progreso client-side), `useProfiles` (profileId activo para solar_return). Sigue el mockup pantalla 3: tarjetas tintadas por horizonte (luna nueva=violeta noche, luna llena=oro, rev solar=azul, +3m/+1año=terracota/verde), puntos de fase (○○●), "se cosecha en N días", botón "+ Sembrar una intención" que abre un form (elegir horizonte + escribir intención). Contenido real, voz Aluna. Estados: loading/empty ("Siembra tu primera intención…")/error.

- [ ] Pasos TDD ligeros (la lógica pura ya está testeada; aquí es UI). Gate incluye `next build`. Reduced-motion en cualquier animación. Commit `feat(r4b2): sección Manifestaciones en /perfil (horizontes lunares + fases)`.

---

### Task 6: UI — sección Diario (cuaderno nocturno) en `/perfil`

**Files:**
- Create: `apps/web/app/(app)/perfil/journal.tsx` (`"use client"`)
- Modify: `perfil/page.tsx`, `perfil.module.css`, `messages/{es,en}.json` (namespace `journal`)

**Interfaces:** Consume `/api/journal`. Notas con badge de glifo por `kind` (☽ dream, ♄ transit, ✦ idea, • note), serif itálica, hairlines (estética del mockup). Botón "+ Nueva nota" (elegir kind + escribir). Estados loading/empty/error. Commit `feat(r4b2): sección Diario (cuaderno nocturno) en /perfil`.

---

## Self-Review
- Cobertura: efemérides lunar/solar (T1) · esquema+RLS (T2) · fase pura + resolver (T3) · CRUD API (T4) · UI manifestaciones (T5) · UI diario (T6). Cubre la decisión de Gio (lunar de verdad + fase derivada del tiempo).
- **Seguridad:** `user_id` de sesión en todo write (no service-role — PostgREST valida ES256, probado en R4b-1); RLS CRUD del dueño; efemérides solo server. El review final de seguridad (Fable 5) revisará el trust boundary de las rutas nuevas + las 2 RLS nuevas.
- **Placeholders:** T5/T6 dan la forma y el contrato pero no el JSX completo (UI iterativa); el implementador reusa el sistema R3 + el mockup pantalla 3 (referencia nombrada). T1-T4 llevan código completo (la parte con riesgo real).
- Fase "cosechada" es solo por tiempo (sin marca manual de "cumplida") — decisión de Gio; una marca manual sería futuro.
- **Verificación del controlador (Fase 5):** navegador real con usuario de prueba (SQL) — sembrar una manifestación de cada horizonte y ver la fecha real (luna nueva/llena correctas), la fase/progreso, borrar; crear/borrar notas; móvil. La revolución solar necesita un perfil con carta. Borrar el usuario de prueba. Luego review whole-branch de seguridad + merge.
