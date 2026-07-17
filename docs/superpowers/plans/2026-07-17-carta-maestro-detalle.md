# Carta maestro-detalle — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** En desktop, Carta separa técnico (izquierda: rueda + tabs + tablas) de interpretación (derecha: panel sticky que lee lo que toques); Modo Pro profundiza ambas columnas. En móvil, el bottom-sheet gana el mismo renderizador unificado.

**Architecture:** Un tipo `Selection` discriminado une todo lo tocable. Un renderizador compartido `InterpretationContent` (por `kind`) alimenta tanto el panel desktop como el bottom-sheet móvil. `carta-view.tsx` adelgaza extrayendo `positions-table.tsx` y `aspect-list.tsx`, y mueve las tabs a la columna izquierda.

**Tech Stack:** Next.js 15 App Router, React 19, CSS Modules con tokens, next-intl, vitest + React Testing Library, `@aluna/core` (glosario + tipos).

**Spec:** `docs/superpowers/specs/2026-07-17-carta-maestro-detalle-design.md`

## Global Constraints

- Worktree/rama: `carta-detalle` (desde `195d434`). NO tocar archivos de nav/admin (sesión paralela).
- Idiomas: toda cadena visible va en `apps/web/messages/es.json` + `en.json` (namespace `carta`).
- CSS: tokens de `tokens.css` (var(--sp-*), var(--text-*)); breakpoint desktop `@media (min-width: 1080px)`; ⚠️ keyframes/clases globales desde `.module.css` requieren `:global()` (lección repetida).
- Convención de código: comillas dobles, 2 espacios, comentarios en español con el mismo tono del archivo.
- No se escribe prosa nueva de glosario: solo se consume `glossaryEntry(key, locale)` de `@aluna/core`.
- Gates por tarea: test que falla → implementación → test verde → commit. Gate final: `pnpm typecheck && pnpm --filter @aluna/web test && pnpm --filter @aluna/web build`.
- Commits en español estilo repo (`feat(carta): …`), con `Co-Authored-By: Claude`.

---

### Task 1: Tipo `Selection` + glifos compartidos + claves i18n

**Files:**
- Create: `apps/web/app/(app)/carta/selection.ts`
- Create: `apps/web/app/(app)/carta/glyphs.ts`
- Modify: `apps/web/messages/es.json` (namespace `carta`)
- Modify: `apps/web/messages/en.json` (namespace `carta`)
- Test: `apps/web/app/(app)/carta/__tests__/selection.test.ts`

**Interfaces:**
- Consumes: `BodyPosition`, `Aspect` de `@aluna/core`; `ZODIAC_SIGNS`, `PLANETS` de `@aluna/core`.
- Produces: `type Selection`, `isMobileViewport(): boolean`, `SIGN_GLYPH`, `PLANET_GLYPH`, `TEXT_VS` — los usan Tasks 2–5.

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/app/(app)/carta/__tests__/selection.test.ts
import { describe, it, expect } from "vitest";
import type { Selection } from "../selection";
import { SIGN_GLYPH, PLANET_GLYPH } from "../glyphs";

describe("Selection", () => {
  it("discrimina por kind (compila y estrecha)", () => {
    const sels: Selection[] = [
      { kind: "core" },
      { kind: "body", body: { body: "sun", sign: "aquarius", degree: 15, minute: 57, second: 0, house: 11, dignity: null, retrograde: false, speed: 1.01, longitude: 315.95 } as never },
      { kind: "aspect", aspect: { a: "sun", b: "moon", aspect: "trine", orb: 1.2, applying: true, harmony: "soft" } as never },
      { kind: "house", house: 7 },
      { kind: "sign", sign: "aquarius" },
      { kind: "pattern", pattern: { type: "stellium", bodies: ["sun", "mercury", "venus"] } },
      { kind: "ascendant", sign: "pisces", degree: 26, minute: 6 },
    ];
    expect(sels).toHaveLength(7);
  });
});

describe("glifos compartidos", () => {
  it("cubre los 12 signos y los planetas", () => {
    expect(SIGN_GLYPH.aquarius).toBeTruthy();
    expect(Object.keys(SIGN_GLYPH)).toHaveLength(12);
    expect(PLANET_GLYPH.sun).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && pnpm vitest run app/\(app\)/carta/__tests__/selection.test.ts`
Expected: FAIL — "Cannot find module '../selection'"

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/web/app/(app)/carta/glyphs.ts
// Glifos compartidos de la carta (planetas y signos) con presentación de texto
// (U+FE0E: nunca emoji). Antes vivían en carta-view; ahora los comparten la
// vista, el panel de interpretación y las tablas extraídas.
import { ZODIAC_SIGNS, PLANETS } from "@aluna/core";

export const TEXT_VS = "︎"; // U+FE0E
export const SIGN_GLYPH: Record<string, string> = Object.fromEntries(
  ZODIAC_SIGNS.map((s) => [s.key, s.glyph + TEXT_VS]),
);
export const PLANET_GLYPH: Record<string, string> = Object.fromEntries(
  PLANETS.map((p) => [p.key, p.glyph + TEXT_VS]),
);
```

```ts
// apps/web/app/(app)/carta/selection.ts
// Estado unificado de selección del maestro-detalle: TODO lo tocable de la
// columna técnica produce una Selection; el panel derecho (desktop) o el
// bottom-sheet (móvil) la interpretan. Ver spec 2026-07-17.
import type { BodyPosition, Aspect } from "@aluna/core";

export type Selection =
  | { kind: "core" }
  | { kind: "body"; body: BodyPosition }
  | { kind: "aspect"; aspect: Aspect }
  | { kind: "house"; house: number }
  | { kind: "sign"; sign: string }
  | { kind: "pattern"; pattern: { type: string; bodies: string[] } }
  | { kind: "ascendant"; sign: string; degree: number; minute: number };

/** ¿Viewport móvil? (bajo el bp desktop 1080 de R4a). SSR-safe: false en servidor. */
export function isMobileViewport(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 1079px)").matches;
}
```

- [ ] **Step 4: Añadir claves i18n**

En `apps/web/messages/es.json`, dentro del objeto `"carta"`, añadir:

```json
"interpTitle": "Interpretación",
"interpHint": "Toca cualquier planeta, aspecto o casa a la izquierda para leer qué significa en tu carta.",
"interpAspectOf": "entre"
```

En `apps/web/messages/en.json`, dentro del objeto `"carta"`, añadir:

```json
"interpTitle": "Interpretation",
"interpHint": "Tap any planet, aspect, or house on the left to read what it means in your chart.",
"interpAspectOf": "between"
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd apps/web && pnpm vitest run app/\(app\)/carta/__tests__/selection.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/\(app\)/carta/selection.ts apps/web/app/\(app\)/carta/glyphs.ts apps/web/app/\(app\)/carta/__tests__/selection.test.ts apps/web/messages/es.json apps/web/messages/en.json
git commit -m "feat(carta): tipo Selection unificado + glifos compartidos + i18n del panel de interpretación"
```

---

### Task 2: `InterpretationContent` — renderizador por `kind`

**Files:**
- Create: `apps/web/app/(app)/carta/interpretation-content.tsx`
- Test: `apps/web/app/(app)/carta/__tests__/interpretation-content.test.tsx`

**Interfaces:**
- Consumes: `Selection` (Task 1), `SIGN_GLYPH`/`PLANET_GLYPH` (Task 1), `glossaryEntry(key, locale)` + `planetMeaningKey/patternMeaningKey` de `@aluna/core`, `composeBodyReading` (es/en), `BodyReadingView` (existente), `astroLabels`, `ASPECT_GLYPHS`.
- Produces:
  - `InterpretationContent({ selected, pro, coreSegs, profileName }): JSX` — `coreSegs` es el retorno de `composeCoreReading` (o `null`); `profileName` para `BodyReadingView`.
  - `selectionTitle(selected, L, t): string` — título del sheet móvil (L = `astroLabels(locale)`, t = traductor del namespace `carta`).

**Comportamiento por `kind` (contract del spec §3):**

| kind | siempre | solo con `pro` |
|---|---|---|
| `core` | párrafo tejido de `coreSegs` (b/t segs) + `interpHint` si `coreSegs` null | — |
| `body` | cabecera (glifo, nombre, signo+grado, casa, chips dignidad/℞) + **essence** de `composeBodyReading` | `BodyReadingView` completo (tiers + flow + shadow) en vez de solo essence |
| `aspect` | título "A ⟨glifo⟩ B" + cuerpo del glosario `aspect.*` | línea técnica: orbe exacto + aplicativo/separativo |
| `house` | título + cuerpo del glosario `house.N` | — |
| `sign` | glifo + título + cuerpo del glosario `sign.*` | — |
| `pattern` | título del glosario `pattern.*` + glifos de cuerpos + cuerpo | — |
| `ascendant` | glosario `point.ascendant` + "⟨signo⟩ ⟨grado⟩°⟨min⟩′" | — |

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/app/(app)/carta/__tests__/interpretation-content.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "../../../../messages/es.json";
import { InterpretationContent, selectionTitle } from "../interpretation-content";
import { astroLabels } from "@/lib/content/astrology-labels";

const SUN = { body: "sun", sign: "aquarius", degree: 15, minute: 57, second: 0, house: 11, dignity: null, retrograde: false, speed: 1.01, longitude: 315.95 } as never;
const TRINE = { a: "sun", b: "moon", aspect: "trine", orb: 1.2, applying: true, harmony: "soft" } as never;

function mount(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>{ui}</NextIntlClientProvider>,
  );
}

describe("InterpretationContent", () => {
  it("core: muestra el núcleo tejido", () => {
    mount(<InterpretationContent selected={{ kind: "core" }} pro={false}
      coreSegs={[{ t: "Tu esencia " }, { b: "brilla" }]} profileName="Gio" />);
    expect(screen.getByText(/brilla/)).toBeTruthy();
  });

  it("core sin coreSegs: invita a tocar", () => {
    mount(<InterpretationContent selected={{ kind: "core" }} pro={false} coreSegs={null} profileName="Gio" />);
    expect(screen.getByText(/Toca cualquier planeta/)).toBeTruthy();
  });

  it("body sin pro: essence sí, tiers no", () => {
    mount(<InterpretationContent selected={{ kind: "body", body: SUN }} pro={false} coreSegs={null} profileName="Gio" />);
    expect(screen.getByText(/terreno de/)).toBeTruthy();       // essence compuesta
    expect(screen.queryByRole("tab", { name: /Profunda/i })).toBeNull(); // sin selector de tier
  });

  it("body con pro: BodyReadingView completo (tiers visibles)", () => {
    mount(<InterpretationContent selected={{ kind: "body", body: SUN }} pro={true} coreSegs={null} profileName="Gio" />);
    expect(screen.getByRole("tab", { name: /Esencia/i })).toBeTruthy();
  });

  it("aspect: glosario del trígono; orbe solo con pro", () => {
    const { rerender } = mount(<InterpretationContent selected={{ kind: "aspect", aspect: TRINE }} pro={false} coreSegs={null} profileName="Gio" />);
    expect(screen.getByText(/Trígono/)).toBeTruthy();
    expect(screen.queryByText(/1\.2°/)).toBeNull();
    rerender(<NextIntlClientProvider locale="es" messages={es}>
      <InterpretationContent selected={{ kind: "aspect", aspect: TRINE }} pro={true} coreSegs={null} profileName="Gio" />
    </NextIntlClientProvider>);
    expect(screen.getByText(/1\.2°/)).toBeTruthy();
  });

  it("house / sign / pattern / ascendant: cuerpo de glosario", () => {
    const { rerender } = mount(<InterpretationContent selected={{ kind: "house", house: 7 }} pro={false} coreSegs={null} profileName="Gio" />);
    expect(screen.getByText(/espejo/)).toBeTruthy(); // house.7: "Es tu espejo"
    rerender(<NextIntlClientProvider locale="es" messages={es}>
      <InterpretationContent selected={{ kind: "sign", sign: "aquarius" }} pro={false} coreSegs={null} profileName="Gio" />
    </NextIntlClientProvider>);
    expect(screen.getByText(/Acuario/)).toBeTruthy();
    rerender(<NextIntlClientProvider locale="es" messages={es}>
      <InterpretationContent selected={{ kind: "ascendant", sign: "pisces", degree: 26, minute: 6 }} pro={false} coreSegs={null} profileName="Gio" />
    </NextIntlClientProvider>);
    expect(screen.getByText(/umbral/)).toBeTruthy(); // point.ascendant: "es umbral"
  });
});

describe("selectionTitle", () => {
  it("compone títulos por kind", () => {
    const L = astroLabels("es");
    const t = (k: string) => ({ interpTitle: "Interpretación", house: "Casa", ascendant: "Ascendente" })[k] ?? k;
    expect(selectionTitle({ kind: "core" }, L, t as never)).toBe("Interpretación");
    expect(selectionTitle({ kind: "body", body: SUN }, L, t as never)).toContain("Sol");
    expect(selectionTitle({ kind: "house", house: 7 }, L, t as never)).toContain("7");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && pnpm vitest run app/\(app\)/carta/__tests__/interpretation-content.test.tsx`
Expected: FAIL — "Cannot find module '../interpretation-content'"

- [ ] **Step 3: Write implementation**

```tsx
// apps/web/app/(app)/carta/interpretation-content.tsx
"use client";
// Renderizador ÚNICO de interpretación del maestro-detalle: recibe una
// Selection y la lee. Lo consumen el panel derecho (desktop) y el bottom-sheet
// (móvil) — una sola fuente de significado, dos marcos. No inventa prosa:
// todo sale del glosario de @aluna/core y de las lecturas compuestas.
import { useLocale, useTranslations } from "next-intl";
import { glossaryEntry, planetMeaningKey, patternMeaningKey } from "@aluna/core";
import { astroLabels, ASPECT_GLYPHS } from "@/lib/content/astrology-labels";
import { composeBodyReading as composeEs } from "@/lib/content/astrology-readings-es";
import { composeBodyReading as composeEn } from "@/lib/content/astrology-readings-en";
import { BodyReadingView } from "./body-reading";
import { PLANET_GLYPH, SIGN_GLYPH, TEXT_VS } from "./glyphs";
import type { Selection } from "./selection";
import styles from "./carta.module.css";

const pad = (n: number) => String(n).padStart(2, "0");

export function InterpretationContent({ selected, pro, coreSegs, profileName }: {
  selected: Selection;
  pro: boolean;
  coreSegs: Array<{ t?: string; b?: string }> | null;
  profileName: string;
}) {
  const t = useTranslations("carta");
  const locale = useLocale();
  const L = astroLabels(locale);
  const compose = locale === "en" ? composeEn : composeEs;

  switch (selected.kind) {
    case "core":
      return coreSegs ? (
        <div className={styles.interpBlock}>
          <span className={styles.cardH}>{t("coreReadingTitle")}</span>
          <p className={styles.readingP}>
            {coreSegs.map((s, i) => (s.b ? <b key={i}>{s.b}</b> : <span key={i}>{s.t}</span>))}
          </p>
        </div>
      ) : (
        <p className={styles.interpHint}>{t("interpHint")}</p>
      );

    case "body": {
      const b = selected.body;
      const r = compose(b.body, b.sign, b.house, b.dignity);
      return (
        <div className={styles.interpBlock}>
          <div className={styles.interpHead}>
            <span className={styles.interpGlyph}>{PLANET_GLYPH[b.body] ?? "•"}</span>
            <div>
              <div className={styles.interpName}>{L.bodies[b.body] ?? b.body}</div>
              <div className={styles.interpSub}>
                {SIGN_GLYPH[b.sign]} {L.signs[b.sign]} · {b.degree}°{pad(b.minute)}′ · {t("house")} {b.house}
                {b.dignity && <span className={`chip ${styles.tag}`}> {L.dignities[b.dignity]}</span>}
                {b.retrograde && <span className={`chip ${styles.tag} ${styles.tagWarn}`}> ℞</span>}
              </div>
            </div>
          </div>
          {r && (pro
            ? <BodyReadingView base={r} body={b.body} sign={b.sign} house={b.house} dignity={b.dignity} profileName={profileName} />
            : <p className={styles.brEssence}>{r.essence}</p>)}
        </div>
      );
    }

    case "aspect": {
      const a = selected.aspect;
      const entry = glossaryEntry(`aspect.${a.aspect}`, locale);
      return (
        <div className={styles.interpBlock}>
          <div className={styles.interpHead}>
            <span className={styles.interpGlyph}>{(ASPECT_GLYPHS[a.aspect] ?? "") + TEXT_VS}</span>
            <div>
              <div className={styles.interpName}>{entry?.title ?? L.aspects[a.aspect]}</div>
              <div className={styles.interpSub}>
                {PLANET_GLYPH[a.a]} {L.bodies[a.a]} {t("interpAspectOf")} {PLANET_GLYPH[a.b]} {L.bodies[a.b]}
              </div>
            </div>
          </div>
          {entry && <p className={styles.interpBody}>{entry.body}</p>}
          {pro && (
            <p className={styles.interpTech}>
              {t("orb")} {a.orb.toFixed(1)}° · {a.applying ? t("applying") : t("separating")}
            </p>
          )}
        </div>
      );
    }

    case "house": {
      const entry = glossaryEntry(`house.${selected.house}`, locale);
      return entry && (
        <div className={styles.interpBlock}>
          <div className={styles.interpName}>{entry.title}</div>
          <p className={styles.interpBody}>{entry.body}</p>
        </div>
      );
    }

    case "sign": {
      const entry = glossaryEntry(`sign.${selected.sign}`, locale);
      return (
        <div className={styles.interpBlock}>
          <div className={styles.interpHead}>
            <span className={styles.interpGlyph}>{SIGN_GLYPH[selected.sign]}</span>
            <div className={styles.interpName}>{entry?.title ?? L.signs[selected.sign]}</div>
          </div>
          {entry && <p className={styles.interpBody}>{entry.body}</p>}
        </div>
      );
    }

    case "pattern": {
      const p = selected.pattern;
      const entry = glossaryEntry(patternMeaningKey(p.type), locale);
      return (
        <div className={styles.interpBlock}>
          <div className={styles.interpName}>{entry?.title ?? L.patterns[p.type]}</div>
          <div className={styles.interpSub}>{p.bodies.map((k) => PLANET_GLYPH[k] ?? k).join(" ")}</div>
          {entry && <p className={styles.interpBody}>{entry.body}</p>}
        </div>
      );
    }

    case "ascendant": {
      const entry = glossaryEntry("point.ascendant", locale);
      return (
        <div className={styles.interpBlock}>
          <div className={styles.interpHead}>
            <span className={styles.interpGlyph}>{SIGN_GLYPH[selected.sign]}</span>
            <div>
              <div className={styles.interpName}>{entry?.title ?? t("ascendant")}</div>
              <div className={styles.interpSub}>
                {L.signs[selected.sign]} · {selected.degree}°{pad(selected.minute)}′
              </div>
            </div>
          </div>
          {entry && <p className={styles.interpBody}>{entry.body}</p>}
        </div>
      );
    }
  }
}

/** Título del bottom-sheet móvil para una Selection (el panel desktop usa su propia cabecera). */
export function selectionTitle(
  selected: Selection,
  L: ReturnType<typeof astroLabels>,
  t: (k: string) => string,
): string {
  switch (selected.kind) {
    case "core": return t("interpTitle");
    case "body": return `${PLANET_GLYPH[selected.body.body] ?? ""} ${L.bodies[selected.body.body] ?? selected.body.body}`.trim();
    case "aspect": return `${L.bodies[selected.aspect.a]} ${(ASPECT_GLYPHS[selected.aspect.aspect] ?? "")}${TEXT_VS} ${L.bodies[selected.aspect.b]}`;
    case "house": return `${t("house")} ${selected.house}`;
    case "sign": return L.signs[selected.sign] ?? selected.sign;
    case "pattern": return L.patterns[selected.pattern.type] ?? selected.pattern.type;
    case "ascendant": return t("ascendant");
  }
}
```

Nota: `glossaryEntry("sign.aquarius", "es")` existe (glosario ~131 entradas); si algún patrón no tiene entrada (`pattern.grandcross` pendiente de productor), el render cae a `L.patterns[type]` sin cuerpo — comportamiento aceptado.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && pnpm vitest run app/\(app\)/carta/__tests__/interpretation-content.test.tsx`
Expected: PASS (7 tests). Si falla por textos exactos del glosario, ajustar el matcher al texto real (leerlo de `packages/core/src/glossary/entries-es.ts`), NUNCA cambiar el glosario.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/\(app\)/carta/interpretation-content.tsx apps/web/app/\(app\)/carta/__tests__/interpretation-content.test.tsx
git commit -m "feat(carta): InterpretationContent — renderizador único por kind con profundidad Pro"
```

---

### Task 3: Tablas técnicas extraídas y seleccionables — `positions-table.tsx` + `aspect-list.tsx`

**Files:**
- Create: `apps/web/app/(app)/carta/positions-table.tsx`
- Create: `apps/web/app/(app)/carta/aspect-list.tsx`
- Test: `apps/web/app/(app)/carta/__tests__/technical-tables.test.tsx`

**Interfaces:**
- Consumes: `Selection` (Task 1), glifos (Task 1).
- Produces:
  - `PositionsTable({ bodies, pro, onSelect }: { bodies: BodyPosition[]; pro: boolean; onSelect: (s: Selection) => void })`
  - `AspectList({ aspects, pro, onSelect, transit }: { aspects: Aspect[]; pro: boolean; onSelect: (s: Selection) => void; transit?: boolean })` — `transit` reusa el rótulo "tu ⟨planeta⟩" del Clima.
- Las celdas **cuerpo / signo / casa** de cada fila de posiciones disparan `onSelect` con `body` / `sign` / `house`; la fila de aspecto entera dispara `aspect`. Se retiran los envoltorios `<Meaning>` de esas celdas (la selección reemplaza al mini-sheet; `Meaning` sigue en términos sueltos como orbe/℞ fuera de las tablas).
- **Pro a la izquierda:** columna dignidad+℞ (posiciones) y celda de orbe (aspectos) solo con `pro`.

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/app/(app)/carta/__tests__/technical-tables.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "../../../../messages/es.json";
import { PositionsTable } from "../positions-table";
import { AspectList } from "../aspect-list";

const SUN = { body: "sun", sign: "aquarius", degree: 15, minute: 57, second: 0, house: 11, dignity: "exile", retrograde: false, speed: 1.01, longitude: 315.95 } as never;
const TRINE = { a: "sun", b: "moon", aspect: "trine", orb: 1.2, applying: true, harmony: "soft" } as never;

const wrap = (ui: React.ReactElement) =>
  render(<NextIntlClientProvider locale="es" messages={es}>{ui}</NextIntlClientProvider>);

describe("PositionsTable", () => {
  it("selecciona body / sign / house desde las celdas", () => {
    const onSelect = vi.fn();
    wrap(<PositionsTable bodies={[SUN]} pro={false} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: /Sol/ }));
    expect(onSelect).toHaveBeenLastCalledWith({ kind: "body", body: SUN });
    fireEvent.click(screen.getByRole("button", { name: /Acuario/ }));
    expect(onSelect).toHaveBeenLastCalledWith({ kind: "sign", sign: "aquarius" });
    fireEvent.click(screen.getByRole("button", { name: /Casa 11/ }));
    expect(onSelect).toHaveBeenLastCalledWith({ kind: "house", house: 11 });
  });

  it("dignidad solo con pro", () => {
    const { rerender } = wrap(<PositionsTable bodies={[SUN]} pro={false} onSelect={() => {}} />);
    expect(screen.queryByText(/Exilio/)).toBeNull();
    rerender(<NextIntlClientProvider locale="es" messages={es}>
      <PositionsTable bodies={[SUN]} pro={true} onSelect={() => {}} />
    </NextIntlClientProvider>);
    expect(screen.getByText(/Exilio/)).toBeTruthy();
  });
});

describe("AspectList", () => {
  it("fila entera selecciona el aspecto; orbe solo con pro", () => {
    const onSelect = vi.fn();
    const { rerender } = wrap(<AspectList aspects={[TRINE]} pro={false} onSelect={onSelect} />);
    expect(screen.queryByText(/1\.2°/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Trígono/ }));
    expect(onSelect).toHaveBeenLastCalledWith({ kind: "aspect", aspect: TRINE });
    rerender(<NextIntlClientProvider locale="es" messages={es}>
      <AspectList aspects={[TRINE]} pro={true} onSelect={onSelect} />
    </NextIntlClientProvider>);
    expect(screen.getByText(/1\.2°/)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && pnpm vitest run app/\(app\)/carta/__tests__/technical-tables.test.tsx`
Expected: FAIL — módulos inexistentes.

- [ ] **Step 3: Write implementation**

```tsx
// apps/web/app/(app)/carta/positions-table.tsx
"use client";
// Tabla técnica de posiciones (columna izquierda del maestro-detalle). Cada
// celda es un disparador de selección: cuerpo → body, signo → sign, casa →
// house. Reemplaza los <Meaning> celda-a-celda: el significado ahora vive en
// el panel derecho (o el sheet móvil), no en un mini-sheet por término.
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import type { BodyPosition } from "@aluna/core";
import { astroLabels } from "@/lib/content/astrology-labels";
import { PLANET_GLYPH, SIGN_GLYPH } from "./glyphs";
import type { Selection } from "./selection";
import styles from "./carta.module.css";

const pad = (n: number) => String(n).padStart(2, "0");
const dms = (b: BodyPosition) => `${b.degree}°${pad(b.minute)}′${pad(b.second)}″`;

export function PositionsTable({ bodies, pro, onSelect }: {
  bodies: BodyPosition[]; pro: boolean; onSelect: (s: Selection) => void;
}) {
  const t = useTranslations("carta");
  const L = astroLabels(useLocale());
  return (
    <div className={styles.posTable}>
      {bodies.map((b) => (
        <div key={b.body} className={styles.posRow}>
          <button type="button" className={styles.selCell} onClick={() => onSelect({ kind: "body", body: b })}>
            <span className={styles.posBody}>{PLANET_GLYPH[b.body] ?? "•"} {L.bodies[b.body] ?? b.body}</span>
          </button>
          <button type="button" className={styles.selCell} onClick={() => onSelect({ kind: "sign", sign: b.sign })}>
            <span className={styles.posSign}>{SIGN_GLYPH[b.sign]} {dms(b)}</span>
          </button>
          <button type="button" className={styles.selCell} onClick={() => onSelect({ kind: "house", house: b.house })}>
            <span className={styles.posHouse}>{t("house")} {b.house}</span>
          </button>
          {pro && (
            <span className={styles.posDign}>
              {b.dignity ? L.dignities[b.dignity] : ""}
              {b.retrograde ? " ℞" : ""}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
```

```tsx
// apps/web/app/(app)/carta/aspect-list.tsx
"use client";
// Aspectario técnico (columna izquierda). La fila entera selecciona el
// aspecto; el orbe/aplicativo es detalle Pro. `transit` reusa la voz del
// Clima ("tu Luna") para tránsito-a-natal.
import { useTranslations, useLocale } from "next-intl";
import type { Aspect } from "@aluna/core";
import { astroLabels, ASPECT_GLYPHS } from "@/lib/content/astrology-labels";
import { PLANET_GLYPH, TEXT_VS } from "./glyphs";
import type { Selection } from "./selection";
import styles from "./carta.module.css";

export function AspectList({ aspects, pro, onSelect, transit }: {
  aspects: Aspect[]; pro: boolean; onSelect: (s: Selection) => void; transit?: boolean;
}) {
  const t = useTranslations("carta");
  const L = astroLabels(useLocale());
  return (
    <div className={styles.aspList}>
      {aspects.map((a, i) => (
        <button key={i} type="button"
          className={`${styles.aspRow} ${styles.selRow} ${styles[`harm_${a.harmony}`] ?? ""}`}
          onClick={() => onSelect({ kind: "aspect", aspect: a })}>
          <span className={styles.aspPair}>
            {PLANET_GLYPH[a.a]} <span className={styles.aspGlyph}>{(ASPECT_GLYPHS[a.aspect] ?? "") + TEXT_VS}</span> {PLANET_GLYPH[a.b]}
          </span>
          <span className={styles.aspName}>
            {transit
              ? <>{L.bodies[a.a]} {L.aspects[a.aspect]} {t("yourPossessive")} {L.bodies[a.b]}</>
              : L.aspects[a.aspect]}
          </span>
          {pro && (
            <span className={styles.aspOrb}>
              {a.orb.toFixed(1)}° · {a.applying ? t("applying") : t("separating")}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
```

En `carta.module.css` añadir (junto a `.posRow`):

```css
/* celdas/filas seleccionables del maestro-detalle: botones desnudos que
   heredan la tipografía de la tabla; el foco visible lo da el anillo acc */
.selCell { background: none; border: 0; padding: 0; font: inherit; color: inherit; text-align: left; cursor: pointer; }
.selCell:hover { color: var(--acc-text); }
.selRow { background: none; border: 0; padding: 0; font: inherit; color: inherit; text-align: left; cursor: pointer; width: 100%; }
.selCell:focus-visible, .selRow:focus-visible { outline: 2px solid rgba(var(--acc-rgb), 0.6); outline-offset: 2px; border-radius: 6px; }
```

Nota: `.aspRow` como `<button>` conserva su `display: grid` (la clase lo define); el reset de `.selRow` solo neutraliza el chrome de botón.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && pnpm vitest run app/\(app\)/carta/__tests__/technical-tables.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/\(app\)/carta/positions-table.tsx apps/web/app/\(app\)/carta/aspect-list.tsx apps/web/app/\(app\)/carta/__tests__/technical-tables.test.tsx apps/web/app/\(app\)/carta/carta.module.css
git commit -m "feat(carta): tablas técnicas extraídas y seleccionables — posiciones y aspectario con detalle Pro"
```

---

### Task 4: Recableado de `carta-view.tsx` — selección unificada, tabs a la izquierda, sheet unificado

**Files:**
- Modify: `apps/web/app/(app)/carta/carta-view.tsx` (reescritura mayor)
- Modify: `apps/web/app/(app)/carta/__tests__/meaning-wiring.test.tsx` (adaptar a las tablas nuevas)
- Test: `apps/web/app/(app)/carta/__tests__/carta-selection.test.tsx`

**Interfaces:**
- Consumes: todo lo anterior. `ChartWheel.onSelect: (b: BodyPosition) => void` NO cambia (adaptador).
- Produces: el DOM nuevo que Task 5 estiliza:

```
deskCols
├─ leftCol                      ← columna técnica (scrollea)
│  ├─ wheelCol (card)           ← rueda + solar + hint + ctrlRows(+proToggle)
│  └─ techCard (card)           ← ChartTabs + panes técnicos:
│     ├─ pane nucleo: BigThree(tappables) + patrones(chips tappables) + balPair
│     ├─ pane posiciones: PositionsTable + {pro && cabecera técnica}
│     ├─ pane aspectos: AspectList natal + (kind=transits: AspectList transit)
│     └─ pane balance: Balance ×2 + {pro && distGrid}
└─ interpCol                    ← panel interpretación (sticky, desktop-only)
   └─ InterpretationPanel: cabecera interpTitle + InterpretationContent
```

**Cambios de comportamiento clave:**

1. Estados: `const [selected, setSelected] = useState<Selection>({ kind: "core" });` y `const [sheetSel, setSheetSel] = useState<Selection | null>(null);` (reemplaza `sheet: BodyPosition | null`).
2. Router de selección único:

```tsx
  // Toda la columna técnica pasa por acá: desktop pinta el panel derecho;
  // móvil abre el sheet con el MISMO renderizador (spec §5).
  const select = (s: Selection) => {
    if (isMobileViewport()) setSheetSel(s);
    else setSelected(s);
  };
```

3. `ChartWheel onSelect={(b) => select({ kind: "body", body: b })}`.
4. BigThree: envolver cada `BigCard` en un botón sin chrome (`className={styles.selRow}`) — Sol/Luna → `select({kind:"body", body})`, Asc → `select({kind:"ascendant", sign: ascSign, degree: ascPos?.degree ?? 0, minute: ascPos?.minute ?? 0})`. Quitar los `<Meaning>` internos de `BigCard` (el significado va al panel).
5. Chips de patrones (nucleo): `<button className={`chip ${styles.chip} ${styles.selRow}`} onClick={() => select({ kind: "pattern", pattern: p })}>` — quitar `<Meaning>` internos.
6. El bloque `coreSegs` (`section.reading`) se ELIMINA del pane nucleo (vive en el panel derecho como default). `coreHint` se elimina (lo reemplaza `interpHint` del panel).
7. Las secciones Posiciones/Aspectos/Patrones dejan el contenedor `.pro` (que desaparece): las tablas viven en sus panes SIEMPRE (desktop las filtra por tab); en móvil el apilado completo queda visible siempre y `pro` controla solo la profundidad (dignidades/orbes/distGrid/tech). El toggle móvil `.proToggleMobile` se mantiene.
8. Sheet unificado:

```tsx
      <BottomSheet open={!!sheetSel} onClose={() => setSheetSel(null)} center
        title={sheetSel ? selectionTitle(sheetSel, L, t) : ""}>
        {sheetSel && (
          <InterpretationContent selected={sheetSel} pro={pro} coreSegs={coreSegs} profileName={active.name} />
        )}
      </BottomSheet>
```

   (El contenido bespoke del sheet viejo — sheetBig/sheetSign/sheetMeta + BodyReadingView — se borra: `InterpretationContent` con `kind: "body"` lo cubre; en móvil el sheet muestra el BodyReadingView completo cuando `pro`; sin pro, essence.)
9. El panel derecho:

```tsx
          <div className={styles.interpCol}>
            <div className={`card ${styles.interpPanel}`}>
              <span className={styles.cardH}>{t("interpTitle")}</span>
              <InterpretationContent selected={selected} pro={pro} coreSegs={coreSegs} profileName={active.name} />
            </div>
          </div>
```

10. Glifos: importar de `./glyphs` (borrar las constantes locales `TEXT_VS/SIGN_GLYPH/PLANET_GLYPH`).
11. La "cabecera técnica" (`tech`: UT/juliano/zodiaco/casas) queda `{pro &&}` dentro del pane posiciones; `distGrid` queda `{pro &&}` dentro del pane balance (como hoy).

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/app/(app)/carta/__tests__/carta-selection.test.tsx
// Integración del maestro-detalle: tocar en la columna técnica actualiza el
// panel de interpretación (desktop). matchMedia se burla como desktop.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
// Reusar el harness de meaning-wiring.test.tsx: mismos mocks de useProfiles,
// fetch de /api/chart (fixture de carta) y NextIntlClientProvider. Copiar su
// setup literal; solo cambia matchMedia:
beforeEach(() => {
  vi.stubGlobal("matchMedia", (q: string) => ({
    matches: false, media: q, addEventListener: () => {}, removeEventListener: () => {},
  })); // matches:false para "(max-width: 1079px)" = desktop
});

describe("CartaView maestro-detalle", () => {
  it("arranca con el núcleo tejido en el panel", async () => {
    // render CartaView con el harness…
    expect(await screen.findByText(/Interpretación/)).toBeTruthy();
  });

  it("clic en fila de posiciones → panel muestra ese cuerpo", async () => {
    // ir a tab Posiciones, clic en Sol, esperar essence en el panel
  });

  it("Modo Pro revela dignidades en la tabla y tiers en el panel", async () => {
    // activar toggle, asertar columna dignidad + rol tab Esencia
  });
});
```

(El cuerpo exacto de los tests se completa copiando el harness real de `meaning-wiring.test.tsx` — fixture del chart incluido. El implementador DEBE leer ese archivo primero.)

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && pnpm vitest run app/\(app\)/carta/__tests__/carta-selection.test.tsx`
Expected: FAIL — el panel no existe aún en CartaView.

- [ ] **Step 3: Rewire carta-view.tsx**

Aplicar los 11 cambios del contrato de arriba. El archivo queda ~350 líneas (BigCard/Balance/BalanceRow se conservan al final tal cual, sin `<Meaning>` en BigCard).

- [ ] **Step 4: Adaptar meaning-wiring.test.tsx**

Ese test verifica los `<Meaning>` de la carta. Los que se retiraron (celdas de tablas, BigCard, chips de patrones) ya no aplican: actualizar las aserciones a los que quedan (orbe/aplicativo/℞ en detalle Pro del panel, kindHint, etc.) y añadir aserción de que las celdas ahora son botones de selección.

- [ ] **Step 5: Run ALL carta tests**

Run: `cd apps/web && pnpm vitest run app/\(app\)/carta`
Expected: PASS completo (selection, interpretation-content, technical-tables, carta-selection, meaning-wiring adaptado, chart-controls, chart-tabs, carta-balance, chart-wheel).

- [ ] **Step 6: Commit**

```bash
git add -A apps/web/app/\(app\)/carta
git commit -m "feat(carta): maestro-detalle cableado — selección unificada, tabs a la izquierda, sheet móvil unificado"
```

---

### Task 5: CSS del layout — izquierda scrollea, derecha sticky

**Files:**
- Modify: `apps/web/app/(app)/carta/carta.module.css`

**Interfaces:**
- Consumes: clases nuevas del DOM de Task 4 (`.leftCol`, `.techCard`, `.interpCol`, `.interpPanel`, `.interpBlock`, `.interpHead`, `.interpGlyph`, `.interpName`, `.interpSub`, `.interpBody`, `.interpTech`, `.interpHint`).
- Produces: layout final desktop + guardas móvil.

- [ ] **Step 1: Base móvil (fuera del media query)**

```css
/* ---- Maestro-detalle ---- */
/* móvil: el panel derecho no existe (el sheet toma su lugar); la columna
   técnica apila como siempre */
.interpCol { display: none; }
.techCard { display: contents; } /* móvil: los panes fluyen sueltos como hoy */
.interpBlock { display: flex; flex-direction: column; gap: var(--sp-3); text-align: left; }
.interpHead { display: flex; align-items: center; gap: var(--sp-3); }
.interpGlyph { font-family: var(--font-display); font-size: var(--text-2xl); color: var(--acc-text); line-height: 1; }
.interpName { font-family: var(--font-display); font-size: var(--text-lg); color: var(--ink); }
.interpSub { font-size: var(--text-xs); color: var(--soft); margin-top: 2px; }
.interpBody { margin: 0; font-size: var(--text-sm); line-height: 1.65; color: var(--soft); }
.interpTech { margin: 0; font-size: var(--text-2xs); color: var(--soft); font-variant-numeric: tabular-nums; border-top: 1px solid var(--line); padding-top: var(--sp-2); }
.interpHint { margin: 0; font-style: italic; font-size: var(--text-sm); color: var(--soft); text-align: center; padding: var(--sp-5) 0; }
```

- [ ] **Step 2: Desktop (dentro de `@media (min-width: 1080px)`)**

Reemplazar las reglas de `.wheelCol` sticky y `.readCol` por:

```css
  .deskCols { display: grid; grid-template-columns: 11fr 9fr; gap: var(--sp-6); align-items: start; }
  .leftCol { display: flex; flex-direction: column; gap: var(--sp-4); }
  .wheelCol { position: static; } /* la rueda ya no es sticky: ahora lo fijo es la interpretación */
  .techCard {
    display: block; border: 1px solid var(--line); border-radius: var(--radius-lg);
    background: var(--surface); backdrop-filter: blur(10px); overflow: hidden;
  }
  .techCard .pane { display: none; padding: var(--sp-4); }
  .techCard .paneOn { display: block; }
  .interpCol { display: block; position: sticky; top: 84px; /* header 66px + respiro (mismo valor que tenía la rueda) */ }
  .interpPanel { display: flex; flex-direction: column; gap: var(--sp-3); max-height: calc(100vh - 100px); overflow-y: auto; }
```

Y borrar las reglas viejas que quedaron sin consumidor: `.readCol`, `.pro` (contenedor), `.pro:not([data-pro])` (ambas apariciones — la lámina ya no existe), `.sheet/.sheetBig/.sheetSign/.sheetMeta` si el sheet unificado ya no las usa. Conservar `.dtabs/.dtab` (ahora dentro de `.techCard`; en móvil siguen `display:none`).

⚠️ Móvil regresión-cero: con `.pro` eliminado, las secciones técnicas del apilado móvil quedan SIEMPRE visibles (antes las ocultaba el toggle). Decisión del spec §5: en móvil "el toggle Pro sigue revelando la lámina como hoy" → para honrarlo, envolver los panes posiciones/aspectos/balance-extra móviles en un `div` con `data-pro={pro || undefined}` y clase `.mobileLamina`:

```css
.mobileLamina { display: contents; }
@media (max-width: 1079px) {
  .mobileLamina:not([data-pro]) { display: none; }
}
```

(En desktop `display: contents` la vuelve transparente y las tabs mandan.)

- [ ] **Step 3: Verificación visual en navegador (obligatoria — lección biblioteca-visual)**

1. `pnpm dev -p 3007` ya corre en este worktree.
2. Abrir `http://localhost:3007/carta` logueado (cuenta de prueba), ventana ≥1080px.
3. Checklist: dos columnas visibles · panel derecho sticky al scrollear · arranca con Núcleo tejido · clic en planeta de la rueda → panel cambia · clic en fila de posiciones (cuerpo/signo/casa) → panel cambia · clic en aspecto → glosario del aspecto · **toggle Pro → dignidades+orbes aparecen a la izquierda Y tiers/orbe a la derecha (efecto inmediato visible)** · tema claro y oscuro · ventana angosta → una columna, tocar abre sheet, toggle Pro muestra/oculta lámina.
4. Capturar `.dev-shots/carta-maestro-detalle.png` (y móvil) como evidencia.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/\(app\)/carta/carta.module.css
git commit -m "feat(carta): layout maestro-detalle — técnica scrollea a la izquierda, interpretación sticky a la derecha"
```

---

### Task 6: Gate final

- [ ] **Step 1: Typecheck + tests completos + build**

Run (raíz del worktree):
```bash
pnpm typecheck && pnpm --filter @aluna/web test && pnpm --filter @aluna/web build
```
Expected: 0 errores TS · suite completa verde (525+ existentes + nuevos) · build EXIT=0.

- [ ] **Step 2: Barrido de regresión de las otras rutas**

En el navegador: `/hoy`, `/numeros`, `/pilares`, `/horoscopo`, `/tarot` cargan sin error de consola (el cambio toca `glyphs`/CSS solo dentro de carta, pero el barrido es barato).

- [ ] **Step 3: Commit final si hubo ajustes + reporte**

Reportar a Gio: capturas, qué quedó Pro-gated en cada columna, y ofrecer merge a `diseno-2col`/main vía superpowers:finishing-a-development-branch (auto-push autorizado en este repo una vez mergeado por la vía acordada).

---

## Self-review (hecho)

- **Cobertura del spec:** §1 columnas → T4/T5 · §2 selección → T1/T4 · §3 fuentes → T2 · §4 Pro ambas → T2 (derecha) + T3 (izquierda) + T4 (cableado) · §5 móvil → T4 (sheet) + T5 (mobileLamina) · §6 estructura → T2/T3/T4 · §7 tests → T1–T4.
- **Placeholders:** el único punto abierto es el harness de `carta-selection.test.tsx`, que se copia de `meaning-wiring.test.tsx` (existe y se nombra como fuente obligada) — aceptado como referencia, no como TBD.
- **Consistencia de tipos:** `Selection` idéntico en T1/T2/T3/T4; `onSelect: (s: Selection) => void` uniforme; `InterpretationContent` misma firma en T2/T4; `selectionTitle(sel, L, t)` T2/T4.
