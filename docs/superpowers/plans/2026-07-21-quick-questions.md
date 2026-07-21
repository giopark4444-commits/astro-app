# Accesos rápidos de preguntas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar al chat de Aluna 2 páginas de 6 chips con preguntas frecuentes; tocás un chip → se envía; un lápiz permite editarlas inline y quedan guardadas sincronizadas en la cuenta.

**Architecture:** Una capa de datos pura y testeable (`lib/quick-questions.ts`: defaults ES/EN + normalización a 2×6) alimenta un componente cliente `<QuickQuestions>` que se auto-abastece por GET `/api/quick-questions` (defaults si no hay nada guardado) y persiste con un server action `saveQuickQuestions`. El componente se monta dentro de `ChatView` sobre el composer, así aparece solo en las 3 superficies del chat (/preguntar, panel de Perfil, panel de Hoy) sin pasar props por cada montaje. La columna `quick_questions jsonb` vive en `public.settings` (por usuario, junto a theme/intent).

**Tech Stack:** Next.js 15 App Router, React client components, next-intl, Supabase (Postgres + RLS), vitest + @testing-library/react.

## Global Constraints

- **Paridad i18n:** toda clave nueva en el namespace `chat` debe existir IDÉNTICA en `apps/web/messages/es.json` y `apps/web/messages/en.json`. `apps/web/app/__tests__/i18n.test.tsx` lo verifica y DEBE seguir verde.
- **Forma fija:** exactamente **2 páginas × 6 preguntas**. Constantes `PAGES = 2`, `PER_PAGE = 6`, `MAX_LEN = 120`.
- **Vacío → default:** una pregunta vacía o solo-espacios cae al default de esa posición (nunca se guarda un chip vacío). Cada string se recorta a `MAX_LEN`.
- **Sin romper los 3 montajes:** `ChatView` debe seguir funcionando en `/preguntar` (page mode), panel de Perfil y panel de Hoy (embedded). El componente se auto-abastece por fetch — cero threading de props por los mount points.
- **Chips siempre visibles** arriba del composer, incluso con conversación en curso.
- **Shim tipado** para la columna JSON (patrón `settingsBuilder`/`intentBuilder` ya en `actions.ts`) por el bug de `exactOptionalPropertyTypes` con postgrest-js.
- **Preguntas por defecto VERBATIM** (ver Task 1) — aprobadas por Gio.
- **Review final del branch: Fable 5** (el más capaz; Gio confirmó que Fable NO está agotado).

---

### Task 1: Capa de datos pura (defaults + normalización)

**Files:**
- Create: `apps/web/lib/quick-questions.ts`
- Test: `apps/web/lib/__tests__/quick-questions.test.ts`

**Interfaces:**
- Produces:
  - `const PAGES = 2`, `const PER_PAGE = 6`, `const MAX_LEN = 120`
  - `type Locale = "es" | "en"`
  - `function localeKey(locale: string): Locale`
  - `const DEFAULT_QUICK_QUESTIONS: Record<Locale, string[][]>` (2×6 por locale)
  - `function parseQuickQuestions(raw: unknown, locale: string): string[][]` — normaliza CUALQUIER entrada a 2×6, rellenando huecos con los defaults del locale
  - `function normalizeForSave(pages: string[][], locale: string): { pages: string[][] }` — envuelve `parseQuickQuestions` para persistir

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/lib/__tests__/quick-questions.test.ts
import { describe, it, expect } from "vitest";
import {
  DEFAULT_QUICK_QUESTIONS,
  parseQuickQuestions,
  normalizeForSave,
  localeKey,
  PAGES,
  PER_PAGE,
  MAX_LEN,
} from "../quick-questions";

describe("quick-questions defaults", () => {
  it("hay 2 páginas de 6 en ES y EN", () => {
    for (const loc of ["es", "en"] as const) {
      expect(DEFAULT_QUICK_QUESTIONS[loc]).toHaveLength(PAGES);
      for (const page of DEFAULT_QUICK_QUESTIONS[loc]) {
        expect(page).toHaveLength(PER_PAGE);
        for (const q of page) expect(q.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("localeKey mapea variantes de locale", () => {
    expect(localeKey("es")).toBe("es");
    expect(localeKey("es-CO")).toBe("es");
    expect(localeKey("en")).toBe("en");
    expect(localeKey("en-US")).toBe("en");
    expect(localeKey("xx")).toBe("es"); // fallback
  });
});

describe("parseQuickQuestions", () => {
  it("null/undefined → defaults del locale", () => {
    expect(parseQuickQuestions(null, "es")).toEqual(DEFAULT_QUICK_QUESTIONS.es);
    expect(parseQuickQuestions(undefined, "en")).toEqual(DEFAULT_QUICK_QUESTIONS.en);
  });

  it("basura (número, string) → defaults", () => {
    expect(parseQuickQuestions(42, "es")).toEqual(DEFAULT_QUICK_QUESTIONS.es);
    expect(parseQuickQuestions("hola", "es")).toEqual(DEFAULT_QUICK_QUESTIONS.es);
  });

  it("2×6 válido en {pages} se conserva (recortado)", () => {
    const custom = {
      pages: [
        ["a1", "a2", "a3", "a4", "a5", "a6"],
        ["b1", "b2", "b3", "b4", "b5", "b6"],
      ],
    };
    expect(parseQuickQuestions(custom, "es")).toEqual(custom.pages);
  });

  it("acepta también un array plano de páginas (sin envoltura {pages})", () => {
    const pages = [
      ["a1", "a2", "a3", "a4", "a5", "a6"],
      ["b1", "b2", "b3", "b4", "b5", "b6"],
    ];
    expect(parseQuickQuestions(pages, "es")).toEqual(pages);
  });

  it("huecos (vacío, no-string, faltante) se rellenan con el default de esa posición", () => {
    const raw = { pages: [["", 5, "c3"], ["d1"]] };
    const out = parseQuickQuestions(raw, "es");
    expect(out).toHaveLength(2);
    expect(out[0]).toHaveLength(6);
    expect(out[1]).toHaveLength(6);
    expect(out[0][0]).toBe(DEFAULT_QUICK_QUESTIONS.es[0][0]); // "" → default
    expect(out[0][1]).toBe(DEFAULT_QUICK_QUESTIONS.es[0][1]); // 5 → default
    expect(out[0][2]).toBe("c3"); // se conserva
    expect(out[1][0]).toBe("d1");
    expect(out[1][1]).toBe(DEFAULT_QUICK_QUESTIONS.es[1][1]); // faltante → default
  });

  it("recorta a MAX_LEN", () => {
    const long = "x".repeat(MAX_LEN + 50);
    const out = parseQuickQuestions({ pages: [[long]] }, "es");
    expect(out[0][0]).toHaveLength(MAX_LEN);
  });
});

describe("normalizeForSave", () => {
  it("devuelve { pages } normalizado a 2×6", () => {
    const out = normalizeForSave([["solo-una"]], "es");
    expect(out.pages).toHaveLength(2);
    expect(out.pages[0]).toHaveLength(6);
    expect(out.pages[0][0]).toBe("solo-una");
    expect(out.pages[0][1]).toBe(DEFAULT_QUICK_QUESTIONS.es[0][1]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @aluna/web exec vitest run lib/__tests__/quick-questions.test.ts`
Expected: FAIL — `Cannot find module '../quick-questions'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/web/lib/quick-questions.ts
export const PAGES = 2;
export const PER_PAGE = 6;
export const MAX_LEN = 120;

export type Locale = "es" | "en";

export function localeKey(locale: string): Locale {
  return locale.toLowerCase().startsWith("en") ? "en" : "es";
}

// Preguntas por defecto (aprobadas por Gio). Página 1 = generales/reflexivas;
// página 2 = los temas más consultados del mundo (amor/dinero/propósito/día/
// soltar/autoconocimiento) en voz evolutiva de Aluna, no predictiva.
export const DEFAULT_QUICK_QUESTIONS: Record<Locale, string[][]> = {
  es: [
    [
      "¿Cómo está mi energía hoy?",
      "¿En qué me conviene enfocarme?",
      "¿Qué necesito soltar?",
      "¿Cómo están mis vínculos ahora?",
      "¿Qué me está pidiendo mi carta?",
      "¿Qué lección me trae este momento?",
    ],
    [
      "¿Qué necesito entender sobre mis vínculos ahora?",
      "¿Qué me está frenando con el dinero?",
      "¿Hacia dónde me llama mi propósito?",
      "¿Qué energía trae mi día hoy?",
      "¿Qué necesito soltar para crecer?",
      "¿Qué me revela mi carta sobre quién soy?",
    ],
  ],
  en: [
    [
      "How is my energy today?",
      "What should I focus on?",
      "What do I need to release?",
      "How are my relationships right now?",
      "What is my chart asking of me?",
      "What lesson does this moment bring?",
    ],
    [
      "What do I need to understand about my relationships now?",
      "What's holding me back with money?",
      "Where is my purpose calling me?",
      "What energy does my day hold today?",
      "What do I need to release to grow?",
      "What does my chart reveal about who I am?",
    ],
  ],
};

function asPages(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object" && Array.isArray((raw as { pages?: unknown }).pages)) {
    return (raw as { pages: unknown[] }).pages;
  }
  return [];
}

function cleanOne(candidate: unknown, fallback: string): string {
  if (typeof candidate !== "string") return fallback;
  const trimmed = candidate.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, MAX_LEN);
}

/** Normaliza cualquier entrada a exactamente PAGES×PER_PAGE, rellenando con defaults. */
export function parseQuickQuestions(raw: unknown, locale: string): string[][] {
  const def = DEFAULT_QUICK_QUESTIONS[localeKey(locale)];
  const pages = asPages(raw);
  return def.map((defPage, p) => {
    const page = Array.isArray(pages[p]) ? (pages[p] as unknown[]) : [];
    return defPage.map((defQ, i) => cleanOne(page[i], defQ));
  });
}

/** Envoltura para persistir en la columna jsonb. */
export function normalizeForSave(pages: string[][], locale: string): { pages: string[][] } {
  return { pages: parseQuickQuestions(pages, locale) };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @aluna/web exec vitest run lib/__tests__/quick-questions.test.ts`
Expected: PASS (todos los casos).

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/quick-questions.ts apps/web/lib/__tests__/quick-questions.test.ts
git commit -m "feat(chat): capa de datos de accesos rápidos (defaults 2x6 + normalización)"
```

---

### Task 2: Migración + tipos de la columna `quick_questions`

**Files:**
- Create: `supabase/migrations/0021_quick_questions.sql`
- Modify: `packages/supabase/src/database.types.ts` (bloque `settings`: Row, Insert, Update)

**Interfaces:**
- Produces: columna `settings.quick_questions jsonb` (nullable) + su tipo `Json | null` en Row/Insert/Update, para que `select("quick_questions")` y `update({ quick_questions })` tipen.

- [ ] **Step 1: Crear la migración**

```sql
-- supabase/migrations/0021_quick_questions.sql
-- Accesos rápidos del chat: 2 páginas de 6 preguntas editables, por usuario.
-- jsonb con forma { pages: string[][] }; null/ausente => la app usa los defaults del locale.
alter table public.settings add column if not exists quick_questions jsonb;
```

- [ ] **Step 2: Añadir el tipo a database.types.ts (3 bloques del objeto `settings`)**

En `Row` añadir (orden alfabético, junto a `memory_enabled`):
```ts
          quick_questions: Json | null;
```
En `Insert` añadir:
```ts
          quick_questions?: Json | null;
```
En `Update` añadir:
```ts
          quick_questions?: Json | null;
```

- [ ] **Step 3: Verificar typecheck**

Run: `pnpm --filter @aluna/supabase exec tsc --noEmit`
Expected: PASS (sin errores de tipo por la nueva propiedad).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0021_quick_questions.sql packages/supabase/src/database.types.ts
git commit -m "feat(db): columna settings.quick_questions (migración 0021 + tipos)"
```

> Nota de despliegue (no bloquea la app): Gio debe aplicar `0021` al Supabase remoto de Aluna, como el resto de migraciones pendientes. Sin aplicarla, el GET degrada a defaults (try/catch) y el guardado no persiste — la UI sigue funcionando localmente.

---

### Task 3: Lectura (GET route) + escritura (server action)

**Files:**
- Create: `apps/web/app/api/quick-questions/route.ts`
- Modify: `apps/web/app/(app)/actions.ts` (añadir shim `quickQuestionsBuilder` + action `saveQuickQuestions`)
- Test: `apps/web/lib/__tests__/quick-questions-route.test.ts`

**Interfaces:**
- Consumes: `parseQuickQuestions`, `normalizeForSave` (Task 1); `authenticateRoute` (`@/lib/supabase/route-auth`); `createClient` + `getLocale` (ya importados en actions.ts).
- Produces:
  - GET `/api/quick-questions?locale=<loc>` → `{ pages: string[][] }` (defaults si no hay fila/columna/valor)
  - `async function saveQuickQuestions(pages: string[][]): Promise<void>` (server action)

- [ ] **Step 1: Write the failing test (route handler con supabase mockeado)**

```ts
// apps/web/lib/__tests__/quick-questions-route.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DEFAULT_QUICK_QUESTIONS } from "../quick-questions";

const authMock = vi.fn();
vi.mock("@/lib/supabase/route-auth", () => ({
  authenticateRoute: (...args: unknown[]) => authMock(...args),
}));

import { GET } from "../../app/api/quick-questions/route";

function req(url = "http://localhost/api/quick-questions?locale=es") {
  return { nextUrl: new URL(url) } as unknown as import("next/server").NextRequest;
}

function supabaseReturning(value: unknown) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: { quick_questions: value } }) }),
      }),
    }),
  };
}

beforeEach(() => authMock.mockReset());

describe("GET /api/quick-questions", () => {
  it("401 sin usuario", async () => {
    authMock.mockResolvedValue({ supabase: {}, user: null });
    const res = await GET(req());
    expect(res.status).toBe(401);
  });

  it("sin valor guardado → defaults del locale", async () => {
    authMock.mockResolvedValue({ supabase: supabaseReturning(null), user: { id: "u1" } });
    const res = await GET(req());
    const body = (await res.json()) as { pages: string[][] };
    expect(body.pages).toEqual(DEFAULT_QUICK_QUESTIONS.es);
  });

  it("valor guardado → se devuelve normalizado", async () => {
    const saved = {
      pages: [
        ["a1", "a2", "a3", "a4", "a5", "a6"],
        ["b1", "b2", "b3", "b4", "b5", "b6"],
      ],
    };
    authMock.mockResolvedValue({ supabase: supabaseReturning(saved), user: { id: "u1" } });
    const res = await GET(req());
    const body = (await res.json()) as { pages: string[][] };
    expect(body.pages).toEqual(saved.pages);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @aluna/web exec vitest run lib/__tests__/quick-questions-route.test.ts`
Expected: FAIL — no existe `../../app/api/quick-questions/route`.

- [ ] **Step 3: Crear la GET route**

```ts
// apps/web/app/api/quick-questions/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { authenticateRoute } from "@/lib/supabase/route-auth";
import { parseQuickQuestions } from "@/lib/quick-questions";

// Accesos rápidos del chat: devuelve las 2×6 preguntas del usuario, o los
// defaults del locale si nunca guardó nada. Best-effort: sin fila/columna
// (0021 sin aplicar todavía) degrada a defaults, nunca lanza.
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { supabase, user } = await authenticateRoute(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const locale = request.nextUrl.searchParams.get("locale") ?? "es";
  let raw: unknown = null;
  try {
    const { data } = await supabase
      .from("settings")
      .select("quick_questions")
      .eq("user_id", user.id)
      .maybeSingle();
    raw = (data as { quick_questions?: unknown } | null)?.quick_questions ?? null;
  } catch {
    // degradación: sin fila/columna todavía → defaults
  }
  return NextResponse.json({ pages: parseQuickQuestions(raw, locale) });
}
```

- [ ] **Step 4: Añadir el server action a actions.ts**

Añadir el import de la capa (junto a los imports existentes del inicio):
```ts
import { normalizeForSave } from "@/lib/quick-questions";
```

Añadir el shim (junto a `settingsBuilder`/`intentBuilder`, antes de las actions):
```ts
// Mismo shim acotado que settingsBuilder/intentBuilder (ver nota arriba):
// quick_questions es jsonb con forma { pages: string[][] }.
type QuickQuestionsBuilder = {
  update: (v: { quick_questions: { pages: string[][] } }) => { eq: (col: string, val: string) => Promise<unknown> };
};
function quickQuestionsBuilder(supabase: Awaited<ReturnType<typeof createClient>>): QuickQuestionsBuilder {
  return supabase.from("settings") as unknown as QuickQuestionsBuilder;
}
```

Añadir la action (al final del archivo o junto a las de settings):
```ts
/**
 * Guarda los accesos rápidos del chat (2 páginas de 6). Normaliza SIEMPRE a
 * 2×6 en el server (vacíos → default del locale, recorte de largo) antes de
 * persistir, así el jsonb guardado nunca queda malformado. Fire-and-forget.
 */
export async function saveQuickQuestions(pages: string[][]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const locale = await getLocale();
  const normalized = normalizeForSave(pages, locale);
  await quickQuestionsBuilder(supabase).update({ quick_questions: normalized }).eq("user_id", user.id);
}
```

- [ ] **Step 5: Run test to verify it passes + typecheck**

Run: `pnpm --filter @aluna/web exec vitest run lib/__tests__/quick-questions-route.test.ts`
Expected: PASS.

Run: `pnpm --filter @aluna/web exec tsc --noEmit`
Expected: PASS (shim tipa el update; normalizeForSave importado).

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/api/quick-questions/route.ts "apps/web/app/(app)/actions.ts" apps/web/lib/__tests__/quick-questions-route.test.ts
git commit -m "feat(chat): GET /api/quick-questions + server action saveQuickQuestions"
```

---

### Task 4: Componente `<QuickQuestions>` (chips, paginación, edición inline)

**Files:**
- Create: `apps/web/app/(app)/preguntar/quick-questions.tsx`
- Modify: `apps/web/app/(app)/preguntar/chat.module.css` (estilos nuevos)
- Modify: `apps/web/messages/es.json` y `apps/web/messages/en.json` (namespace `chat`)
- Test: `apps/web/components/__tests__/quick-questions.test.tsx`

**Interfaces:**
- Consumes: `DEFAULT_QUICK_QUESTIONS`, `localeKey` (Task 1); `saveQuickQuestions` (Task 3); GET `/api/quick-questions` (Task 3).
- Produces: `export function QuickQuestions({ onSend }: { onSend: (q: string) => void })`.

- [ ] **Step 1: Añadir claves i18n (ambos catálogos, mismas claves)**

En `apps/web/messages/es.json`, dentro de `"chat"`, añadir:
```json
    "quickEdit": "Editar",
    "quickSave": "Guardar",
    "quickCancel": "Cancelar",
    "quickRestore": "Restaurar",
    "quickPage": "Página {n} de {total}",
    "quickEditLabel": "Pregunta {n}"
```

En `apps/web/messages/en.json`, dentro de `"chat"`, añadir:
```json
    "quickEdit": "Edit",
    "quickSave": "Save",
    "quickCancel": "Cancel",
    "quickRestore": "Restore",
    "quickPage": "Page {n} of {total}",
    "quickEditLabel": "Question {n}"
```

- [ ] **Step 2: Write the failing test**

```tsx
// apps/web/components/__tests__/quick-questions.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "../../messages/es.json";
import { DEFAULT_QUICK_QUESTIONS } from "../../lib/quick-questions";

const saveMock = vi.fn().mockResolvedValue(undefined);
vi.mock("../../app/(app)/actions", () => ({ saveQuickQuestions: (p: string[][]) => saveMock(p) }));

import { QuickQuestions } from "../../app/(app)/preguntar/quick-questions";

function renderQ(onSend = vi.fn()) {
  render(
    <NextIntlClientProvider locale="es" messages={es}>
      <QuickQuestions onSend={onSend} />
    </NextIntlClientProvider>,
  );
  return onSend;
}

beforeEach(() => {
  saveMock.mockClear();
  // fetch falla → el componente se queda con los defaults ES (comportamiento probado aquí)
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
});

describe("QuickQuestions", () => {
  it("muestra los 6 chips de la página 1 y tocar uno llama onSend con su texto", async () => {
    const onSend = renderQ();
    const first = DEFAULT_QUICK_QUESTIONS.es[0][0];
    const chip = await screen.findByRole("button", { name: first });
    fireEvent.click(chip);
    expect(onSend).toHaveBeenCalledWith(first);
  });

  it("paginar a la página 2 muestra las otras 6 preguntas", async () => {
    renderQ();
    await screen.findByRole("button", { name: DEFAULT_QUICK_QUESTIONS.es[0][0] });
    // el segundo punto de paginación (aria-label "Página 2 de 2")
    fireEvent.click(screen.getByRole("button", { name: "Página 2 de 2" }));
    expect(screen.getByRole("button", { name: DEFAULT_QUICK_QUESTIONS.es[1][0] })).toBeInTheDocument();
  });

  it("el lápiz convierte los chips en inputs; Guardar persiste 2×6", async () => {
    renderQ();
    await screen.findByRole("button", { name: DEFAULT_QUICK_QUESTIONS.es[0][0] });
    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    const input = screen.getByRole("textbox", { name: "Pregunta 1" }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Mi pregunta propia" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(saveMock).toHaveBeenCalledTimes(1));
    const saved = saveMock.mock.calls[0][0] as string[][];
    expect(saved).toHaveLength(2);
    expect(saved[0]).toHaveLength(6);
    expect(saved[0][0]).toBe("Mi pregunta propia");
  });

  it("Restaurar vuelve los inputs a los defaults", async () => {
    renderQ();
    await screen.findByRole("button", { name: DEFAULT_QUICK_QUESTIONS.es[0][0] });
    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    const input = screen.getByRole("textbox", { name: "Pregunta 1" }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "cambiado" } });
    fireEvent.click(screen.getByRole("button", { name: "Restaurar" }));
    const restored = screen.getByRole("textbox", { name: "Pregunta 1" }) as HTMLInputElement;
    expect(restored.value).toBe(DEFAULT_QUICK_QUESTIONS.es[0][0]);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter @aluna/web exec vitest run components/__tests__/quick-questions.test.tsx`
Expected: FAIL — no existe `quick-questions.tsx`.

- [ ] **Step 4: Crear el componente**

```tsx
// apps/web/app/(app)/preguntar/quick-questions.tsx
"use client";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { saveQuickQuestions } from "../actions";
import { DEFAULT_QUICK_QUESTIONS, localeKey, MAX_LEN } from "@/lib/quick-questions";
import styles from "./chat.module.css";

// Accesos rápidos: 2 páginas de 6 preguntas. Tocás un chip → onSend. El lápiz
// abre edición inline (inputs) sobre la página visible; se puede paginar y
// editar la otra; Guardar persiste ambas (server action), Restaurar vuelve a
// los defaults del locale. Se auto-abastece por GET; defaults mientras carga.
export function QuickQuestions({ onSend }: { onSend: (q: string) => void }) {
  const t = useTranslations("chat");
  const locale = useLocale();
  const [pages, setPages] = useState<string[][]>(() => DEFAULT_QUICK_QUESTIONS[localeKey(locale)]);
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState(false);
  const [drafts, setDrafts] = useState<string[][]>(() => DEFAULT_QUICK_QUESTIONS[localeKey(locale)]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/quick-questions?locale=${locale}`);
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { pages?: string[][] };
        if (!cancelled && Array.isArray(data.pages)) setPages(data.pages);
      } catch {
        // best-effort: nos quedamos con los defaults ya cargados
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [locale]);

  const total = pages.length;
  const safePage = Math.min(page, total - 1);
  const shown = (editing ? drafts : pages)[safePage] ?? [];

  function startEdit() {
    setDrafts(pages.map((p) => [...p]));
    setEditing(true);
  }
  function restore() {
    setDrafts(DEFAULT_QUICK_QUESTIONS[localeKey(locale)].map((p) => [...p]));
  }
  function editChip(i: number, value: string) {
    setDrafts((d) => d.map((p, pi) => (pi === safePage ? p.map((q, qi) => (qi === i ? value : q)) : p)));
  }
  async function save() {
    setSaving(true);
    try {
      await saveQuickQuestions(drafts);
      setPages(drafts.map((p) => [...p]));
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.quickWrap}>
      <div className={styles.quickRow}>
        {shown.map((q, i) =>
          editing ? (
            <input
              key={i}
              className={styles.chipInput}
              value={q}
              maxLength={MAX_LEN}
              onChange={(e) => editChip(i, e.target.value)}
              aria-label={t("quickEditLabel", { n: i + 1 })}
            />
          ) : (
            <button key={i} type="button" className={styles.chip} onClick={() => onSend(q)}>
              {q}
            </button>
          ),
        )}
      </div>
      <div className={styles.quickBar}>
        <div className={styles.quickNav}>
          {total > 1 &&
            Array.from({ length: total }, (_, p) => (
              <button
                key={p}
                type="button"
                className={`${styles.pageDot} ${p === safePage ? styles.pageDotOn : ""}`}
                onClick={() => setPage(p)}
                aria-current={p === safePage}
                aria-label={t("quickPage", { n: p + 1, total })}
              />
            ))}
        </div>
        {editing ? (
          <div className={styles.quickActions}>
            <button type="button" className={styles.restoreBtn} onClick={restore}>
              {t("quickRestore")}
            </button>
            <button type="button" className={styles.cancelBtn} onClick={() => setEditing(false)}>
              {t("quickCancel")}
            </button>
            <button type="button" className={styles.saveBtn} onClick={() => void save()} disabled={saving}>
              {t("quickSave")}
            </button>
          </div>
        ) : (
          <button type="button" className={styles.editBtn} onClick={startEdit}>
            <span aria-hidden>✎</span> {t("quickEdit")}
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Añadir estilos a chat.module.css**

```css
/* Accesos rápidos (2 páginas de 6 chips + edición inline) */
.quickWrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 0;
}
.quickRow {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.chip {
  border: 1px solid var(--line, rgba(255, 255, 255, 0.14));
  background: var(--surface-2, rgba(255, 255, 255, 0.04));
  color: inherit;
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 0.82rem;
  line-height: 1.2;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}
.chip:hover {
  background: var(--surface-3, rgba(255, 255, 255, 0.09));
  border-color: var(--accent, rgba(255, 255, 255, 0.3));
}
.chipInput {
  flex: 1 1 45%;
  min-width: 160px;
  border: 1px solid var(--accent, rgba(255, 255, 255, 0.3));
  background: var(--surface-1, rgba(0, 0, 0, 0.2));
  color: inherit;
  border-radius: 10px;
  padding: 6px 10px;
  font: inherit;
  font-size: 0.82rem;
}
.quickBar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.quickNav {
  display: flex;
  gap: 6px;
}
.pageDot {
  width: 8px;
  height: 8px;
  padding: 0;
  border-radius: 999px;
  border: none;
  background: var(--line, rgba(255, 255, 255, 0.25));
  cursor: pointer;
}
.pageDotOn {
  background: var(--accent, rgba(255, 255, 255, 0.7));
}
.editBtn,
.saveBtn,
.cancelBtn,
.restoreBtn {
  border: 1px solid var(--line, rgba(255, 255, 255, 0.14));
  background: transparent;
  color: inherit;
  border-radius: 8px;
  padding: 4px 10px;
  font-size: 0.78rem;
  cursor: pointer;
}
.quickActions {
  display: flex;
  gap: 6px;
}
.saveBtn {
  border-color: var(--accent, rgba(255, 255, 255, 0.3));
  background: var(--accent-soft, rgba(255, 255, 255, 0.08));
}
.saveBtn:disabled {
  opacity: 0.5;
  cursor: default;
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm --filter @aluna/web exec vitest run components/__tests__/quick-questions.test.tsx`
Expected: PASS.

Run: `pnpm --filter @aluna/web exec vitest run app/__tests__/i18n.test.tsx`
Expected: PASS (paridad es/en intacta).

- [ ] **Step 7: Commit**

```bash
git add "apps/web/app/(app)/preguntar/quick-questions.tsx" "apps/web/app/(app)/preguntar/chat.module.css" apps/web/messages/es.json apps/web/messages/en.json apps/web/components/__tests__/quick-questions.test.tsx
git commit -m "feat(chat): componente QuickQuestions (chips + paginación + edición inline)"
```

---

### Task 5: Cablear `<QuickQuestions>` en `ChatView`

**Files:**
- Modify: `apps/web/app/(app)/preguntar/chat-view.tsx`
- Test: `apps/web/components/__tests__/chat-view-quick.test.tsx`

**Interfaces:**
- Consumes: `QuickQuestions` (Task 4).
- Produces: en `ChatView`, un `sendText(text: string)` reutilizable y el montaje de `<QuickQuestions onSend={(q) => void sendText(q)} />` sobre el composer.

- [ ] **Step 1: Write the failing test (integración: el chip dispara /api/chat)**

```tsx
// apps/web/components/__tests__/chat-view-quick.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "../../messages/es.json";
import { DEFAULT_QUICK_QUESTIONS } from "../../lib/quick-questions";

vi.mock("next/navigation", () => ({ useSearchParams: () => ({ get: () => null }) }));
vi.mock("../../lib/profiles/profiles-provider", () => ({ useProfiles: () => ({ active: { id: "p1" } }) }));
vi.mock("../../lib/voice", () => ({ useSpeak: () => ({ speakingId: null, toggle: vi.fn(), supported: false }) }));
vi.mock("../../app/(app)/actions", () => ({ saveQuickQuestions: vi.fn().mockResolvedValue(undefined) }));

import { ChatView } from "../../app/(app)/preguntar/chat-view";

const chatCalls: string[] = [];
beforeEach(() => {
  chatCalls.length = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).startsWith("/api/quick-questions")) {
        return new Response(JSON.stringify({ pages: DEFAULT_QUICK_QUESTIONS.es }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (String(url) === "/api/chat/thread") {
        return new Response(JSON.stringify({ threadId: null, messages: [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (String(url) === "/api/chat") {
        if (init?.body) chatCalls.push(String(init.body));
        return new Response(JSON.stringify({ available: false }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
    }),
  );
});

describe("ChatView + accesos rápidos", () => {
  it("monta los chips y tocar uno envía esa pregunta a /api/chat", async () => {
    render(
      <NextIntlClientProvider locale="es" messages={es}>
        <ChatView embedded />
      </NextIntlClientProvider>,
    );
    const first = DEFAULT_QUICK_QUESTIONS.es[0][0];
    const chip = await screen.findByRole("button", { name: first });
    fireEvent.click(chip);
    await waitFor(() => expect(chatCalls.length).toBe(1));
    expect(chatCalls[0]).toContain(first);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @aluna/web exec vitest run components/__tests__/chat-view-quick.test.tsx`
Expected: FAIL — `ChatView` aún no monta los chips (no hay botón con ese nombre).

- [ ] **Step 3: Refactor `send()` → `sendText()` y montar el componente**

En `chat-view.tsx`, añadir el import (junto a los otros imports locales):
```ts
import { QuickQuestions } from "./quick-questions";
```

Reemplazar la función `send()` (líneas ~81-139) por este par (extrae el envío a `sendText`, reutilizable por chip y por el input):
```ts
  async function sendText(raw: string) {
    const text = raw.trim();
    if (!text || st === "loading") return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setSt("loading");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ profileId: activeId, locale, messages: next, lenses, tarotCard, threadId }),
      });
      // El primer turno crea el hilo server-side; lo aprendemos del header
      // para que los turnos siguientes lo reenvíen (Fase 1B).
      const returnedThreadId = res.headers.get("x-thread-id");
      if (returnedThreadId) setThreadId(returnedThreadId);

      // Latente (sin llave) o error de validación → JSON { available:false }. Sin
      // stream que consumir: mostramos el estado dormido / de error.
      const isStream = res.body && res.headers.get("content-type")?.startsWith("text/plain");
      if (!isStream) {
        const data = (await res.json().catch(() => ({}))) as { available?: boolean };
        setSt(data.available === false ? "dormant" : "error");
        return;
      }
      if (!res.ok) {
        setSt("error");
        return;
      }

      // Stream de texto: añadimos la burbuja de Aluna vacía y le pegamos los tokens
      // a medida que llegan (efecto de tecleo).
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      let started = false;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const piece = decoder.decode(value, { stream: true });
        if (!piece) continue;
        acc += piece;
        if (!started) {
          started = true;
          setSt("idle");
          setMessages([...next, { role: "assistant", content: acc }]);
        } else {
          setMessages([...next, { role: "assistant", content: acc }]);
        }
      }
      if (!started) {
        // El stream no entregó nada (upstream cortó antes del primer byte).
        setSt("error");
      }
    } catch {
      setSt("error");
    }
  }

  function send() {
    const text = input.trim();
    if (!text || st === "loading") return;
    setInput("");
    void sendText(text);
  }
```

- [ ] **Step 4: Montar `<QuickQuestions>` sobre el composer**

Justo antes de `<div className={styles.composer}>` (línea ~195), insertar:
```tsx
      <QuickQuestions onSend={(q) => void sendText(q)} />
```

- [ ] **Step 5: Run test to verify it passes + suite web**

Run: `pnpm --filter @aluna/web exec vitest run components/__tests__/chat-view-quick.test.tsx`
Expected: PASS.

Run: `pnpm --filter @aluna/web exec tsc --noEmit`
Expected: PASS.

Run: `pnpm --filter @aluna/web exec vitest run`
Expected: PASS (sin regresiones; i18n parity verde).

- [ ] **Step 6: Commit**

```bash
git add "apps/web/app/(app)/preguntar/chat-view.tsx" apps/web/components/__tests__/chat-view-quick.test.tsx
git commit -m "feat(chat): montar accesos rápidos en ChatView (chip → envía)"
```

---

## Cierre del branch (post-Task 5, fuera del ciclo de tasks)

1. **Review final de todo el branch con Fable 5** (el modelo más capaz; Gio confirmó que NO está agotado) vía `superpowers:requesting-code-review`. Ojo especial: paridad i18n, degradación sin llave/sin migración, que los 3 montajes del chat sigan intactos, y que `sendText`/`send` no rompan el flujo de streaming existente.
2. **Cerrar el loop en el navegador** (regla Fable, caza lo que los tests no): con la app corriendo en localhost y sesión de prueba, verificar en las 3 superficies (/preguntar, panel de Perfil, panel de Hoy): los 6 chips se ven y hacen wrap cómodo en el panel angosto; paginar cambia a las otras 6; tocar un chip envía; el lápiz edita inline; Guardar persiste (recargar y siguen ahí); Restaurar vuelve a los defaults.
3. **Merge a main vía worktree efímero** (no tocar el checkout principal, que tiene sesiones paralelas + cambios sin commitear), luego actualizar memoria.

## Self-Review (hecho)

- **Cobertura del spec:** §2 defaults verbatim → Task 1; §3 persistencia (migración 0021 + action + lectura) → Tasks 2-3; §4 UI (chips/paginación/edición/restaurar) → Task 4; §5 estructura de código → Tasks 1-5; §6 tests → uno por task; "aparece en los 3 montajes" → Task 5 (auto-fetch, sin threading). Sin huecos.
- **Placeholders:** ninguno — todo el código va escrito.
- **Consistencia de tipos:** `parseQuickQuestions`/`normalizeForSave`/`DEFAULT_QUICK_QUESTIONS`/`localeKey`/`MAX_LEN` usados con la misma firma en Tasks 3-4; `QuickQuestions({ onSend })` consumido igual en Task 5; `saveQuickQuestions(pages: string[][])` mismo shape en action y componente.
