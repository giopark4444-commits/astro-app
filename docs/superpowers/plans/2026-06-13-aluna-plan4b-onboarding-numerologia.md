# Aluna · Plan 4b (Web) — Onboarding ceremonial + Numerología (Modo Pro)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax. **Tareas de UI (3, 5): invocar PRIMERO los skills de diseño (frontend-design / impeccable) con la vara visual `numerologia-craft-comparativa.html` / `aluna-set-final.html`** — es regla del proyecto; el objetivo es la calidad "Crafted · Aluna", no el mínimo funcional.

**Goal:** Completar el Corte 1: el usuario hace el **onboarding ceremonial** (datos de nacimiento reales, geocodificados → `birth_profiles`), puede **cambiar de persona**, y ve su **Numerología completa (Modo Pro)** calculada en el cliente. La app pasa de "shell vacío" a "entra, crea perfil, ve sus números".

**Architecture:** Todo sobre el shell del Plan 4a (Next.js 15, temas, i18n, auth SSR). **Numerología = cálculo puro client-side** con `computeNumerology` de `@aluna/core` (isomórfico, sin backend). **Geocodificación** = route handler que proxea **Open-Meteo Geocoding** (gratis, sin llave; su respuesta incluye `latitude`, `longitude` y `timezone` IANA → un solo fetch). El onboarding crea `birth_profiles` vía server action; el perfil activo se mantiene en un contexto cliente (cambio en vivo recalcula). La carta astral (rueda) **NO** entra aquí — es el corte siguiente.

**Tech Stack:** Next.js 15 App Router, TS strict, Vitest + Testing Library, `@aluna/core` (numerología), `@aluna/supabase` (datos), CSS Modules + los tokens del 4a. Geocoding: Open-Meteo (`fetch`, sin dep nueva).

**Spec:** `docs/superpowers/specs/2026-06-13-aluna-plan4-web-corte1-design.md` (este plan cubre la mitad "onboarding + numerología").

---

## Estado de partida (Plan 4a, en `main`)

- `apps/web` con: tokens de los 3 temas, `ThemeProvider`/`useTheme`, i18n (`useTranslations`/`getTranslations`; `@/i18n/locale` con `LOCALE_COOKIE`/`resolveLocale`), Supabase SSR (`@/lib/supabase/server` async `createClient()`, `@/lib/supabase/client` browser), middleware guard, shell `(app)/` con `BottomNav` (pestaña **Números** hoy `soon`), hub `hoy`, `ajustes`.
- `@aluna/core` exporta `computeNumerology(input): NumerologyResult` y los tipos. Firma:
  ```ts
  interface NumerologyInput { fullName: string; birthDate: { year: number; month: number; day: number }; asOf?: {year;month;day} }
  interface NumerologyResult {
    core: { lifePath, expression, soulUrge, personality, birthday, maturity: ReductionTrace };
    cycles: { personalYear, personalMonth, personalDay: ReductionTrace };
    pinnacles: Array<{ value: number; isMaster: boolean; startAge: number; endAge: number | null }>;
    challenges: Array<{ value: number; startAge: number; endAge: number | null }>;
    karmic: { lessons: number[]; debts: Array<13|14|16|19>; inclusion: Record<number, number>; hiddenPassion: number[] };
  }
  // ReductionTrace = { steps: number[]; value: number; isMaster: boolean; karmicDebt?: 13|14|16|19 }
  ```
- Tabla `birth_profiles` (NOT NULL salvo `birth_time`): `name`, `birth_date` (date `YYYY-MM-DD`), `birth_time` (time `HH:MM` | null), `time_known` (bool), `place_name`, `latitude`, `longitude`, `time_zone` (IANA), `gender` (`feminine|masculine|neutral`), `user_id`. RLS: cada quien ve solo sus filas.

---

## Estructura de archivos (se crea en este plan)

```
apps/web/
├── lib/
│   ├── geocode.ts              # parseOpenMeteo(json) -> GeocodeResult[]  (puro, TDD)
│   ├── onboarding.ts           # tipos de respuestas + answersToInsert() + validación de paso (puro, TDD)
│   └── numerology.ts           # profileToNumerologyInput(row) + helpers de formato (puro, TDD)
├── app/
│   ├── api/geocode/route.ts    # GET ?q= -> Open-Meteo -> GeocodeResult[]
│   └── onboarding/
│       ├── page.tsx            # server: si ya hay perfil -> /numeros; si no, render del flujo
│       ├── onboarding-flow.tsx # client: máquina de pasos (nombre→fecha→hora→lugar→género)
│       ├── place-autocomplete.tsx  # client: consulta /api/geocode
│       └── actions.ts          # createBirthProfile server action
├── lib/profiles/
│   ├── profiles-provider.tsx   # client context: perfiles + activo (cambio en vivo)
│   └── profile-actions.ts      # (si hace falta) borrar/renombrar — mínimo en este corte
├── components/
│   ├── bottom-sheet.tsx        # hoja inferior reusable (tap-to-expand)
│   └── profile-menu.tsx        # avatar Perfil arriba: cambiar persona, +nuevo, Ajustes
└── app/(app)/
    ├── layout.tsx              # MOD: carga perfiles + envuelve en ProfilesProvider + ProfileMenu
    └── numeros/
        ├── page.tsx            # server shell de la sección
        ├── numerology-view.tsx # client: computeNumerology(perfil activo) + Resumen/Modo Pro
        └── numerology-view.module.css
```

---

## Task 1: Geocodificación (Open-Meteo) — parser puro (TDD) + route handler

**Files:**
- Create: `apps/web/lib/geocode.ts`
- Create: `apps/web/app/api/geocode/route.ts`
- Test: `apps/web/lib/__tests__/geocode.test.ts`

- [ ] **Step 1: Escribir el test del parser (falla primero)**

`apps/web/lib/__tests__/geocode.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { parseOpenMeteo } from "../geocode";

const SAMPLE = {
  results: [
    { id: 1, name: "Quito", latitude: -0.22985, longitude: -78.52495, timezone: "America/Guayaquil", country: "Ecuador", admin1: "Pichincha" },
    { id: 2, name: "Quito Loma", latitude: 1.0, longitude: 2.0, timezone: "America/Bogota", country: "Colombia" },
  ],
};

describe("parseOpenMeteo", () => {
  it("mapea resultados a GeocodeResult con tz IANA", () => {
    const r = parseOpenMeteo(SAMPLE);
    expect(r).toHaveLength(2);
    expect(r[0]).toEqual({
      name: "Quito", admin1: "Pichincha", country: "Ecuador",
      latitude: -0.22985, longitude: -78.52495, timeZone: "America/Guayaquil",
    });
    expect(r[1]!.admin1).toBeUndefined();
  });
  it("devuelve [] si no hay resultados o falta tz", () => {
    expect(parseOpenMeteo({})).toEqual([]);
    expect(parseOpenMeteo({ results: [{ name: "X", latitude: 1, longitude: 2 }] })).toEqual([]);
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `cd ~/astro-app && pnpm --filter @aluna/web exec vitest run lib/__tests__/geocode.test.ts`
Expected: FAIL — no resuelve `../geocode`.

- [ ] **Step 3: Implementar `apps/web/lib/geocode.ts`**

```ts
export interface GeocodeResult {
  name: string;
  admin1?: string;
  country?: string;
  latitude: number;
  longitude: number;
  timeZone: string; // IANA
}

interface OpenMeteoRaw {
  results?: Array<{
    name?: unknown; admin1?: unknown; country?: unknown;
    latitude?: unknown; longitude?: unknown; timezone?: unknown;
  }>;
}

/** Convierte la respuesta de Open-Meteo Geocoding en GeocodeResult[]; descarta filas sin tz/coords. */
export function parseOpenMeteo(json: OpenMeteoRaw): GeocodeResult[] {
  const rows = Array.isArray(json.results) ? json.results : [];
  const out: GeocodeResult[] = [];
  for (const r of rows) {
    const name = typeof r.name === "string" ? r.name : null;
    const lat = typeof r.latitude === "number" ? r.latitude : null;
    const lon = typeof r.longitude === "number" ? r.longitude : null;
    const tz = typeof r.timezone === "string" ? r.timezone : null;
    if (name === null || lat === null || lon === null || tz === null) continue;
    out.push({
      name,
      ...(typeof r.admin1 === "string" ? { admin1: r.admin1 } : {}),
      ...(typeof r.country === "string" ? { country: r.country } : {}),
      latitude: lat,
      longitude: lon,
      timeZone: tz,
    });
  }
  return out;
}
```

- [ ] **Step 4: Correr y verificar verde**

Run: `cd ~/astro-app && pnpm --filter @aluna/web exec vitest run lib/__tests__/geocode.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Implementar `apps/web/app/api/geocode/route.ts`**

```ts
import { NextResponse, type NextRequest } from "next/server";
import { parseOpenMeteo } from "@/lib/geocode";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=es&format=json`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return NextResponse.json({ results: [], error: "geocode" }, { status: 502 });
    const json = await res.json();
    return NextResponse.json({ results: parseOpenMeteo(json) });
  } catch {
    return NextResponse.json({ results: [], error: "geocode" }, { status: 502 });
  }
}
```

> Nota middleware: la ruta `/api/geocode` queda **protegida** por el guard (solo usuarios con sesión la consumen desde el onboarding) — el matcher incluye `/api/*` y `/api/geocode` no está en `PUBLIC_PREFIXES`, lo cual es correcto (el onboarding ocurre autenticado).

- [ ] **Step 6: Typecheck + commit**

Run: `cd ~/astro-app && pnpm --filter @aluna/web typecheck`
Expected: exit 0.

```bash
cd ~/astro-app && git add apps/web && git commit -m "feat(web): geocodificación (Open-Meteo) — parser (TDD) + route handler /api/geocode"
```

---

## Task 2: Lógica de onboarding (respuestas → fila) — puro (TDD)

**Files:**
- Create: `apps/web/lib/onboarding.ts`
- Test: `apps/web/lib/__tests__/onboarding.test.ts`

- [ ] **Step 1: Escribir el test (falla primero)**

`apps/web/lib/__tests__/onboarding.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { answersToInsert, isStepComplete, type OnboardingAnswers } from "../onboarding";

const PLACE = { name: "Quito", country: "Ecuador", latitude: -0.23, longitude: -78.52, timeZone: "America/Guayaquil" };

const FULL: OnboardingAnswers = {
  name: "Gio", birthDate: "1984-02-05", birthTime: "09:00", timeKnown: true, place: PLACE, gender: "masculine",
};

describe("isStepComplete", () => {
  it("valida cada paso", () => {
    expect(isStepComplete("name", { name: "" })).toBe(false);
    expect(isStepComplete("name", { name: "Gio" })).toBe(true);
    expect(isStepComplete("date", { birthDate: "1984-02-05" })).toBe(true);
    expect(isStepComplete("date", { birthDate: "" })).toBe(false);
    // hora: completa si timeKnown=false (desconocida) o hay birthTime
    expect(isStepComplete("time", { timeKnown: false })).toBe(true);
    expect(isStepComplete("time", { timeKnown: true, birthTime: "09:00" })).toBe(true);
    expect(isStepComplete("time", { timeKnown: true, birthTime: "" })).toBe(false);
    expect(isStepComplete("place", { place: PLACE })).toBe(true);
    expect(isStepComplete("place", {})).toBe(false);
    expect(isStepComplete("gender", { gender: "neutral" })).toBe(true);
  });
});

describe("answersToInsert", () => {
  it("mapea respuestas completas a la fila de birth_profiles", () => {
    const row = answersToInsert(FULL, "user-1");
    expect(row).toEqual({
      user_id: "user-1", name: "Gio", birth_date: "1984-02-05", birth_time: "09:00",
      time_known: true, place_name: "Quito, Ecuador", latitude: -0.23, longitude: -78.52,
      time_zone: "America/Guayaquil", gender: "masculine",
    });
  });
  it("hora desconocida -> birth_time null + time_known false", () => {
    const row = answersToInsert({ ...FULL, timeKnown: false, birthTime: "" }, "user-1");
    expect(row.birth_time).toBeNull();
    expect(row.time_known).toBe(false);
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `cd ~/astro-app && pnpm --filter @aluna/web exec vitest run lib/__tests__/onboarding.test.ts`
Expected: FAIL — no resuelve `../onboarding`.

- [ ] **Step 3: Implementar `apps/web/lib/onboarding.ts`**

```ts
import type { GeocodeResult } from "./geocode";
import type { TablesInsert } from "@aluna/supabase";

export type Gender = "feminine" | "masculine" | "neutral";
export type OnboardingStep = "name" | "date" | "time" | "place" | "gender";
export const STEPS: OnboardingStep[] = ["name", "date", "time", "place", "gender"];

export interface OnboardingAnswers {
  name: string;
  birthDate: string;      // YYYY-MM-DD
  birthTime: string;      // HH:MM ("" si desconocida)
  timeKnown: boolean;
  place: GeocodeResult | null;
  gender: Gender | null;
}

export const EMPTY_ANSWERS: OnboardingAnswers = {
  name: "", birthDate: "", birthTime: "", timeKnown: true, place: null, gender: null,
};

/** ¿El paso tiene lo necesario para avanzar? */
export function isStepComplete(step: OnboardingStep, a: Partial<OnboardingAnswers>): boolean {
  switch (step) {
    case "name": return !!a.name && a.name.trim().length > 0;
    case "date": return !!a.birthDate && /^\d{4}-\d{2}-\d{2}$/.test(a.birthDate);
    case "time": return a.timeKnown === false || (!!a.birthTime && /^\d{2}:\d{2}$/.test(a.birthTime));
    case "place": return !!a.place;
    case "gender": return a.gender === "feminine" || a.gender === "masculine" || a.gender === "neutral";
  }
}

/** Mapea respuestas completas a una fila insertable de birth_profiles. */
export function answersToInsert(a: OnboardingAnswers, userId: string): TablesInsert<"birth_profiles"> {
  if (!a.place || !a.gender) throw new Error("Respuestas incompletas");
  const placeName = [a.place.name, a.place.country].filter(Boolean).join(", ");
  return {
    user_id: userId,
    name: a.name.trim(),
    birth_date: a.birthDate,
    birth_time: a.timeKnown && a.birthTime ? a.birthTime : null,
    time_known: a.timeKnown,
    place_name: placeName,
    latitude: a.place.latitude,
    longitude: a.place.longitude,
    time_zone: a.place.timeZone,
    gender: a.gender,
  };
}
```

- [ ] **Step 4: Correr y verificar verde**

Run: `cd ~/astro-app && pnpm --filter @aluna/web exec vitest run lib/__tests__/onboarding.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
cd ~/astro-app && git add apps/web && git commit -m "feat(web): lógica de onboarding — answersToInsert + isStepComplete (TDD)"
```

---

## Task 3: Onboarding ceremonial (UI) + createBirthProfile · **USAR SKILLS DE DISEÑO**

**Antes de escribir UI:** invoca `frontend-design` (y/o `impeccable`). Referencia visual: la cabecera nocturna estrellada de `aluna-set-final.html` y el estilo "Crafted · Aluna". El onboarding es **una pregunta por pantalla**, cabecera nocturna arriba + campo claro abajo, dots de progreso. Estética ceremonial.

**Files:**
- Create: `apps/web/app/onboarding/actions.ts`, `apps/web/app/onboarding/page.tsx`, `apps/web/app/onboarding/onboarding-flow.tsx`, `apps/web/app/onboarding/place-autocomplete.tsx`
- Create/Modify: `apps/web/messages/{es,en}.json` (copy de onboarding)

- [ ] **Step 1: Server action `apps/web/app/onboarding/actions.ts`**

```ts
"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { answersToInsert, type OnboardingAnswers } from "@/lib/onboarding";

export async function createBirthProfile(answers: OnboardingAnswers) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const row = answersToInsert(answers, user.id);
  const { error } = await supabase.from("birth_profiles").insert(row);
  if (error) throw new Error(`No se pudo crear el perfil: ${error.message}`);
  redirect("/numeros");
}
```
(Si el cast de `.insert(row)` falla por el bug postgrest-js + `exactOptionalPropertyTypes` ya conocido en este repo, reusar el mismo patrón de shim tipado que `(app)/actions.ts` — NO `as any`.)

- [ ] **Step 2: `place-autocomplete.tsx`** (client; consulta `/api/geocode` con debounce)

```tsx
"use client";
import { useState, useEffect, useRef } from "react";
import type { GeocodeResult } from "@/lib/geocode";

export function PlaceAutocomplete({ value, onPick }: { value: GeocodeResult | null; onPick: (p: GeocodeResult) => void }) {
  const [q, setQ] = useState(value ? value.name : "");
  const [opts, setOpts] = useState<GeocodeResult[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 2) { setOpts([]); return; }
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
        const json = await res.json();
        setOpts(json.results ?? []);
      } catch { setOpts([]); }
    }, 250);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [q]);

  return (
    <div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ciudad de nacimiento" aria-label="Lugar de nacimiento" autoComplete="off" />
      {opts.length > 0 && (
        <ul role="listbox">
          {opts.map((o, i) => (
            <li key={`${o.name}-${i}`} role="option" tabIndex={0}
              onClick={() => { onPick(o); setQ([o.name, o.country].filter(Boolean).join(", ")); setOpts([]); }}>
              {[o.name, o.admin1, o.country].filter(Boolean).join(", ")}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 3: `onboarding-flow.tsx`** (client; máquina de pasos usando `@/lib/onboarding`)

Estructura mínima (el diseño visual lo eleva el skill de diseño): mantiene `useState<OnboardingAnswers>(EMPTY_ANSWERS)`, un índice de paso, usa `isStepComplete(STEPS[i], answers)` para habilitar "Siguiente", renderiza el campo del paso (nombre: input; fecha: date input; hora: time input + checkbox "no la sé"; lugar: `<PlaceAutocomplete>`; género: 3 opciones), dots de progreso, y en el último paso llama `await createBirthProfile(answers)`. Cabecera nocturna estrellada reutilizando los tokens del tema. **Estructura/estado: completa; estética: skill de diseño.**

```tsx
"use client";
import { useState } from "react";
import { STEPS, EMPTY_ANSWERS, isStepComplete, type OnboardingAnswers, type Gender } from "@/lib/onboarding";
import { createBirthProfile } from "./actions";
import { PlaceAutocomplete } from "./place-autocomplete";

export function OnboardingFlow() {
  const [a, setA] = useState<OnboardingAnswers>(EMPTY_ANSWERS);
  const [i, setI] = useState(0);
  const [busy, setBusy] = useState(false);
  const step = STEPS[i]!;
  const canNext = isStepComplete(step, a);

  async function next() {
    if (i < STEPS.length - 1) { setI(i + 1); return; }
    setBusy(true);
    try { await createBirthProfile(a); } finally { setBusy(false); }
  }

  return (
    <main>
      {/* cabecera nocturna + dots de progreso (diseño) */}
      <div data-step={step}>
        {step === "name" && <input value={a.name} onChange={(e) => setA({ ...a, name: e.target.value })} placeholder="Tu nombre" aria-label="Nombre" />}
        {step === "date" && <input type="date" value={a.birthDate} onChange={(e) => setA({ ...a, birthDate: e.target.value })} aria-label="Fecha de nacimiento" />}
        {step === "time" && (
          <div>
            <input type="time" value={a.birthTime} disabled={!a.timeKnown} onChange={(e) => setA({ ...a, birthTime: e.target.value })} aria-label="Hora de nacimiento" />
            <label><input type="checkbox" checked={!a.timeKnown} onChange={(e) => setA({ ...a, timeKnown: !e.target.checked })} /> No sé mi hora</label>
          </div>
        )}
        {step === "place" && <PlaceAutocomplete value={a.place} onPick={(p) => setA({ ...a, place: p })} />}
        {step === "gender" && (
          <div role="radiogroup" aria-label="Género">
            {(["feminine", "masculine", "neutral"] as Gender[]).map((g) => (
              <button key={g} role="radio" aria-checked={a.gender === g} onClick={() => setA({ ...a, gender: g })}>{g}</button>
            ))}
          </div>
        )}
      </div>
      <div>
        {i > 0 && <button onClick={() => setI(i - 1)} disabled={busy}>Atrás</button>}
        <button onClick={next} disabled={!canNext || busy}>{i === STEPS.length - 1 ? "Crear mi perfil" : "Siguiente"}</button>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: `page.tsx`** (server; si ya hay perfil, salta a /numeros)

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingFlow } from "./onboarding-flow";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { count } = await supabase.from("birth_profiles").select("id", { count: "exact", head: true }).eq("user_id", user.id);
  if ((count ?? 0) > 0) redirect("/numeros");
  return <OnboardingFlow />;
}
```

- [ ] **Step 5: Copy de onboarding en `messages/{es,en}.json`** — añadir una sección `"onboarding"` con las etiquetas de cada paso/botón (claves idénticas en ES y EN; el skill de diseño define los textos finales con la voz de Aluna).

- [ ] **Step 6: Verificar (la UI con el skill de diseño) + build + commit**

Run: `cd ~/astro-app && pnpm --filter @aluna/web typecheck && pnpm --filter @aluna/web exec next build`
Expected: typecheck 0; build OK.

```bash
cd ~/astro-app && git add apps/web && git commit -m "feat(web): onboarding ceremonial (pasos + geocoding autocomplete) + createBirthProfile"
```

---

## Task 4: Perfil activo (contexto) + menú Perfil

**Files:**
- Create: `apps/web/lib/profiles/profiles-provider.tsx`, `apps/web/components/profile-menu.tsx`, `apps/web/components/bottom-sheet.tsx`
- Modify: `apps/web/app/(app)/layout.tsx` (cargar perfiles + envolver en ProfilesProvider + montar ProfileMenu)
- Test: `apps/web/lib/profiles/__tests__/profiles-provider.test.tsx`

- [ ] **Step 1: `bottom-sheet.tsx`** (hoja inferior reusable — base para tap-to-expand y el menú de Perfil)

```tsx
"use client";
export function BottomSheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" onClick={onClose}
      style={{ position: "fixed", inset: 0, display: "flex", alignItems: "flex-end", zIndex: 50, background: "rgba(0,0,0,.4)" }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 480, margin: "0 auto", background: "var(--bg)", borderTopLeftRadius: 22, borderTopRightRadius: 22, borderTop: "1px solid var(--line)", padding: 18, maxHeight: "85dvh", overflowY: "auto" }}>
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write the failing test for the provider**

`apps/web/lib/profiles/__tests__/profiles-provider.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ProfilesProvider, useProfiles, type BirthProfile } from "../profiles-provider";

const PROFILES: BirthProfile[] = [
  { id: "p1", name: "Gio", birth_date: "1984-02-05", birth_time: "09:00", time_known: true, place_name: "Quito", latitude: -0.23, longitude: -78.52, time_zone: "America/Guayaquil", gender: "masculine" },
  { id: "p2", name: "Ana", birth_date: "1990-07-12", birth_time: null, time_known: false, place_name: "Bogotá", latitude: 4.6, longitude: -74.1, time_zone: "America/Bogota", gender: "feminine" },
];

function Probe() {
  const { active, setActive } = useProfiles();
  return <div><span data-testid="a">{active?.name}</span><button onClick={() => setActive("p2")}>x</button></div>;
}

describe("ProfilesProvider", () => {
  it("activo por defecto = primer perfil; setActive cambia", async () => {
    render(<ProfilesProvider profiles={PROFILES}><Probe /></ProfilesProvider>);
    expect(screen.getByTestId("a").textContent).toBe("Gio");
    await act(async () => { screen.getByText("x").click(); });
    expect(screen.getByTestId("a").textContent).toBe("Ana");
  });
});
```

- [ ] **Step 3: Run/verify fail**

Run: `cd ~/astro-app && pnpm --filter @aluna/web exec vitest run lib/profiles/__tests__/profiles-provider.test.tsx`
Expected: FAIL — no resuelve `../profiles-provider`.

- [ ] **Step 4: Implementar `apps/web/lib/profiles/profiles-provider.tsx`**

```tsx
"use client";
import { createContext, useContext, useState } from "react";

export interface BirthProfile {
  id: string; name: string; birth_date: string; birth_time: string | null;
  time_known: boolean; place_name: string; latitude: number; longitude: number;
  time_zone: string; gender: string;
}

type Ctx = { profiles: BirthProfile[]; active: BirthProfile | null; setActive: (id: string) => void };
const ProfilesCtx = createContext<Ctx | null>(null);

export function useProfiles(): Ctx {
  const ctx = useContext(ProfilesCtx);
  if (!ctx) throw new Error("useProfiles debe usarse dentro de <ProfilesProvider>");
  return ctx;
}

export function ProfilesProvider({ profiles, children }: { profiles: BirthProfile[]; children: React.ReactNode }) {
  const [activeId, setActiveId] = useState<string | null>(profiles[0]?.id ?? null);
  const active = profiles.find((p) => p.id === activeId) ?? profiles[0] ?? null;
  return <ProfilesCtx.Provider value={{ profiles, active, setActive: setActiveId }}>{children}</ProfilesCtx.Provider>;
}
```

- [ ] **Step 5: Run/verify pass**

Run: `cd ~/astro-app && pnpm --filter @aluna/web exec vitest run lib/profiles/__tests__/profiles-provider.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 6: `profile-menu.tsx`** (avatar arriba que abre el BottomSheet: lista de perfiles + "nuevo" + Ajustes) — estructura completa; estética con el skill de diseño en Task 5 o aparte.

```tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import { useProfiles } from "@/lib/profiles/profiles-provider";
import { BottomSheet } from "./bottom-sheet";

export function ProfileMenu() {
  const { profiles, active, setActive } = useProfiles();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} aria-label="Perfil"
        style={{ width: 34, height: 34, borderRadius: "50%", border: "1px solid var(--line)", color: "var(--acc)" }}>
        {active?.name?.[0]?.toUpperCase() ?? "·"}
      </button>
      <BottomSheet open={open} onClose={() => setOpen(false)}>
        <h3 className="display">Perfiles</h3>
        {profiles.map((p) => (
          <button key={p.id} onClick={() => { setActive(p.id); setOpen(false); }} aria-pressed={active?.id === p.id}
            style={{ display: "block", width: "100%", textAlign: "left", padding: 10 }}>{p.name}</button>
        ))}
        <Link href="/onboarding" onClick={() => setOpen(false)}>+ Nuevo perfil</Link>
        <Link href="/ajustes" onClick={() => setOpen(false)}>Ajustes</Link>
      </BottomSheet>
    </>
  );
}
```

- [ ] **Step 7: Modificar `(app)/layout.tsx`** — cargar perfiles del usuario y envolver

Tras obtener `user` y antes de `ThemeProvider`, cargar perfiles; envolver el árbol en `<ProfilesProvider profiles={...}>` y montar `<ProfileMenu/>` arriba (en un header dentro del shell). Si el usuario **no tiene perfiles**, redirigir a `/onboarding` (excepto si ya está en onboarding — pero onboarding está fuera de `(app)`, así que el layout `(app)` siempre puede exigir ≥1 perfil):
```tsx
  const { data: rows } = await supabase
    .from("birth_profiles")
    .select("id, name, birth_date, birth_time, time_known, place_name, latitude, longitude, time_zone, gender")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
  const profiles = rows ?? [];
  if (profiles.length === 0) redirect("/onboarding");
```
Envolver: `<ThemeProvider ...><ProfilesProvider profiles={profiles}><header>…<ProfileMenu/></header>{children}<BottomNav/></ProfilesProvider></ThemeProvider>`.

- [ ] **Step 8: typecheck + build + commit**

Run: `cd ~/astro-app && pnpm --filter @aluna/web exec vitest run && pnpm --filter @aluna/web typecheck && pnpm --filter @aluna/web exec next build`
Expected: tests verdes; typecheck 0; build OK.

```bash
cd ~/astro-app && git add apps/web && git commit -m "feat(web): perfil activo (ProfilesProvider, TDD) + menú Perfil + guard de ≥1 perfil"
```

---

## Task 5: Sección Numerología (Modo Pro) · **USAR SKILLS DE DISEÑO**

**Antes de escribir UI:** invoca `frontend-design` / `impeccable`. **Vara visual exacta: la columna "Crafted · Aluna" de `.superpowers/brainstorm/.../numerologia-craft-comparativa.html`** (noche + oro, Cormorant para los números, "Tu cálculo", chips kármicos, tabla de inclusión). Este es el **hero** del corte; la calidad importa.

**Files:**
- Create: `apps/web/lib/numerology.ts`, `apps/web/app/(app)/numeros/page.tsx`, `apps/web/app/(app)/numeros/numerology-view.tsx`, `apps/web/app/(app)/numeros/numerology-view.module.css`
- Test: `apps/web/lib/__tests__/numerology.test.ts`

- [ ] **Step 1: Escribir el test de los helpers (falla primero)**

`apps/web/lib/__tests__/numerology.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { profileToNumerologyInput, formatReduction } from "../numerology";

describe("profileToNumerologyInput", () => {
  it("convierte un perfil a NumerologyInput (nombre + fecha desestructurada)", () => {
    const input = profileToNumerologyInput({ name: "Gio", birth_date: "1984-02-05" });
    expect(input.fullName).toBe("Gio");
    expect(input.birthDate).toEqual({ year: 1984, month: 2, day: 5 });
  });
});

describe("formatReduction", () => {
  it("formatea la traza de reducción como '29 → 11'", () => {
    expect(formatReduction({ steps: [29, 11], value: 11, isMaster: true })).toBe("29 → 11");
    expect(formatReduction({ steps: [5], value: 5, isMaster: false })).toBe("5");
  });
});
```

- [ ] **Step 2: Correr/verificar fallo**

Run: `cd ~/astro-app && pnpm --filter @aluna/web exec vitest run lib/__tests__/numerology.test.ts`
Expected: FAIL — no resuelve `../numerology`.

- [ ] **Step 3: Implementar `apps/web/lib/numerology.ts`**

```ts
import type { NumerologyInput, ReductionTrace } from "@aluna/core";

/** Perfil (campos mínimos) → entrada de numerología. La numerología usa nombre + fecha civil. */
export function profileToNumerologyInput(p: { name: string; birth_date: string }): NumerologyInput {
  const [y, m, d] = p.birth_date.split("-").map(Number);
  return { fullName: p.name, birthDate: { year: y!, month: m!, day: d! } };
}

/** Muestra la reducción "paso → paso → valor" (feature "Tu cálculo"). */
export function formatReduction(t: Pick<ReductionTrace, "steps" | "value">): string {
  return t.steps.join(" → ");
}
```

- [ ] **Step 4: Correr/verificar verde**

Run: `cd ~/astro-app && pnpm --filter @aluna/web exec vitest run lib/__tests__/numerology.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: `numeros/page.tsx`** (server shell)

```tsx
import { NumerologyView } from "./numerology-view";
export default function NumerosPage() { return <NumerologyView />; }
```

- [ ] **Step 6: `numerology-view.tsx`** (client; computa del perfil activo y pinta Resumen + Modo Pro) — **estructura de datos completa; estética con el skill de diseño usando el mockup**

Estructura: `const { active } = useProfiles();` → `computeNumerology(profileToNumerologyInput(active))` (memoizado por `active.id`) → render:
- **Hero**: Camino de Vida (número grande en Cormorant) + pill "maestro" si `core.lifePath.isMaster` + "Tu cálculo": `formatReduction(core.lifePath)`.
- **Núcleo**: tarjetas tocables (Expresión/Alma/Personalidad/Día/Madurez) con valor + glosa breve.
- **Interruptor Modo Pro** (recordado en `settings.detail_level` o estado local): despliega kármicos (`karmic.lessons` chips, `karmic.inclusion` grid 1-9 con conteos, `karmic.hiddenPassion`), pináculos/desafíos con edades, ciclos personales (año/mes/día).
- **Tap-to-expand**: tocar un número abre `<BottomSheet>` con *Tu cálculo → arquetipo (glosa breve) → [prosa: Plan 6]*.
El **diseño visual** (noche+oro, glass, starfield, Cormorant) lo produce el skill de diseño replicando `numerologia-craft-comparativa.html`, usando los tokens del tema (`--bg`, `--acc`, `--ink`, etc.) en `numerology-view.module.css`.

- [ ] **Step 7: Activar la pestaña "Números"** — en `apps/web/components/bottom-nav.tsx` cambiar el item `numeros` de `soon: true` a `soon: false` (queda como `<Link href="/numeros">`). Y en `(app)/hoy/page.tsx`, la tarjeta "Numerología" enlaza a `/numeros`.

- [ ] **Step 8: Copy de numerología en `messages/{es,en}.json}`** (nombres de números + glosas breves, claves idénticas ES/EN).

- [ ] **Step 9: Verificación + commit**

Run: `cd ~/astro-app && pnpm --filter @aluna/web exec vitest run && pnpm --filter @aluna/web typecheck && pnpm --filter @aluna/web exec next build`
Expected: tests verdes; typecheck 0; build OK.

```bash
cd ~/astro-app && git add apps/web && git commit -m "feat(web): sección Numerología Modo Pro (cálculo client-side + Resumen/Pro + tap-to-expand)"
```

---

## Task 6: Integración final + verificación del corte

**Files:**
- Modify: cualquier ajuste de wiring detectado.

- [ ] **Step 1: Flujo completo manual (con la app corriendo)** — documentar para Gio: registro → onboarding (5 pasos, autocompletado de lugar) → /numeros muestra su numerología; cambiar de persona en el menú Perfil recalcula en vivo; el interruptor Modo Pro despliega kármicos/ciclos; tema/idioma siguen funcionando.

- [ ] **Step 2: Verificación completa del monorepo**

Run: `cd ~/astro-app && pnpm test && pnpm typecheck && pnpm lint`
Expected: los 5 paquetes verdes (web con los tests nuevos: geocode 2 + onboarding 3 + profiles 1 + numerology 2 = +8); typecheck/lint 5/5.

- [ ] **Step 3: Commit (si hubo ajustes) + cierre**

```bash
cd ~/astro-app && git add apps/web && git commit -m "chore(web): cierre Corte 1 — onboarding + numerología integrados"
```

---

## Self-Review (cobertura vs. spec, mitad "onboarding + numerología")

1. **Onboarding ceremonial (nombre→fecha→hora[+desconocida]→lugar→género)** → Tasks 2, 3. ✅
2. **Geocodificación (lugar → lat/long + tz IANA)** → Task 1 (Open-Meteo, un fetch). ✅
3. **Crear `birth_profiles`** → Task 2 (mapper) + Task 3 (action). ✅
4. **Perfiles múltiples + cambiar de persona en vivo** → Task 4 (ProfilesProvider + menú Perfil). ✅
5. **Numerología Modo Pro client-side** (núcleo + "Tu cálculo" + kármicos + inclusión + pináculos/desafíos + ciclos) → Task 5 (`computeNumerology` de `@aluna/core`). ✅
6. **Tap-to-expand (bottom sheets)** → Tasks 4 (componente) + 5 (uso). ✅
7. **Activar pestaña Números + hub** → Task 5 Step 7. ✅
8. **Regla App Store / sin nativo en cliente** → numerología es `@aluna/core` (isomórfico); no se importa `@aluna/ephemeris`/`@aluna/compute`. ✅
9. **Calidad visual "Crafted · Aluna"** → Tasks 3 y 5 invocan skills de diseño con los mockups aprobados como vara. ✅

**Fuera (corte siguiente):** la **rueda de carta** + la ruta de cómputo (`getOrComputeChart` por route handler) + prosa interpretativa (Plan 6). La pestaña "Carta" sigue `soon`.

**Consistencia de tipos/nombres:** `GeocodeResult{name,admin1?,country?,latitude,longitude,timeZone}`, `parseOpenMeteo`, `OnboardingAnswers`/`OnboardingStep`/`STEPS`/`isStepComplete`/`answersToInsert`, `createBirthProfile`, `BirthProfile`/`ProfilesProvider`/`useProfiles`, `profileToNumerologyInput`/`formatReduction`, `BottomSheet`/`ProfileMenu` — usados idénticos entre tasks. Sin placeholders en la lógica; las tareas de UI declaran estructura completa + delegan la estética a los skills de diseño con referencia concreta (es lo correcto para trabajo de diseño, no un placeholder).

**Nota de ejecución:** el bug postgrest-js + `exactOptionalPropertyTypes` (insert/update inferido como `never`) ya tiene patrón de shim tipado en `(app)/actions.ts` — reusarlo en `createBirthProfile` si hace falta, nunca `as any`.
