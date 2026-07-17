# Cuestionario ceremonial de primera entrada — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** cuestionario de intención (metas → afirmación → foco → estado sentimental) ANTES de los 5 pasos de nacimiento en el onboarding de móvil y web, con persistencia en `settings.intent` (JSONB), orden del panel de energía del Hoy por foco, e inyección OPCIONAL de la intención en los prompts de IA (chat + informes) detrás de un toggle.

**Architecture:** enfoque A del spec — se EXTIENDE el flujo ceremonial existente (`apps/mobile/app/onboarding.tsx`, `apps/web/app/onboarding/onboarding-flow.tsx`) con tipos de paso nuevos; el modelo de intención y sus helpers puros viven en `@aluna/core` (RN-safe, compartidos); la persistencia reutiliza la tabla `settings` (columna JSONB nueva) con las políticas RLS existentes ("own settings update", `0002_rls_policies.sql:18`).

**Tech Stack:** monorepo pnpm+Turborepo, TS strict, Vitest; web Next.js 15 App Router + CSS Modules + next-intl; móvil Expo (react-native-svg 15.12.1 ya instalado); Supabase (RLS).

**Spec:** `docs/superpowers/specs/2026-07-16-cuestionario-primera-entrada-design.md` — léelo antes de empezar tu tarea.

## Global Constraints

- Worktree: `~/astro-app/.claude/worktrees/nebula-merge` (rama `worktree-nebula-merge`). NO tocar `main` ni otras ramas.
- Claves internas de datos SIEMPRE en inglés (`"self"`, `"love"`…); i18n solo en superficie. i18n ES **y** EN en cada string nuevo (paridad vigilada por tests existentes de web).
- Tipografía móvil: SOLO tamaños 13/15/19/24 (regla de Gio). Glifos unicode de texto con `︎` cuando se rendericen en web (patrón `TEXT_VS`).
- Móvil: NUNCA importar `@aluna/ephemeris` ni `@aluna/compute`. Solo `@aluna/core` y `@aluna/supabase`.
- Sin dependencias nuevas en ningún paquete.
- Gate por tarea antes de commitear: desde la raíz del worktree `npx pnpm --filter <paquete> exec tsc --noEmit && npx pnpm --filter <paquete> exec vitest run`; las tareas web añaden `next build` y las móviles `expo export` SOLO donde el paso lo indique (son lentos).
- Commits en español, prefijo `feat(cuestionario):` (o `test(cuestionario):` / `docs(cuestionario):`).
- Los pasos de intención son SALTABLES ("Omitir"); los de nacimiento siguen obligatorios. El prompt de IA debe quedar **byte-igual al actual** cuando no hay intención o `useInAI` está apagado.

---

### Task 1: Core — modelo de intención + orden por foco

**Files:**
- Create: `packages/core/src/intent.ts`
- Create: `packages/core/src/__tests__/intent.test.ts` (espeja la colocación de tests existente en core: revisa dónde viven los tests de `life-areas` y usa ESA carpeta si difiere)
- Modify: `packages/core/src/index.ts` (añadir exports al final)

**Interfaces:**
- Consumes: `LifeArea`, `LIFE_AREAS` de `./astrology/life-areas`.
- Produces (los usan Tasks 4, 6, 8–13):
  - `type IntentGoal = "self" | "bonds" | "purpose" | "future" | "spirituality" | "others" | "decisions"`
  - `const INTENT_GOALS: readonly IntentGoal[]`
  - `type RelationshipStatus = "single" | "partnered" | "married" | "complicated" | "private"`
  - `const RELATIONSHIP_STATUSES: readonly RelationshipStatus[]`
  - `interface UserIntent { goals: IntentGoal[]; goalNote?: string; focus: LifeArea[]; relationship?: RelationshipStatus; useInAI: boolean; answeredAt: string }`
  - `parseIntent(raw: unknown): UserIntent | null` — lector tolerante del JSONB (descarta claves desconocidas y valores inválidos; null si no hay nada útil)
  - `orderAreasByFocus<T extends { area: LifeArea }>(items: readonly T[], focus: readonly LifeArea[]): T[]` — estable: primero las áreas en `focus` (en el orden de `focus`), luego el resto en su orden original

- [ ] **Step 1: test que falla**

```ts
// packages/core/src/__tests__/intent.test.ts
import { describe, it, expect } from "vitest";
import { parseIntent, orderAreasByFocus, INTENT_GOALS } from "../intent";

describe("parseIntent", () => {
  it("acepta un intent válido y descarta basura", () => {
    const raw = {
      goals: ["self", "nope", "bonds"], goalNote: "  algo  ",
      focus: ["love", "invalid"], relationship: "single",
      useInAI: true, answeredAt: "2026-07-16T00:00:00Z", extra: 1,
    };
    expect(parseIntent(raw)).toEqual({
      goals: ["self", "bonds"], goalNote: "algo", focus: ["love"],
      relationship: "single", useInAI: true, answeredAt: "2026-07-16T00:00:00Z",
    });
  });
  it("null si no hay señal (todo omitido o basura)", () => {
    expect(parseIntent(null)).toBeNull();
    expect(parseIntent({ goals: [], focus: [] })).toBeNull();
    expect(parseIntent("x")).toBeNull();
  });
  it("useInAI default true si falta, answeredAt default ''", () => {
    const p = parseIntent({ goals: ["self"], focus: [] });
    expect(p?.useInAI).toBe(true);
  });
});

describe("orderAreasByFocus", () => {
  const items = (["love", "money", "work", "health", "mood", "luck"] as const)
    .map((area) => ({ area, score: 50 }));
  it("pone el foco primero, estable, sin duplicar", () => {
    const out = orderAreasByFocus(items, ["work", "love"]);
    expect(out.map((i) => i.area)).toEqual(["work", "love", "money", "health", "mood", "luck"]);
  });
  it("foco vacío = orden original intacto", () => {
    expect(orderAreasByFocus(items, [])).toEqual(items);
  });
  it("ignora áreas de foco que no están en items", () => {
    const out = orderAreasByFocus(items.slice(0, 2), ["luck", "money"]);
    expect(out.map((i) => i.area)).toEqual(["money", "love"]);
  });
});

describe("INTENT_GOALS", () => {
  it("las 7 metas del spec", () => {
    expect(INTENT_GOALS).toEqual(["self", "bonds", "purpose", "future", "spirituality", "others", "decisions"]);
  });
});
```

- [ ] **Step 2: correr y ver fallar** — `npx pnpm --filter @aluna/core exec vitest run src/__tests__/intent.test.ts` → FAIL (módulo no existe).

- [ ] **Step 3: implementación mínima**

```ts
// packages/core/src/intent.ts
// Intención del usuario (cuestionario de primera entrada). Claves internas en inglés;
// vive en core por ser puro y compartido web+móvil. Spec: 2026-07-16-cuestionario-primera-entrada-design.md
import { LIFE_AREAS, type LifeArea } from "./astrology/life-areas";

export type IntentGoal = "self" | "bonds" | "purpose" | "future" | "spirituality" | "others" | "decisions";
export const INTENT_GOALS: readonly IntentGoal[] = ["self", "bonds", "purpose", "future", "spirituality", "others", "decisions"];

export type RelationshipStatus = "single" | "partnered" | "married" | "complicated" | "private";
export const RELATIONSHIP_STATUSES: readonly RelationshipStatus[] = ["single", "partnered", "married", "complicated", "private"];

export interface UserIntent {
  goals: IntentGoal[];
  goalNote?: string;
  focus: LifeArea[];
  relationship?: RelationshipStatus;
  useInAI: boolean;
  answeredAt: string;
}

function stringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

export function parseIntent(raw: unknown): UserIntent | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const goals = stringArray(r.goals).filter((g): g is IntentGoal => (INTENT_GOALS as readonly string[]).includes(g));
  const focus = stringArray(r.focus).filter((f): f is LifeArea => (LIFE_AREAS as readonly string[]).includes(f));
  const relationship = (RELATIONSHIP_STATUSES as readonly string[]).includes(r.relationship as string)
    ? (r.relationship as RelationshipStatus) : undefined;
  const goalNote = typeof r.goalNote === "string" && r.goalNote.trim() ? r.goalNote.trim() : undefined;
  if (goals.length === 0 && focus.length === 0 && !relationship && !goalNote) return null;
  return {
    goals, focus, relationship, goalNote,
    useInAI: typeof r.useInAI === "boolean" ? r.useInAI : true,
    answeredAt: typeof r.answeredAt === "string" ? r.answeredAt : "",
  };
}

export function orderAreasByFocus<T extends { area: LifeArea }>(
  items: readonly T[], focus: readonly LifeArea[],
): T[] {
  const first = focus.map((f) => items.find((i) => i.area === f)).filter((i): i is T => !!i);
  const rest = items.filter((i) => !focus.includes(i.area));
  return [...first, ...rest];
}
```

Y en `packages/core/src/index.ts`, al final:

```ts
// Intención del usuario (cuestionario de primera entrada)
export { parseIntent, orderAreasByFocus, INTENT_GOALS, RELATIONSHIP_STATUSES } from "./intent";
export type { UserIntent, IntentGoal, RelationshipStatus } from "./intent";
```

- [ ] **Step 4: verde** — `npx pnpm --filter @aluna/core exec vitest run` (TODA la suite core) + `npx pnpm --filter @aluna/core exec tsc --noEmit` → PASS.
- [ ] **Step 5: commit** — `git add packages/core && git commit -m "feat(cuestionario): modelo de intención + orden por foco en @aluna/core"`

---

### Task 2: Core — signo solar por fecha (para el gauge)

**Files:**
- Create: `packages/core/src/astrology/sun-sign.ts`
- Create: test junto a los de Task 1 (`packages/core/src/__tests__/sun-sign.test.ts`)
- Modify: `packages/core/src/index.ts`

**Interfaces:**
- Consumes: `ZODIAC_SIGNS` de `../constants/astrology` (12 `SignDef {key, glyph, …}` en orden aries→pisces).
- Produces (Tasks 7 y 11): `sunSignFromDate(isoDate: string): { key: string; glyph: string; index: number; cusp: boolean } | null`. Tropical por tabla de fechas fijas; `cusp: true` a ±1 día de un límite (aproximación honesta — la carta real la calculan las efemérides después). `null` si la fecha no parsea.

- [ ] **Step 1: test que falla**

```ts
// packages/core/src/__tests__/sun-sign.test.ts
import { describe, it, expect } from "vitest";
import { sunSignFromDate } from "../astrology/sun-sign";

describe("sunSignFromDate", () => {
  it("signos de mitad de rango", () => {
    expect(sunSignFromDate("1990-02-05")?.key).toBe("aquarius");
    expect(sunSignFromDate("1990-08-08")?.key).toBe("leo");
    expect(sunSignFromDate("1990-12-30")?.key).toBe("capricorn"); // cruza el año
    expect(sunSignFromDate("1990-01-05")?.key).toBe("capricorn");
  });
  it("límites exactos e índice/glifo", () => {
    const a = sunSignFromDate("1990-03-21"); // arranque de aries
    expect(a).toMatchObject({ key: "aries", index: 0, glyph: "♈" });
    expect(sunSignFromDate("1990-03-20")?.key).toBe("pisces");
  });
  it("marca cúspide a ±1 día del límite", () => {
    expect(sunSignFromDate("1990-03-20")?.cusp).toBe(true);
    expect(sunSignFromDate("1990-03-21")?.cusp).toBe(true);
    expect(sunSignFromDate("1990-04-05")?.cusp).toBe(false);
  });
  it("null en fecha inválida", () => {
    expect(sunSignFromDate("")).toBeNull();
    expect(sunSignFromDate("1990-13-40")).toBeNull();
  });
});
```

- [ ] **Step 2: correr y ver fallar** — mismo comando que Task 1, archivo nuevo → FAIL.
- [ ] **Step 3: implementación**

```ts
// packages/core/src/astrology/sun-sign.ts
// Signo solar APROXIMADO por tabla tropical de fechas (para feedback vivo en onboarding).
// En cúspide (±1 día) se marca cusp:true — la carta real (efemérides) decide después.
import { ZODIAC_SIGNS } from "../constants/astrology";

// [mes, día] en que ARRANCA cada signo, orden aries→pisces.
const STARTS: readonly [number, number][] = [
  [3, 21], [4, 20], [5, 21], [6, 21], [7, 23], [8, 23],
  [9, 23], [10, 23], [11, 22], [12, 22], [1, 20], [2, 19],
];

export function sunSignFromDate(
  isoDate: string,
): { key: string; glyph: string; index: number; cusp: boolean } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!m) return null;
  const month = Number(m[2]), day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const md = month * 100 + day;
  // buscamos el último arranque <= fecha; si la fecha es antes del 20/1, cae en capricornio (arranque 22/12 del año anterior)
  let index = STARTS.findIndex(([sm, sd], i) => {
    const start = sm * 100 + sd;
    const next = STARTS[(i + 1) % 12]!;
    const end = next[0] * 100 + next[1];
    return start <= end ? md >= start && md < end : md >= start || md < end;
  });
  if (index === -1) index = 9; // inalcanzable con la tabla, guardia
  const sign = ZODIAC_SIGNS[index]!;
  const near = (sm: number, sd: number) => {
    const d = new Date(Date.UTC(2001, month - 1, day)); // año no bisiesto de referencia
    const s = new Date(Date.UTC(2001, sm - 1, sd));
    const diff = Math.abs(d.getTime() - s.getTime()) / 86400000;
    return Math.min(diff, 365 - diff) <= 1;
  };
  const cusp = STARTS.some(([sm, sd]) => near(sm, sd));
  return { key: sign.key, glyph: sign.glyph, index, cusp };
}
```

Y en `packages/core/src/index.ts`: `export { sunSignFromDate } from "./astrology/sun-sign";`

- [ ] **Step 4: verde** — suite core completa + tsc → PASS.
- [ ] **Step 5: commit** — `git add packages/core && git commit -m "feat(cuestionario): sunSignFromDate — signo solar aproximado por fecha con marca de cúspide"`

---

### Task 3: Migración `intent` + tipos Supabase

**Files:**
- Create: `supabase/migrations/0011_intent.sql`
- Modify: `packages/supabase/src/database.types.ts` (tabla `settings`: Row/Insert/Update)

**Interfaces:**
- Produces: columna `public.settings.intent jsonb null`; tipo TS `intent: Json | null` en settings. Las políticas RLS existentes ya cubren (select/update propios, `0002_rls_policies.sql:16-18`); NO se necesita política nueva.

- [ ] **Step 1: SQL**

```sql
-- 0011_intent.sql
-- Intención del usuario (cuestionario de primera entrada): metas, foco, estado sentimental,
-- toggle de uso en IA. JSONB validado en aplicación (parseIntent de @aluna/core).
alter table public.settings add column if not exists intent jsonb;
```

- [ ] **Step 2: tipos a mano** — en `database.types.ts`, dentro de `settings`, añadir `intent: Json | null` a `Row`, y `intent?: Json | null` a `Insert` y `Update` (mismo patrón con que se añadió `reading_cache` a mano; respeta el orden alfabético si el archivo lo usa).
- [ ] **Step 3: gate** — `npx pnpm --filter @aluna/supabase exec tsc --noEmit` y `npx pnpm --filter @aluna/web exec tsc --noEmit` → PASS.
- [ ] **Step 4: commit** — `git add supabase packages/supabase && git commit -m "feat(cuestionario): migración 0011 — columna settings.intent (jsonb) + tipos"`

> **NOTA CONTROLADOR (no subagente):** aplicar `0011_intent.sql` EN VIVO al proyecto Supabase `aluna` (`xcilrdpcanielalpfvld`) vía MCP antes de la verificación de Fase 5. Sin esto, los saves de intent fallarán en runtime (columna inexistente) aunque todo compile.

---

### Task 4: Móvil — persistencia de intención (`lib/intent.ts`)

**Files:**
- Create: `apps/mobile/lib/intent.ts`
- Create: `apps/mobile/lib/__tests__/intent.test.ts` (el vitest móvil solo incluye `lib/**/__tests__/**/*.test.ts`, environment node — lógica pura + fakes, sin RN)

**Interfaces:**
- Consumes: `UserIntent`, `parseIntent`, tipos de `@aluna/core`; `AlunaSupabaseClient` de `@aluna/supabase`; `AsyncStorage` (mismo import que usa `lib/profile.ts`).
- Produces (Tasks 6 y 13-móvil):
  - `interface IntentDraft { goals: IntentGoal[]; goalNote: string; focus: LifeArea[]; relationship: RelationshipStatus | null }`
  - `const EMPTY_INTENT_DRAFT: IntentDraft`
  - `draftToIntent(d: IntentDraft, now: string): UserIntent | null` — null si TODO quedó omitido (no persistir nada); `useInAI: true` por defecto
  - `saveRemoteIntent(supabase, userId, intent): Promise<void>` — `update settings set intent`, lanza en error
  - `fetchRemoteIntent(supabase, userId): Promise<UserIntent | null>` — select + `parseIntent`
  - `INTENT_STORAGE_KEY` + `storeLocalIntent(intent)` / `loadLocalIntent()` (espejo AsyncStorage, mismo patrón que el Profile local)

- [ ] **Step 1: test que falla** (solo lo puro + cliente fake)

```ts
// apps/mobile/lib/__tests__/intent.test.ts
import { describe, it, expect } from "vitest";
import { draftToIntent, EMPTY_INTENT_DRAFT, saveRemoteIntent, fetchRemoteIntent } from "../intent";

const NOW = "2026-07-16T12:00:00Z";

describe("draftToIntent", () => {
  it("null cuando todo quedó omitido", () => {
    expect(draftToIntent(EMPTY_INTENT_DRAFT, NOW)).toBeNull();
  });
  it("arma el UserIntent con useInAI true y answeredAt", () => {
    expect(draftToIntent({ goals: ["self"], goalNote: " x ", focus: ["love"], relationship: "single" }, NOW))
      .toEqual({ goals: ["self"], goalNote: "x", focus: ["love"], relationship: "single", useInAI: true, answeredAt: NOW });
  });
  it("goalNote vacía no viaja", () => {
    const i = draftToIntent({ goals: ["self"], goalNote: "  ", focus: [], relationship: null }, NOW);
    expect(i && "goalNote" in i && i.goalNote).toBeUndefined();
  });
});

function fakeSupabase(row: unknown, capture: { patch?: unknown } = {}) {
  return {
    from: () => ({
      update: (patch: unknown) => { capture.patch = patch; return { eq: async () => ({ error: null }) }; },
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: row, error: null }) }) }),
    }),
  } as never;
}

describe("saveRemoteIntent / fetchRemoteIntent", () => {
  it("guarda el intent como patch de settings", async () => {
    const cap: { patch?: unknown } = {};
    const intent = draftToIntent({ goals: ["self"], goalNote: "", focus: [], relationship: null }, NOW)!;
    await saveRemoteIntent(fakeSupabase(null, cap), "u1", intent);
    expect(cap.patch).toEqual({ intent });
  });
  it("lee y parsea tolerante", async () => {
    const out = await fetchRemoteIntent(fakeSupabase({ intent: { goals: ["self"], focus: [] } }), "u1");
    expect(out?.goals).toEqual(["self"]);
    expect(await fetchRemoteIntent(fakeSupabase({ intent: null }), "u1")).toBeNull();
  });
});
```

- [ ] **Step 2: correr y ver fallar** — `npx pnpm --filter @aluna/mobile exec vitest run lib/__tests__/intent.test.ts` → FAIL.
- [ ] **Step 3: implementación** — sigue el patrón de `lib/profile.ts`/`profile-sync.ts` (mira cómo tipan el builder de supabase para el update; si el tipo genérico da `never`, usa el mismo cast local que usa `profile-sync.ts`). AsyncStorage: mismas importaciones y manejo try/catch silencioso que el Profile local. `INTENT_STORAGE_KEY = "aluna.intent.v1"`.
- [ ] **Step 4: verde** — suite móvil completa + tsc → PASS.
- [ ] **Step 5: commit** — `git add apps/mobile/lib && git commit -m "feat(cuestionario): lib de intención móvil — draft, persistencia settings.intent y espejo local"`

---

### Task 5: Móvil — strings ES/EN del cuestionario

**Files:**
- Modify: `apps/mobile/lib/strings.ts` (sección `onboarding` de `es` Y `en`)

**Interfaces:**
- Produces (Tasks 6-7): claves `onboarding.intent*`. Voz Aluna (evolutiva, cálida, sin marketing). Texto exacto:

```ts
// dentro de es.onboarding (añadir):
intentGoalsEyebrow: "Tu intención",
intentGoalsTitle: "¿Qué te trae a Aluna?",
intentGoalsHint: "Elige lo que resuene. Puedes cambiar de rumbo cuando quieras.",
intentGoalSelf: "Conocerme en profundidad",
intentGoalBonds: "Mis vínculos",
intentGoalPurpose: "Mi propósito",
intentGoalFuture: "Prepararme para lo que viene",
intentGoalSpirituality: "Explorar la espiritualidad",
intentGoalOthers: "Entender a los demás",
intentGoalDecisions: "Guía para decidir",
intentGoalNotePlaceholder: "¿Algo más? (opcional)",
intentAffirmEyebrow: "Con Aluna",
intentAffirmTitle: "Este será tu camino",
intentAffirmSelf: "Vas a mirarte con honestidad y ternura (svadhyaya).",
intentAffirmBonds: "Vas a entender tus vínculos desde el alma, no desde el miedo.",
intentAffirmPurpose: "Vas a escuchar tu dharma: lo que viniste a hacer.",
intentAffirmFuture: "Vas a caminar hacia lo que viene con los ojos abiertos.",
intentAffirmSpirituality: "Vas a explorar lo sagrado a tu propio ritmo.",
intentAffirmOthers: "Vas a ver a los demás con más compasión y claridad.",
intentAffirmDecisions: "Vas a decidir desde tu centro, no desde el ruido.",
intentFocusEyebrow: "Tu foco",
intentFocusTitle: "¿Dónde quieres más luz ahora?",
intentFocusHint: "Tu panel de energía pondrá estas áreas primero.",
intentFocusLove: "Amor", intentFocusMoney: "Dinero", intentFocusWork: "Trabajo",
intentFocusHealth: "Salud", intentFocusMood: "Ánimo", intentFocusLuck: "Suerte",
intentRelEyebrow: "Tu corazón",
intentRelTitle: "¿Cómo está tu corazón hoy?",
intentRelSingle: "En soltería", intentRelPartnered: "En pareja", intentRelMarried: "En matrimonio",
intentRelComplicated: "Es complicado", intentRelPrivate: "Prefiero no decirlo",
intentSkip: "Omitir",
```

EN (paridad, misma estructura): "Your intention" / "What brings you to Aluna?" / "Choose what resonates. You can change course anytime." / "Know myself deeply" / "My bonds" / "My purpose" / "Prepare for what's coming" / "Explore spirituality" / "Understand others" / "Guidance to decide" / "Anything else? (optional)" / "With Aluna" / "This will be your path" / "You'll look at yourself with honesty and tenderness (svadhyaya)." / "You'll understand your bonds from the soul, not from fear." / "You'll listen to your dharma: what you came here to do." / "You'll walk toward what's coming with open eyes." / "You'll explore the sacred at your own pace." / "You'll see others with more compassion and clarity." / "You'll decide from your center, not from the noise." / "Your focus" / "Where do you want more light now?" / "Your energy panel will put these areas first." / "Love" / "Money" / "Work" / "Health" / "Mood" / "Luck" / "Your heart" / "How is your heart today?" / "Single" / "In a relationship" / "Married" / "It's complicated" / "I'd rather not say" / "Skip".

- [ ] **Step 1: añadir claves ES y EN** (no hay test de paridad en móvil; el compilador de TS vigila la forma si `STRINGS` está tipado — respétalo).
- [ ] **Step 2: gate** — `npx pnpm --filter @aluna/mobile exec tsc --noEmit` → PASS.
- [ ] **Step 3: commit** — `git add apps/mobile/lib/strings.ts && git commit -m "feat(cuestionario): strings es/en de los pasos de intención (móvil)"`

---

### Task 6: Móvil — pasos de intención en el onboarding

**Files:**
- Modify: `apps/mobile/app/onboarding.tsx`
- Modify: `apps/mobile/lib/intent.ts` (añadir helper de pasos) + `apps/mobile/lib/__tests__/intent.test.ts`

**Interfaces:**
- Consumes: Task 4 (`IntentDraft`, `draftToIntent`, `saveRemoteIntent`, `storeLocalIntent`), Task 5 (strings), `Chip` de `../components/ui` (props: `kind="control" | …`, `label`, `selected`, `onPress` — como en `ajustes.tsx:170-181`).
- Produces: flujo móvil con pasos `goals → affirm → focus → relationship → name → date → time → place → gender`. Helper puro en `lib/intent.ts`:
  - `type IntentStep = "goals" | "affirm" | "focus" | "relationship"`
  - `intentSteps(d: IntentDraft): IntentStep[]` — siempre `["goals", …]`; **incluye `"affirm"` solo si `d.goals.length > 0`**.

- [ ] **Step 1: test del helper (falla)** — añadir a `intent.test.ts`:

```ts
import { intentSteps } from "../intent";
describe("intentSteps", () => {
  it("sin metas no hay afirmación", () => {
    expect(intentSteps(EMPTY_INTENT_DRAFT)).toEqual(["goals", "focus", "relationship"]);
  });
  it("con metas aparece la afirmación tras metas", () => {
    expect(intentSteps({ ...EMPTY_INTENT_DRAFT, goals: ["self"] }))
      .toEqual(["goals", "affirm", "focus", "relationship"]);
  });
});
```

- [ ] **Step 2: correr y ver fallar**; implementar `intentSteps` en `lib/intent.ts`; verde.
- [ ] **Step 3: UI en `onboarding.tsx`.** Lee el archivo entero antes de tocar. Cambios:
  1. `type Step` (línea ~29) pasa a `IntentStep | BirthStep` donde `BirthStep` es el union actual; la lista de pasos deja de ser constante: `const steps: Step[] = [...intentSteps(draft), ...BIRTH_STEPS]` recalculada en render (el índice `i` se mantiene; al avanzar desde "goals" recalcula — avanzar con `setI(i+1)` sigue correcto porque "affirm" se inserta/quita ANTES de pasar el paso de metas, nunca detrás del índice actual).
  2. Estado nuevo `const [draft, setDraft] = useState<IntentDraft>(EMPTY_INTENT_DRAFT)`.
  3. `stepComplete`: los 4 pasos de intención devuelven `true` siempre (saltables).
  4. Render por paso (misma estructura visual de los pasos actuales — eyebrow + título + campo, tamaños 13/15/19/24):
     - `goals`: grid de `Chip kind="control"` multi-select (toggle en `draft.goals`) + `TextInput` para `goalNote` (estilo del input existente del paso name) + hint 13.
     - `affirm`: lista de líneas `intentAffirm<Goal>` SOLO de las metas elegidas, cada una precedida de "✦" (Text 15, color acento).
     - `focus`: chips multi-select de las 6 áreas (claves `love|money|work|health|mood|luck` — orden de `LIFE_AREAS` de core) + hint.
     - `relationship`: chips single-select (re-tap deselecciona → `relationship: null`).
  5. Botón **"Omitir"** (Text 13, discreto, junto a "Atrás") visible SOLO en pasos de intención: limpia la respuesta de ESE paso y avanza (`goals`: vacía goals y goalNote — con lo cual "affirm" desaparece de la lista y el `i+1` cae en "focus" naturalmente).
  6. En `next()` final (tras `insertRemoteProfile` y antes de `router.replace`):

```ts
const intent = draftToIntent(draft, new Date().toISOString());
if (intent) {
  await storeLocalIntent(intent);
  try { await saveRemoteIntent(getSupabase(), session.user.id, intent); } catch { /* best effort: el espejo local queda */ }
}
```

- [ ] **Step 4: gates** — `npx pnpm --filter @aluna/mobile exec tsc --noEmit && npx pnpm --filter @aluna/mobile exec vitest run` → PASS. Después, bundle real: `cd apps/mobile && npx expo export --platform ios` → termina sin error.
- [ ] **Step 5: commit** — `git add apps/mobile && git commit -m "feat(cuestionario): pasos de intención (metas/afirmación/foco/corazón) en el onboarding móvil"`

---

### Task 7: Móvil — gauge zodiacal vivo en el paso de fecha

**Files:**
- Create: `apps/mobile/components/ZodiacGauge.tsx`
- Modify: `apps/mobile/app/onboarding.tsx` (paso `date`)

**Interfaces:**
- Consumes: `sunSignFromDate`, `ZODIAC_SIGNS` de `@aluna/core`; `react-native-svg` (ya en package.json); labels de signos: `astroLabels(locale).signs[key]` de `../content/astrology`.
- Produces: `<ZodiacGauge date={a.birthDate} locale={locale} />` — semicírculo SVG (12 sectores con glifo de `ZODIAC_SIGNS[i].glyph`, el del signo activo resaltado en acento con sector tintado); debajo, Text 15 con el nombre del signo y, si `cusp`, sufijo "≈" + hint 13 ("El límite exacto lo dirá tu carta" / "Your chart will tell the exact boundary" — añade las claves `intentCuspHint` ES/EN a `strings.ts`). Si `sunSignFromDate` da null (fecha incompleta), renderiza el arco sin resaltar y sin texto.

- [ ] **Step 1: componente.** SVG `viewBox="0 0 200 110"`, arco de radio 88 centrado en (100,104); 12 sectores de 15° (semicírculo = 180°/12) generados con `Path` (usa la misma matemática polar→cartesiana que `ChartWheel.tsx` — léelo como referencia de estilo); glifos con `SvgText` fontSize 13, fill del token de texto secundario que use `ChartWheel` (copia sus constantes de color de `@aluna/core`/`chip-colors` según el patrón existente). Sin animación (el resalte cambia al cambiar la fecha, suficiente feedback).
- [ ] **Step 2: integrarlo** en el paso `date` del onboarding, encima del input de fecha.
- [ ] **Step 3: gates** — tsc + vitest móvil + `npx expo export --platform ios` → PASS/bundlea.
- [ ] **Step 4: commit** — `git add apps/mobile && git commit -m "feat(cuestionario): gauge zodiacal vivo en el paso de fecha (móvil)"`

---

### Task 8: Web — extensión de `lib/onboarding.ts`

**Files:**
- Modify: `apps/web/lib/onboarding.ts`
- Modify: `apps/web/lib/__tests__/onboarding.test.ts`

**Interfaces:**
- Consumes: `IntentGoal`, `LifeArea`, `RelationshipStatus`, `UserIntent` de `@aluna/core`.
- Produces (Tasks 9-10):
  - `type IntentStep = "goals" | "affirm" | "focus" | "relationship"` y `type OnboardingStep` ampliado: `IntentStep | "name" | "date" | "time" | "place" | "gender"`.
  - `interface IntentDraft` idéntico al móvil (Task 4) + `EMPTY_INTENT_DRAFT`.
  - `buildSteps(d: IntentDraft): OnboardingStep[]` — `[...intentSteps, ...pasos de nacimiento]` con la misma regla del affirm que Task 6.
  - `isStepComplete` amplía: los 4 pasos de intención → `true`.
  - `draftToIntent(d, now): UserIntent | null` (misma lógica que móvil — duplicación consciente de ~15 líneas: web y móvil no comparten libs de app; lo compartible ya vive en core como `parseIntent`).

- [ ] **Step 1: tests que fallan** — en `onboarding.test.ts` añadir describe con: `buildSteps(EMPTY_INTENT_DRAFT)` sin affirm; con goals incluye affirm; `isStepComplete("goals", {})` true; `draftToIntent` los 3 casos de Task 4 Step 1.
- [ ] **Step 2: ver fallar → implementar → verde** (`npx pnpm --filter @aluna/web exec vitest run lib/__tests__/onboarding.test.ts`). OJO: `STEPS` constante exportada la consume `onboarding-flow.tsx` (se reemplaza en Task 10) — mantenla exportada como `BIRTH_STEPS` renombrada o conserva `STEPS` para no romper el build intermedio; decide y deja consistencia (recomendado: conservar `STEPS` con los 5 de nacimiento y que `buildSteps` los use).
- [ ] **Step 3: gate** — vitest web completo + tsc → PASS.
- [ ] **Step 4: commit** — `git add apps/web/lib && git commit -m "feat(cuestionario): pasos de intención en la lib de onboarding web"`

---

### Task 9: Web — persistir intención en el server action

**Files:**
- Modify: `apps/web/app/onboarding/actions.ts`

**Interfaces:**
- Consumes: `draftToIntent`, `IntentDraft` (Task 8); `UserIntent` de core.
- Produces: `createBirthProfile(answers: OnboardingAnswers, intentDraft?: IntentDraft)` — tras el insert de `birth_profiles` y ANTES del redirect:

```ts
if (intentDraft) {
  const intent = draftToIntent(intentDraft, new Date().toISOString());
  if (intent) {
    type SettingsIntent = { update: (v: { intent: UserIntent }) => { eq: (c: string, v: string) => Promise<unknown> } };
    const sb = supabase.from("settings") as unknown as SettingsIntent;
    await sb.update({ intent }).eq("user_id", user.id).catch(() => {}); // best effort: la intención nunca bloquea crear el perfil
  }
}
```

(usa el mismo patrón de builder-cast de `persistSettings` en `apps/web/app/(app)/actions.ts`; nota: `.catch` sobre el thenable de supabase — si el builder no expone catch, envuelve en try/catch).

- [ ] **Step 1: implementar** (sin test propio de la action — la lógica pura ya se testeó en Task 8; las actions del repo no tienen tests, sigue el patrón).
- [ ] **Step 2: gate** — tsc web + vitest web → PASS.
- [ ] **Step 3: commit** — `git add apps/web/app/onboarding/actions.ts && git commit -m "feat(cuestionario): persistir settings.intent al crear el perfil (web)"`

---

### Task 10: Web — UI de los pasos de intención + i18n

**Files:**
- Modify: `apps/web/app/onboarding/onboarding-flow.tsx`
- Modify: `apps/web/app/onboarding/onboarding.module.css`
- Modify: `apps/web/messages/es.json` y `apps/web/messages/en.json` (sección `onboarding`)

**Interfaces:**
- Consumes: Tasks 8-9. i18n: añade a `onboarding` las MISMAS claves de Task 5 (mismos nombres `intentGoalsEyebrow`…`intentSkip`, mismos textos ES/EN — el test de paridad i18n existente vigila es↔en).
- Produces: flujo web `goals → affirm → focus → relationship → name → … → gender`.

- [ ] **Step 1: UI.** En `onboarding-flow.tsx`:
  1. Estado `draft` + `steps = buildSteps(draft)` en render; `EYEBROW`/`TITLE` ganan las 4 claves nuevas.
  2. Render de cada paso de intención (misma estructura eyebrow/título/field con `reveal`):
     - chips: usa el primitivo global `.chip` (R3 — leer `docs/redesign/R3-sistema.md` antes de estilos) con estado seleccionado vía override local del módulo (`.intentChip` + `.intentChipOn` con borde/tinte de `--acc`); multi-select goals/focus, single relationship.
     - `goals` añade `<input>` (clase `styles.input` existente) para `goalNote` con placeholder `intentGoalNotePlaceholder`.
     - `affirm`: `<ul>` de líneas elegidas, "✦" en `--acc-text`.
  3. Botón **Omitir** (estilo de `styles.back`) solo en pasos de intención: limpia la respuesta del paso y avanza.
  4. Último paso llama `createBirthProfile(a, draft)`.
- [ ] **Step 2: test de flujo (RTL, jsdom).** Create `apps/web/app/onboarding/__tests__/onboarding-flow.test.tsx` (primer test del flujo; mockea `./actions` con `vi.mock` y `next-intl` como hagan los tests web existentes — busca un test que use `useTranslations` y copia su setup):

```tsx
it("omitir metas salta la afirmación y aterriza en foco", async () => { /* render, click Omitir, esperar título de foco */ });
it("elegir una meta y avanzar muestra la afirmación con esa línea", async () => { /* ... */ });
```

(escríbelos completos siguiendo el setup real que encuentres; si el mock de next-intl del repo no existe, usa `NextIntlClientProvider` con `messages` reales importados de `messages/es.json`).
- [ ] **Step 3: gates** — vitest web + tsc + `rm -rf apps/web/.next && npx pnpm --filter @aluna/web exec next build` → PASS.
- [ ] **Step 4: commit** — `git add apps/web && git commit -m "feat(cuestionario): pasos de intención en el onboarding web + i18n"`

---

### Task 11: Web — gauge zodiacal en el paso de fecha

**Files:**
- Create: `apps/web/app/onboarding/zodiac-gauge.tsx`
- Modify: `apps/web/app/onboarding/onboarding-flow.tsx` (paso `date`), `onboarding.module.css`
- Create: `apps/web/app/onboarding/__tests__/zodiac-gauge.test.tsx`
- Modify: `apps/web/messages/es.json` / `en.json` (claves `onboarding.cuspHint`: "El límite exacto lo dirá tu carta" / "Your chart will tell the exact boundary")

**Interfaces:**
- Consumes: `sunSignFromDate`, `ZODIAC_SIGNS` de `@aluna/core`; labels de `@/lib/content/astrology-labels` (`astroLabels(locale).signs`). Glifos como TEXTO: `sign.glyph + "︎"` (patrón TEXT_VS).
- Produces: `<ZodiacGauge date={a.birthDate} locale={locale} />` — mismo diseño que Task 7 en SVG web (semicírculo, 12 glifos, activo resaltado con `--acc`, sector tintado `rgba(var(--acc-rgb), .12)`); nombre del signo debajo y hint de cúspide cuando aplique; `aria-label` con el nombre del signo.

- [ ] **Step 1: test que falla** — render con `date="1990-02-05"` muestra el nombre de Acuario (label ES) y NO el hint; con `"1990-03-20"` muestra hint de cúspide; con `date=""` no muestra nombre.
- [ ] **Step 2: implementar; verde.**
- [ ] **Step 3: gates** — vitest web + tsc + next build → PASS.
- [ ] **Step 4: commit** — `git add apps/web && git commit -m "feat(cuestionario): gauge zodiacal vivo en el paso de fecha (web)"`

---

### Task 12: Web — el Hoy ordena las áreas por foco

**Files:**
- Modify: `apps/web/app/(app)/hoy/page.tsx` (leer `settings.intent` del usuario — el layout ya lee settings pero no lo propaga; este page hace su propio select de `intent`)
- Modify: `apps/web/app/(app)/hoy/hub-view.tsx` (prop `focus` → `EnergyPanel`)
- Modify: `apps/web/app/(app)/hoy/energy-panel.tsx` (`orderAreasByFocus` sobre `data.areas` al recibir la respuesta de `/api/scores`)
- Test: `apps/web/app/(app)/hoy/__tests__/` — si existe test del panel, extiéndelo; si no, el orden ya está cubierto por core (Task 1) y basta un test de que `EnergyPanel` pasa `focus` (opcional, no bloqueante).

**Interfaces:**
- Consumes: `parseIntent`, `orderAreasByFocus` de `@aluna/core`.
- Produces: `EnergyPanel({ profileId, focus }: { profileId: string; focus: LifeArea[] })` — con `focus=[]` el render es idéntico al actual.

- [ ] **Step 1: implementar el hilo** page → hub-view → panel; en el panel: `setAreas(orderAreasByFocus(data.areas, focus))` (o equivalente donde hoy setea el estado).
- [ ] **Step 2: gates** — vitest web + tsc + next build → PASS.
- [ ] **Step 3: commit** — `git add "apps/web/app/(app)/hoy" && git commit -m "feat(cuestionario): el panel de energía pone primero las áreas del foco"`

---

### Task 13: IA opcional — línea de intención en prompts + toggles

**Files:**
- Create: `apps/web/lib/intent-line.ts` + `apps/web/lib/__tests__/intent-line.test.ts`
- Modify: `apps/web/app/api/chat/route.ts`
- Modify: `apps/web/lib/reports/generate.ts` (donde se arma el grounding — leer el archivo para ubicar el punto exacto)
- Modify: `apps/web/app/(app)/actions.ts` (action `setIntentUseInAI`)
- Modify: `apps/web/app/(app)/perfil/settings-controls.tsx` (+ su module.css si hace falta) — sección "Aluna te conoce" con toggle
- Modify: `apps/web/messages/es.json`/`en.json` (settings: `intentAI`: "Personalizar lecturas con mis intenciones" / "Personalize readings with my intentions"; `intentAIHint`: "Solo si respondiste el cuestionario. Apagado, Aluna lee tu carta sin ese contexto." / "Only if you answered the questionnaire. Off, Aluna reads your chart without that context.")
- Modify móvil: `apps/mobile/app/(tabs)/ajustes.tsx` (chips Sí/No con `fetchRemoteIntent`/`saveRemoteIntent` de Task 4; strings `settings.intentAI`/`intentAIHint`/`intentAIOn`/`intentAIOff` ES/EN en `strings.ts`)

**Interfaces:**
- Consumes: `UserIntent`, `parseIntent` de core; `authenticateRoute` ya presente en chat route.
- Produces:
  - `buildIntentLine(intent: UserIntent | null, locale: "es" | "en"): string | null` — **null si `!intent`, `!intent.useInAI`, o sin contenido** (goals/focus/relationship todos vacíos). Formato ES: `"INTENCIÓN DE LA PERSONA (contexto, no lo cites literal): busca <metas>; foco actual: <áreas>; corazón: <estado>."` con las partes presentes unidas por "; " (metas/áreas en palabras ES: usa mapas locales en este archivo con los MISMOS textos de Task 5; estado igual). EN equivalente: `"THE PERSON'S INTENTION (context, don't quote it literally): seeking <goals>; current focus: <areas>; heart: <status>."`
  - Chat: tras armar `system`, si la línea existe → `system = system + "\n\n" + line`. El select: `supabase.from("settings").select("intent").eq("user_id", user.id).maybeSingle()` con `parseIntent(data?.intent)` (si el tipo colapsa a never, deriva con cast local como hace el repo en casos análogos).
  - Informes: misma línea añadida al final del string de grounding natal Y solar.
  - `setIntentUseInAI(on: boolean)`: lee `settings.intent`; si `parseIntent` da null NO hace nada; si no, update con `{...intent, useInAI: on}`.

- [ ] **Step 1: tests que fallan** (`intent-line.test.ts`): null sin intent / con useInAI=false / con intent vacío de contenido; línea ES completa con goals+focus+relationship; línea EN; solo-focus omite las otras partes.
- [ ] **Step 2: implementar `buildIntentLine`; verde.**
- [ ] **Step 3: cablear chat + informes + action + toggles web y móvil.** El toggle web: sección nueva en `settings-controls.tsx` siguiendo el patrón de botones `aria-pressed` existente (dos botones Encendido/Apagado o un botón switch); render solo tiene efecto si hay intent (si `setIntentUseInAI` no-opea, muestra igual el control — estado inicial viene de un select del intent en el server component `perfil/page.tsx` que ya carga datos: pásalo como prop; léelo para ubicar el punto).
- [ ] **Step 4: gates completos** — vitest web + tsc + next build; tsc + vitest móvil + expo export → PASS.
- [ ] **Step 5: commit** — `git add apps/web apps/mobile && git commit -m "feat(cuestionario): línea de intención opcional en chat e informes + toggle en ajustes (web y móvil)"`

---

### Task 14: Gate integral final

- [ ] **Step 1:** desde la raíz: `npx pnpm turbo run typecheck test` → 0 errores en los 6 paquetes.
- [ ] **Step 2:** `rm -rf apps/web/.next && npx pnpm --filter @aluna/web exec next build` → limpio (recuerda la lección: build sospechosamente rápido + "Cannot find module for page" = caché corrupta).
- [ ] **Step 3:** `cd apps/mobile && npx expo export --platform ios` → bundlea sin error.
- [ ] **Step 4:** commit final si hubo arreglos: `git commit -m "fix(cuestionario): remates del gate integral"`.

## Self-review del plan (hecho)

- **Cobertura del spec:** flujo intención→datos (T6/T10), Omitir (T6/T10), afirmación dinámica (T6/T10), gauge con cúspide (T2/T7/T11), migración+tipos (T3), orden por foco (T1/T12), IA opcional byte-igual apagada (T13), usuarios existentes intactos (no se toca `RootGate` ni `(app)/layout.tsx` — el cuestionario solo corre dentro del onboarding, que solo ven usuarios sin perfil), edición desde Perfil = futuro (solo el toggle useInAI entra, T13). ✓
- **Tipos consistentes:** `IntentDraft`/`draftToIntent` duplicados a propósito web/móvil (documentado en T8); `UserIntent`/`parseIntent`/`orderAreasByFocus`/`sunSignFromDate` solo en core. ✓
- **Riesgo señalado:** aplicar la migración en vivo es paso del CONTROLADOR (nota en T3).
