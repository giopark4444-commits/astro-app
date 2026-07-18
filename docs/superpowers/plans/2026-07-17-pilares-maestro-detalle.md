# Pilares maestro-detalle — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/pilares` adopta el patrón maestro-detalle de `/carta`: izquierda = todo lo técnico tocable (4 pilares + balance + lámina bajo tabs), derecha = panel sticky de interpretación (default: Lectura de tus pilares) que reacciona a lo tocado; Modo Pro vuelve a desktop y profundiza AMBAS columnas con efecto inmediato en el aterrizaje.

**Architecture:** Tipo `PilarSelection` discriminado + renderizador único `PilaresInterpretation` (panel desktop y bottom-sheet móvil). `pillar-column.tsx`/`pro-lamina.tsx` ganan `onSelect`; `pilares-view.tsx` orquesta `selected`/`sheetSel`/`select()`. El CSS ya trae `deskCols`+sticky+`data-pro` — se re-reparte a 11fr/9fr con la interpretación sticky (espejo de `carta.module.css`).

**Tech Stack:** Next.js 15 App Router, React 19, CSS Modules + tokens, next-intl, vitest + RTL, `@aluna/core` (glosario `bazi.*`, `composeBaziReading`, `BaziReadingView` existente con tiers).

**Spec:** `docs/superpowers/specs/2026-07-17-pilares-maestro-detalle-design.md`
**Referencia del patrón (LEER antes de implementar):** `apps/web/app/(app)/carta/{selection.ts, interpretation-content.tsx, carta-view.tsx}` — misma rama, ya en main… **OJO: carta-detalle NO está en esta rama**; la referencia del patrón es el SPEC de carta + este plan. No intentes importar nada desde `app/(app)/carta/` (allí no existen esos archivos en esta rama): el patrón se REPLICA con archivos propios de pilares.

## Global Constraints

- Worktree/rama: `lentes-detalle` (desde `origin/main` `6350a3a`). NO tocar `bottom-nav.tsx`, `top-nav.tsx`, `lib/admin/*`, carpetas de otros lentes (`carta/`, `tarot/`, `horoscopo/`, `numeros/`, `hoy/`), ni `packages/core` (solo LEER).
- Toda cadena visible → `apps/web/messages/es.json` + `en.json`, namespace `pilares`, al final del objeto, sin reordenar.
- CSS: tokens (`var(--sp-*)`, `--text-*`, `--acc-rgb`); breakpoint `@media (min-width: 1080px)`; los comentarios de calibración existentes en `pilares.module.css` se conservan donde sigan aplicando; ⚠️ clase/keyframe global desde `.module.css` → `:global()`.
- Convención: comillas dobles, 2 espacios, comentarios en español.
- Prosa: SOLO `composeBaziReading`/`BaziReadingView`/glosario `glossaryEntry(key, locale)` existentes. Regla dura: **cablear selección únicamente donde `glossaryEntry` resuelve la clave; si la entrada no existe, conservar el `<Meaning>` actual tal cual** (hay claves sin productor).
- Gates por tarea: test RED → implementación → GREEN → commit (`Co-Authored-By: Claude <noreply@anthropic.com>`). NO correr `next build` hasta el gate final (pisa el `.next` del dev server). Build final con `NODE_OPTIONS=--max-old-space-size=16384` (la app OOM con 8192).
- Contrato Pro (spec §4): OFF desktop = esencial (pilares con dios visible, SIN troncos ocultos; balance; lámina solo tabs Na Yin/Fuerza/Favorables; switch de escritura oculto). ON = todo (troncos ocultos, tabs 大運/12 etapas/interacciones/estrellas, switch, panel derecho profundo). **Efecto inmediato en el aterrizaje: test dedicado.**
- Móvil: paradigma intacto (lámina tras el toggle vía `data-pro`, igual que hoy); tocar abre el sheet unificado; la card "Lectura de tus pilares" SIGUE visible en móvil (hoy lo está — no puede regresionar).

---

### Task 1: `selection.ts` + claves i18n del panel

**Files:**
- Create: `apps/web/app/(app)/pilares/selection.ts`
- Modify: `apps/web/messages/es.json` (namespace `pilares`, al final)
- Modify: `apps/web/messages/en.json` (ídem)
- Test: `apps/web/app/(app)/pilares/__tests__/selection.test.ts`

**Interfaces:**
- Consumes: `Pillar`, `TenGod` de `@aluna/core`.
- Produces (Tasks 2-4 dependen de esto, EXACTO):

```ts
export type PillarPos = "year" | "month" | "day" | "hour";
export type PilarSelection =
  | { kind: "reading" }
  | { kind: "pillar"; which: PillarPos; pillar: Pillar }
  | { kind: "element"; element: "wood" | "fire" | "earth" | "metal" | "water"; count: number }
  | { kind: "decade"; glyph: string; god: TenGod; nayinLabel: string; startYear: number; startAge: number }
  | { kind: "term"; key: string };
export function isMobileViewport(): boolean;
```

(Los kinds stem/branch/god/star/etapa del spec §2 se cubren con `term` + clave de glosario — misma colección que hoy abren los `<Meaning>`. `pillar` y `decade` llevan payload porque su cabecera técnica necesita datos, no solo prosa.)

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/app/(app)/pilares/__tests__/selection.test.ts
import { describe, it, expect } from "vitest";
import type { PilarSelection } from "../selection";

describe("PilarSelection", () => {
  it("discrimina por kind (compila y estrecha)", () => {
    const sels: PilarSelection[] = [
      { kind: "reading" },
      { kind: "pillar", which: "day", pillar: { stem: 0, branch: 0 } as never },
      { kind: "element", element: "wood", count: 3 },
      { kind: "decade", glyph: "甲子", god: "peer", nayinLabel: "Oro en el mar", startYear: 1998, startAge: 8 },
      { kind: "term", key: "bazi.term.daymaster" },
    ];
    expect(sels).toHaveLength(5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && pnpm vitest run "app/(app)/pilares/__tests__/selection.test.ts"`
Expected: FAIL — "Cannot find module '../selection'"

- [ ] **Step 3: Write implementation**

```ts
// apps/web/app/(app)/pilares/selection.ts
// Estado unificado de selección del maestro-detalle de Pilares: TODO lo tocable
// de la columna técnica produce una PilarSelection; el panel derecho (desktop)
// o el bottom-sheet (móvil) la interpretan. Espejo del patrón de /carta
// (rama carta-detalle) con los kinds propios de Ba Zi. Ver spec 2026-07-17.
import type { Pillar, TenGod } from "@aluna/core";

export type PillarPos = "year" | "month" | "day" | "hour";

export type PilarSelection =
  | { kind: "reading" }
  | { kind: "pillar"; which: PillarPos; pillar: Pillar }
  | { kind: "element"; element: "wood" | "fire" | "earth" | "metal" | "water"; count: number }
  | { kind: "decade"; glyph: string; god: TenGod; nayinLabel: string; startYear: number; startAge: number }
  | { kind: "term"; key: string };

/** ¿Viewport móvil? (bajo el bp desktop 1080). SSR-safe: false en servidor.
 *  Duplicación consciente con carta/selection.ts (otra rama) — si ambas
 *  aterrizan en main, extraer a lib/viewport.ts. */
export function isMobileViewport(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 1079px)").matches;
}
```

- [ ] **Step 4: Añadir claves i18n** — en `es.json`, namespace `pilares`, al final:

```json
"interpTitle": "Interpretación",
"interpHint": "Toca un pilar, un elemento o cualquier símbolo de la izquierda para leer qué significa en tu carta.",
"interpPillarsTech": "Tus pilares, en datos",
"decadeRange": "de los {from} a los {to} años"
```

En `en.json`:

```json
"interpTitle": "Interpretation",
"interpHint": "Tap a pillar, an element, or any symbol on the left to read what it means in your chart.",
"interpPillarsTech": "Your pillars, in data",
"decadeRange": "from age {from} to {to}"
```

- [ ] **Step 5: Run test to verify it passes** — mismo comando, PASS.
- [ ] **Step 6: Commit** — `feat(pilares): tipo PilarSelection unificado + i18n del panel de interpretación`

---

### Task 2: `PilaresInterpretation` — renderizador por `kind`

**Files:**
- Create: `apps/web/app/(app)/pilares/interpretation-content.tsx`
- Test: `apps/web/app/(app)/pilares/__tests__/interpretation-content.test.tsx`

**Interfaces:**
- Consumes: `PilarSelection` (T1); `glossaryEntry`, `HEAVENLY_STEMS`, `EARTHLY_BRANCHES`, `STEM_LABELS`, `BRANCH_LABELS`, `hiddenStems`, `tenGod`, `nayin`, `lifeStage`, `TWELVE_STAGES`, `composeBaziReading`, tipo `PillarSet` de `@aluna/core`; `baziLabels` de `@/lib/content/bazi-labels`; `BaziReadingView` de `./bazi-reading`; `GOD_KEY` de `./pillar-column`.
- Produces:
  - `PilaresInterpretation({ selected, pro, set, profileId, profileName, script }): JSX` — `set: PillarSet` (los 4 pilares), `script: "hanzi" | "hangul"`.
  - `pilarSelectionTitle(selected, t, L): string` — título del sheet móvil (`t` = traductor raíz, claves `pilares.*`; `L` = `baziLabels(locale)`).

**Contrato por kind (spec §3-§4):**

| kind | siempre | solo con `pro` |
|---|---|---|
| `reading` | SIN pro: párrafo `composeBaziReading(set, locale).essence`. | CON pro: `BaziReadingView` completo (tiers) + bloque `interpPillarsTech`: una línea por pilar (glifo tronco+rama · pinyin/romanKo según `script` · dios [o Maestro del Día] · Na Yin) |
| `pillar` | cabecera (label del pilar + glifos grandes tronco/rama + dios o Día-Maestro) + cuerpo del glosario del TRONCO + cuerpo del glosario de la RAMA (`bazi.stem.*` / `bazi.branch.*`) | + troncos ocultos (glifo + dios de cada uno) + Na Yin + etapa de vida (`lifeStage` + `L.stages`) |
| `element` | cabecera con nombre del elemento + `count` en la carta + cuerpo de `bazi.element.*` | — |
| `decade` | cabecera (glifo 大運 + `decadeRange` con from=startAge/to=startAge+9 + años startYear–startYear+9) + cuerpo del glosario del dios (`bazi.god.*`) + línea Na Yin (`nayinLabel`) | — |
| `term` | título+glifo+cuerpo de `glossaryEntry(key, locale)`; si la entrada no existe, render `null` (no debe pasar: T3 solo cablea claves existentes) | — |

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/app/(app)/pilares/__tests__/interpretation-content.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "../../../../messages/es.json";
import { PilaresInterpretation, pilarSelectionTitle } from "../interpretation-content";
import { baziLabels } from "@/lib/content/bazi-labels";

// Set determinista: 2000-01-07 = día 甲子 (referencia documentada del repo).
const SET = {
  year: { stem: 5, branch: 3 },   // 己卯
  month: { stem: 2, branch: 0 },  // 丙子
  day: { stem: 0, branch: 0 },    // 甲子
  hour: { stem: 9, branch: 11 },  // 癸亥
} as never;

const wrap = (ui: React.ReactElement) =>
  render(<NextIntlClientProvider locale="es" messages={es}>{ui}</NextIntlClientProvider>);

describe("PilaresInterpretation", () => {
  it("reading sin pro: solo la esencia compuesta (sin tiers)", () => {
    wrap(<PilaresInterpretation selected={{ kind: "reading" }} pro={false} set={SET}
      profileId="p1" profileName="Gio" script="hanzi" />);
    expect(screen.queryByRole("tab", { name: /Esencia/i })).toBeNull();
    expect(screen.queryByText("Tus pilares, en datos")).toBeNull();
    // la esencia compuesta menciona al Maestro del Día (voz del tronco 甲)
    expect(document.body.textContent!.length).toBeGreaterThan(80);
  });

  it("reading con pro: BaziReadingView (tiers) + pilares en datos", () => {
    wrap(<PilaresInterpretation selected={{ kind: "reading" }} pro={true} set={SET}
      profileId="p1" profileName="Gio" script="hanzi" />);
    expect(screen.getByRole("tab", { name: /Esencia/i })).toBeTruthy();
    expect(screen.getByText("Tus pilares, en datos")).toBeTruthy();
    expect(screen.getByText(/甲子/)).toBeTruthy(); // glifo del pilar del día
  });

  it("pillar: glosario de tronco y rama; ocultos solo con pro", () => {
    const sel = { kind: "pillar", which: "day", pillar: { stem: 0, branch: 0 } } as never;
    const { rerender } = wrap(<PilaresInterpretation selected={sel} pro={false} set={SET}
      profileId="p1" profileName="Gio" script="hanzi" />);
    // bazi.stem.jia (甲, madera yang) y bazi.branch.zi (子, rata) — cuerpos del glosario
    expect(document.body.textContent).toMatch(/甲/);
    const before = document.body.textContent!;
    rerender(<NextIntlClientProvider locale="es" messages={es}>
      <PilaresInterpretation selected={sel} pro={true} set={SET}
        profileId="p1" profileName="Gio" script="hanzi" />
    </NextIntlClientProvider>);
    expect(document.body.textContent!.length).toBeGreaterThan(before.length); // pro añade ocultos/nayin/etapa
  });

  it("element / decade / term rinden su contenido", () => {
    const { rerender } = wrap(<PilaresInterpretation selected={{ kind: "element", element: "wood", count: 3 }}
      pro={false} set={SET} profileId="p1" profileName="Gio" script="hanzi" />);
    expect(screen.getByText(/3/)).toBeTruthy();
    rerender(<NextIntlClientProvider locale="es" messages={es}>
      <PilaresInterpretation selected={{ kind: "decade", glyph: "甲子", god: "peer", nayinLabel: "X", startYear: 1998, startAge: 8 }}
        pro={false} set={SET} profileId="p1" profileName="Gio" script="hanzi" />
    </NextIntlClientProvider>);
    expect(screen.getByText(/de los 8 a los 17 años/)).toBeTruthy();
    rerender(<NextIntlClientProvider locale="es" messages={es}>
      <PilaresInterpretation selected={{ kind: "term", key: "bazi.term.daymaster" }}
        pro={false} set={SET} profileId="p1" profileName="Gio" script="hanzi" />
    </NextIntlClientProvider>);
    expect(document.body.textContent!.length).toBeGreaterThan(60); // cuerpo del glosario
  });
});

describe("pilarSelectionTitle", () => {
  it("compone títulos por kind", () => {
    const L = baziLabels("es");
    const t = (k: string) => (({ "pilares.interpTitle": "Interpretación", "pilares.day": "Día" }) as Record<string, string>)[k] ?? k;
    expect(pilarSelectionTitle({ kind: "reading" }, t as never, L)).toBe("Interpretación");
    expect(pilarSelectionTitle({ kind: "pillar", which: "day", pillar: { stem: 0, branch: 0 } as never }, t as never, L)).toContain("Día");
  });
});
```

- [ ] **Step 2: RED** — `cd apps/web && pnpm vitest run "app/(app)/pilares/__tests__/interpretation-content.test.tsx"` → módulo inexistente.

- [ ] **Step 3: Implementation** (estructura; el implementador ajusta matchers al glosario REAL leyendo `packages/core/src/glossary/entries-es.ts`, NUNCA edita core):

```tsx
// apps/web/app/(app)/pilares/interpretation-content.tsx
"use client";
// Renderizador ÚNICO de interpretación del maestro-detalle de Pilares: recibe
// una PilarSelection y la lee. Lo consumen el panel derecho (desktop) y el
// bottom-sheet (móvil). No inventa prosa: todo sale de composeBaziReading,
// BaziReadingView (tiers) y el glosario bazi.* de @aluna/core.
import { useLocale, useTranslations } from "next-intl";
import {
  glossaryEntry, composeBaziReading, HEAVENLY_STEMS, EARTHLY_BRANCHES,
  STEM_LABELS, BRANCH_LABELS, hiddenStems, tenGod, nayin, lifeStage,
  type PillarSet, type Pillar,
} from "@aluna/core";
import { baziLabels } from "@/lib/content/bazi-labels";
import { BaziReadingView } from "./bazi-reading";
import { GOD_KEY } from "./pillar-column";
import type { PilarSelection, PillarPos } from "./selection";
import styles from "./pilares.module.css";

export function PilaresInterpretation({ selected, pro, set, profileId, profileName, script }: {
  selected: PilarSelection; pro: boolean; set: PillarSet;
  profileId: string; profileName: string; script: "hanzi" | "hangul";
}) {
  const t = useTranslations();
  const locale = useLocale();
  const L = baziLabels(locale);
  const glyphStem = (i: number) => (script === "hangul" ? STEM_LABELS[i]!.hangul : HEAVENLY_STEMS[i]!.hanzi);
  const glyphBranch = (i: number) => (script === "hangul" ? BRANCH_LABELS[i]!.hangul : EARTHLY_BRANCHES[i]!.hanzi);

  switch (selected.kind) {
    case "reading": {
      const essence = composeBaziReading(set, locale === "en" ? "en" : "es").essence;
      const POS: PillarPos[] = ["year", "month", "day", "hour"];
      return (
        <div className={styles.interpBlock}>
          {pro
            ? <BaziReadingView pillars={set} profileId={profileId} profileName={profileName} />
            : <p className={styles.interpEssence}>{essence}</p>}
          {pro && (
            <div className={styles.interpTechList}>
              <span className={styles.interpTechH}>{t("pilares.interpPillarsTech")}</span>
              {POS.map((k) => {
                const p = set[k];
                if (!p) return null;
                const god = k === "day" ? t("pilares.dayMasterHanzi") : t(`pilares.${GOD_KEY[tenGod(set.day.stem, p.stem)]}`);
                const n = nayin(p);
                return (
                  <span key={k}>
                    {t(`pilares.${k}`)} · {glyphStem(p.stem)}{glyphBranch(p.branch)} · {god} · {L.nayin[n.key]}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      );
    }
    case "pillar": {
      const p = selected.pillar;
      const stem = HEAVENLY_STEMS[p.stem]!;
      const branch = EARTHLY_BRANCHES[p.branch]!;
      const stemEntry = glossaryEntry(`bazi.stem.${stem.key}`, locale);
      const branchEntry = glossaryEntry(`bazi.branch.${branch.key}`, locale);
      const god = selected.which === "day"
        ? t("pilares.dayMaster")
        : t(`pilares.${GOD_KEY[tenGod(set.day.stem, p.stem)]}`);
      return (
        <div className={styles.interpBlock}>
          <div className={styles.interpHead}>
            <span className={styles.interpGlyph}>{glyphStem(p.stem)}{glyphBranch(p.branch)}</span>
            <div>
              <div className={styles.interpName}>{t(`pilares.${selected.which}`)}</div>
              <div className={styles.interpSub}>{god}</div>
            </div>
          </div>
          {stemEntry && (<div><div className={styles.interpTermH}>{stemEntry.title}</div><p className={styles.interpBody}>{stemEntry.body}</p></div>)}
          {branchEntry && (<div><div className={styles.interpTermH}>{branchEntry.title}</div><p className={styles.interpBody}>{branchEntry.body}</p></div>)}
          {pro && (
            <div className={styles.interpTechList}>
              <span>{t("pilares.hiddenStems")}: {hiddenStems(p.branch).map((hs) =>
                `${HEAVENLY_STEMS[hs]!.hanzi} ${t(`pilares.${GOD_KEY[tenGod(set.day.stem, hs)]}`)}`).join(" · ")}</span>
              <span>{t("pilares.nayinTitle")}: {L.nayin[nayin(p).key]}</span>
              <span>{t("pilares.stagesTitle")}: {L.stages[lifeStage(set.day.stem, p.branch)]}</span>
            </div>
          )}
        </div>
      );
    }
    case "element": {
      const entry = glossaryEntry(`bazi.element.${selected.element}`, locale);
      return (
        <div className={styles.interpBlock}>
          <div className={styles.interpHead}>
            <span className={`${styles.interpGlyph} ${styles[`el_${selected.element}`] ?? ""}`}>{entry?.glyph ?? ""}</span>
            <div>
              <div className={styles.interpName}>{entry?.title}</div>
              <div className={styles.interpSub}>{selected.count} / 8</div>
            </div>
          </div>
          {entry && <p className={styles.interpBody}>{entry.body}</p>}
        </div>
      );
    }
    case "decade": {
      const entry = glossaryEntry(`bazi.god.${selected.god}`, locale);
      return (
        <div className={styles.interpBlock}>
          <div className={styles.interpHead}>
            <span className={styles.interpGlyph}>{selected.glyph}</span>
            <div>
              <div className={styles.interpName}>{t("pilares.luckTitle")}</div>
              <div className={styles.interpSub}>
                {t("pilares.decadeRange", { from: selected.startAge, to: selected.startAge + 9 })} · {selected.startYear}–{selected.startYear + 9}
              </div>
            </div>
          </div>
          {entry && (<><div className={styles.interpTermH}>{entry.title}</div><p className={styles.interpBody}>{entry.body}</p></>)}
          <p className={styles.interpSub}>{t("pilares.nayinTitle")}: {selected.nayinLabel}</p>
        </div>
      );
    }
    case "term": {
      const entry = glossaryEntry(selected.key, locale);
      if (!entry) return null;
      return (
        <div className={styles.interpBlock}>
          <div className={styles.interpHead}>
            {entry.glyph && <span className={styles.interpGlyph}>{entry.glyph}</span>}
            <div className={styles.interpName}>{entry.title}</div>
          </div>
          <p className={styles.interpBody}>{entry.body}</p>
        </div>
      );
    }
  }
}

/** Título del bottom-sheet móvil para una PilarSelection. */
export function pilarSelectionTitle(
  selected: PilarSelection,
  t: (k: string, v?: Record<string, unknown>) => string,
  L: ReturnType<typeof baziLabels>,
): string {
  const locale = L === baziLabels("en") ? "en" : "es"; // ver nota abajo
  switch (selected.kind) {
    case "reading": return t("pilares.interpTitle");
    case "pillar": return t(`pilares.${selected.which}`);
    case "element": return glossaryEntry(`bazi.element.${selected.element}`, locale)?.title ?? selected.element;
    case "decade": return t("pilares.luckTitle");
    case "term": return glossaryEntry(selected.key, locale)?.title ?? "";
  }
}
```

Nota de implementación: la línea `const locale = L === baziLabels("en") ...` del título es frágil — el implementador debe pasar `locale` como 4º parámetro (`pilarSelectionTitle(selected, t, L, locale)`) y ajustar el test; se deja señalado aquí para que la firma final sea `(selected, t, L, locale)`. Las clases CSS `interpBlock/interpHead/interpGlyph/interpName/interpSub/interpBody/interpTermH/interpTechList/interpTechH/interpEssence` las estiliza la Task 5 (usarlas igual).

- [ ] **Step 4: GREEN** — mismo comando; ajustar matchers a los textos reales del glosario si hace falta (leerlos, no editarlos).
- [ ] **Step 5: Commit** — `feat(pilares): PilaresInterpretation — renderizador único por kind con profundidad Pro`

---

### Task 3: Cablear la columna técnica — `onSelect` en pilares, balance y lámina

**Files:**
- Modify: `apps/web/app/(app)/pilares/pillar-column.tsx`
- Modify: `apps/web/app/(app)/pilares/pro-lamina.tsx`
- Test: `apps/web/app/(app)/pilares/__tests__/technical-select.test.tsx`

**Interfaces:**
- Consumes: `PilarSelection` (T1).
- Produces:
  - `PillarColumn` gana prop `onSelect: (s: PilarSelection) => void` (resto de la firma intacta).
  - `ProLamina` gana prop `onSelect: (s: PilarSelection) => void`.

**Cableado (reemplaza `<Meaning>` por botones de selección SOLO donde la clave de glosario existe — verificar con grep en `packages/core/src/glossary/entries-es.ts`; donde no exista, dejar `<Meaning>`):**

`pillar-column.tsx`:
- `colLabel` (nombre del pilar) → botón `onSelect({ kind: "pillar", which: posKey as PillarPos, pillar })`.
- Chip de dios / Día-Maestro → `onSelect({ kind: "term", key: isDay ? "bazi.term.daymaster" : \`bazi.god.${tenGod(dayMaster, pillar.stem)}\` })`.
- Glifo del tronco → `{ kind: "term", key: \`bazi.stem.${stem.key}\` }`; glifo de la rama y el animal → `{ kind: "term", key: \`bazi.branch.${branch.key}\` }`.
- Troncos ocultos: cada fila → term del tronco oculto; el rótulo "Troncos ocultos" → `{ kind: "term", key: "bazi.term.hiddenstems" }`.

`pro-lamina.tsx`:
- Títulos de sección (los 7 `<Meaning k="bazi.term.X">` de los `cardH`) → botón term de esa clave.
- Chips de elementos favorables/a moderar → `{ kind: "element", element: el, count: -1 }`… **NO**: el count no está disponible en la lámina — usar `{ kind: "term", key: \`bazi.element.${el}\` }` (la entrada de glosario es la misma; el kind `element` con conteo queda solo para el balance de la vista).
- Columna de década (`.luckCol`): el click EXISTENTE (acordeón `setOpen`) se conserva Y ADEMÁS dispara `onSelect({ kind: "decade", glyph: glyphPillar(p.pillar), god: p.tenGod, nayinLabel: L.nayin[p.nayin.key], startYear: p.startYear, startAge: p.startAge })` — acordeón (izquierda, tabla anual) y panel (derecha, significado) conviven.
- Filas de Na Yin/etapas/interacciones: sin selección propia (sin entrada por ítem en el glosario) — sus `<Meaning>` de términos quedan como están.

CSS auxiliar (añadir junto a las clases nuevas, Task 5 lo consolida): reset `.selBtn` (análogo a `.selCell` de carta) — `background:none; border:0; padding:0; font:inherit; color:inherit; text-align:inherit; cursor:pointer;` + `:focus-visible` con anillo `rgba(var(--acc-rgb),0.6)`. ⚠️ Lección de carta (chips): para el chip del dios usar reset que CONSERVE la piel del `chip` global (`.chipBtn`-equivalente: solo `background:none; font:inherit; color:inherit; cursor:pointer;`).

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/app/(app)/pilares/__tests__/technical-select.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "../../../../messages/es.json";
import { PillarColumn } from "../pillar-column";

const DAY = { stem: 0, branch: 0 } as never; // 甲子

const wrap = (ui: React.ReactElement) =>
  render(<NextIntlClientProvider locale="es" messages={es}>{ui}</NextIntlClientProvider>);

describe("PillarColumn seleccionable", () => {
  it("label del pilar → kind pillar; tronco → term; chip de dios conserva su piel", () => {
    const onSelect = vi.fn();
    wrap(<PillarColumn posKey="day" pillar={DAY} isDay dayMaster={0} pro={true}
      script="hanzi" index={2} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: "Día" }));
    expect(onSelect).toHaveBeenLastCalledWith({ kind: "pillar", which: "day", pillar: DAY });
    fireEvent.click(screen.getByRole("button", { name: /甲/ }));
    expect(onSelect).toHaveBeenLastCalledWith({ kind: "term", key: "bazi.stem.jia" });
    // el chip 日主 (Día-Maestro) selecciona su término
    fireEvent.click(screen.getAllByRole("button", { name: /日主|Maestro/ })[0]!);
    expect(onSelect).toHaveBeenLastCalledWith({ kind: "term", key: "bazi.term.daymaster" });
  });
});
```

(El implementador añade el describe de `ProLamina` con el mismo molde: mock de `data` mínimo — reusar el fixture de un test existente de pilares si hay — asertando título de sección → term y década → decade con acordeón intacto.)

- [ ] **Step 2: RED** — la prop `onSelect` no existe.
- [ ] **Step 3: Implementar** el cableado descrito (y actualizar los tests existentes de `pillar-column` si asertaban `<Meaning>`).
- [ ] **Step 4: GREEN** — `pnpm vitest run "app/(app)/pilares"` completo verde.
- [ ] **Step 5: Commit** — `feat(pilares): columna técnica seleccionable — pilares, dioses, troncos, décadas y términos disparan PilarSelection`

---

### Task 4: Recableado de `pilares-view.tsx` — layout, router, Pro desktop, sheet unificado

**Files:**
- Modify: `apps/web/app/(app)/pilares/pilares-view.tsx`
- Modify: `apps/web/app/(app)/pilares/pilares-tabs.tsx` (filtrado por pro)
- Test: `apps/web/app/(app)/pilares/__tests__/pilares-selection.test.tsx`

**Interfaces:**
- Consumes: todo lo anterior; `BottomSheet` de `@/components/bottom-sheet`.
- Produces — DOM objetivo (Task 5 lo estiliza):

```
deskCols
├─ controlsGlobal (fila superior desktop): proToggle (VUELVE a desktop) + scriptRow (pro)
├─ leftCol                       ← todo lo técnico (scrollea)
│  ├─ grid de 4 PillarColumn (onSelect=select)
│  ├─ sección balance: ElementBar tocable → {kind:"element", element, count}
│  ├─ readingMobile: card "Lectura de tus pilares" SOLO móvil (desktop la cubre el panel)
│  └─ tabsRow: PilaresTabs(filtradas por pro) + ProLamina(onSelect=select)
└─ interpCol (sticky, desktop-only)
   └─ interpPanel: cardH interpTitle + PilaresInterpretation(selected, pro, set, …, script)
```

**Cambios de comportamiento:**
1. Estados nuevos: `const [selected, setSelected] = useState<PilarSelection>({ kind: "reading" });` y `const [sheetSel, setSheetSel] = useState<PilarSelection | null>(null);`
2. Router: `const select = (s: PilarSelection) => { if (isMobileViewport()) setSheetSel(s); else setSelected(s); };`
3. Reset (lección de carta): `useEffect(() => { setSelected({ kind: "reading" }); setSheetSel(null); }, [active]);`
4. `ElementBar` gana `onSelect` y su nombre se vuelve botón (reset `.selBtn`), quitando su `<Meaning>`.
5. La card actual de lectura (`section.reading` + `BaziReadingView`, líneas 192-203) se envuelve en `<div className={styles.readingMobile}>` — visible solo <1080 (el panel la reemplaza en desktop). El `h2` "Lectura de tus pilares" va dentro.
6. `PilaresTabs`: prop nueva `pro: boolean`; con `pro=false` solo `nayin|strength|favor`; efecto en la vista: si `tab` activa deja de existir al apagar Pro → `setTab("nayin")` (useEffect).
7. `controlsGlobal`: quitar el `{pro && <p className={styles.proHint}>}` de desktop no hace falta — el hint puede quedarse; el cambio real es CSS (Task 5 deja de ocultar `.proToggle` en desktop).
8. Panel derecho + sheet unificado (espejo de carta):

```tsx
          <div className={styles.interpCol}>
            <div className={`card ${styles.interpPanel}`}>
              <span className={styles.cardH2}>{t("pilares.interpTitle")}</span>
              <PilaresInterpretation selected={selected} pro={pro} set={set}
                profileId={active!.id} profileName={active!.name} script={script} />
            </div>
          </div>
```

```tsx
      <BottomSheet open={!!sheetSel} onClose={() => setSheetSel(null)} center
        title={sheetSel ? pilarSelectionTitle(sheetSel, t, L, locale) : ""}>
        {sheetSel && active && data && (
          <PilaresInterpretation selected={sheetSel} pro={pro} set={set}
            profileId={active.id} profileName={active.name} script={script} />
        )}
      </BottomSheet>
```

   (`set` = `{ year: data.year, month: data.month, day: data.day, hour: data.hour }` memoizado; `L = baziLabels(locale)`.)

- [ ] **Step 1: Write the failing test** — `pilares-selection.test.tsx` con el harness de un test existente de la vista (buscar en `__tests__/` el que mockea `useProfiles` + `fetch /api/bazi`; si no existe, construirlo con el molde de `meaning-wiring`-style: stub `fetch` devolviendo un `BaZiData` fijo con los 4 pilares del SET de Task 2, matchMedia desktop). Tres tests:

```tsx
  it("aterriza con la Lectura en el panel y responde a la selección", async () => {
    // render, esperar "Interpretación"; clic en label "Día" (grid) → panel muestra glifo 甲子 + glosario
  });
  it("Modo Pro tiene efecto inmediato en el aterrizaje", async () => {
    // SIN pro: queryByText("Tus pilares, en datos")=null y tab "Interacciones" AUSENTE
    // clic en el toggle (getAllByRole button name Modo Pro)
    // CON pro: findByText("Tus pilares, en datos") en el panel + tab "Interacciones" presente
    //          + tiers (role tab Esencia) presentes en el panel
  });
  it("cambiar de perfil resetea la selección", async () => {
    // seleccionar Día → rerender con otro profile.id en el mock → panel vuelve a la Lectura
  });
```

- [ ] **Step 2: RED.**
- [ ] **Step 3: Implementar** los 8 cambios.
- [ ] **Step 4: GREEN** — carpeta `pilares` completa + `pnpm typecheck` + `pnpm exec eslint "app/(app)/pilares"`.
- [ ] **Step 5: Commit** — `feat(pilares): maestro-detalle cableado — panel de interpretación, router de selección, Pro de vuelta en desktop, sheet unificado`

---

### Task 5: CSS del layout — izquierda scrollea, derecha sticky, Pro por columnas

**Files:**
- Modify: `apps/web/app/(app)/pilares/pilares.module.css`

**Reglas (espejo de la receta de carta, adaptada):**

Base (fuera del media):
```css
/* ---- Maestro-detalle ---- */
.interpCol { display: none; } /* móvil: el sheet toma su lugar */
.interpBlock { display: flex; flex-direction: column; gap: var(--sp-3); text-align: left; }
.interpHead { display: flex; align-items: center; gap: var(--sp-3); }
.interpGlyph { font-family: var(--font-display); font-size: var(--text-2xl); color: var(--acc-text); line-height: 1; }
.interpName { font-family: var(--font-display); font-size: var(--text-lg); color: var(--ink); }
.interpSub { font-size: var(--text-xs); color: var(--soft); margin-top: 2px; }
.interpBody { margin: 0; font-size: var(--text-sm); line-height: 1.65; color: var(--soft); }
.interpTermH { font-size: var(--text-2xs); letter-spacing: 1.2px; text-transform: uppercase; color: var(--acc-text); font-weight: 700; }
.interpEssence { margin: 0; font-family: var(--font-display); font-size: var(--text-lg); line-height: 1.55; color: var(--ink); }
.interpTechList { display: flex; flex-direction: column; gap: 5px; font-size: var(--text-2xs); color: var(--soft); font-variant-numeric: tabular-nums; border-top: 1px solid var(--line); padding-top: var(--sp-2); }
.interpTechH { font-size: var(--text-2xs); letter-spacing: 1.2px; text-transform: uppercase; color: var(--acc-text); font-weight: 700; }
.selBtn { background: none; border: 0; padding: 0; font: inherit; color: inherit; text-align: inherit; cursor: pointer; }
.selBtn:hover { color: var(--acc-text); }
.selBtn:focus-visible, .chipBtn:focus-visible { outline: 2px solid rgba(var(--acc-rgb), 0.6); outline-offset: 2px; border-radius: 6px; }
.chipBtn { background: none; font: inherit; color: inherit; cursor: pointer; } /* chips: conserva la piel (lección carta) */
.readingMobile { display: contents; } /* móvil: la card fluye como hoy */
```

Desktop (dentro de `@media (min-width: 1080px)`), cambios sobre lo existente:
```css
  .deskCols { grid-template-columns: 11fr 9fr; } /* antes 8fr/12fr: la técnica gana ancho, la interpretación es columna 2 */
  .leftCol { grid-column: 1; grid-row: 2; display: flex; flex-direction: column; gap: var(--sp-4); }
  .pillarsCol { position: static; } /* lo sticky ahora es la interpretación */
  .interpCol { display: block; grid-column: 2; grid-row: 2; position: sticky; top: 84px; }
  .interpPanel { display: flex; flex-direction: column; gap: var(--sp-3); max-height: calc(100vh - 100px); overflow-y: auto; }
  .readingMobile { display: none; } /* desktop: el panel es la lectura */
  /* Pro vuelve a gatear en desktop: ELIMINAR las reglas "siempre visible"
     (.proToggle/.proHint display:none; .col:not([data-pro]) .god/.hidden display:flex;
      .scriptRow:not([data-pro]) display:flex; .lamina:not([data-pro]) display:grid)
     — la base (ocultar sin data-pro) pasa a regir también en desktop.
     EXCEPCIÓN: .col:not([data-pro]) .god { display: flex; } SE CONSERVA (spec §4:
     el dios principal es esencial y visible sin Pro; solo .hidden queda tras Pro). */
```
`.readCol` desaparece (reemplazado por `.leftCol` + `.interpCol`) — borrar sus reglas y las que queden sin consumidor tras el nuevo JSX (verificar con grep contra los .tsx). `.tabsRow`/`.vtabs`/`.lamina` se conservan (ahora dentro de `.leftCol`).

- [ ] **Step 1: aplicar CSS** (base + desktop + limpieza de huérfanas con grep).
- [ ] **Step 2: gates** — suite `pilares` verde; `pnpm typecheck`.
- [ ] **Step 3: Commit** — `feat(pilares): layout maestro-detalle — técnica a la izquierda, interpretación sticky a la derecha, Pro gateando en desktop`

---

### Task 6: Gate final + verificación en navegador + review integral

- [ ] **Step 1:** `pnpm --filter @aluna/web test` (suite completa) + `pnpm typecheck` + `pnpm exec eslint app` (desde apps/web).
- [ ] **Step 2:** `NODE_OPTIONS=--max-old-space-size=16384 pnpm --filter @aluna/web build` → EXIT 0. Reiniciar el dev server después (el build pisa `.next`).
- [ ] **Step 3 (controlador, mirada propia):** dev server del worktree en puerto libre (3008 — el 3007 sirve carta-detalle) + navegador propio (playwright-core del scratchpad, perfil persistente ya logueado con gio.park.4444+carta2col@gmail.com) → `/pilares`: checklist = dos columnas; panel arranca con la Lectura; clic en pilar/tronco/dios/elemento/década → panel cambia; **toggle Pro en aterrizaje cambia AMBAS columnas al instante**; tab activa se resetea al apagar Pro; móvil 390px: sheet al tocar + lámina tras el toggle + card de Lectura visible sin Pro; barrido de consola sin errores nuevos. Capturas a `.dev-shots/`.
- [ ] **Step 4:** review integral de la rama (paquete `review-package BASE HEAD`) con el modelo más capaz; ola única de fixes si hay findings; re-review.
- [ ] **Step 5:** commit final + push (`git push -u origin lentes-detalle` — auto-push autorizado) + reporte a Gio con capturas y estado de la serie (siguiente: Números).

---

## Self-review (hecho)

- **Cobertura del spec:** §1 columnas → T4/T5 · §2 selección+reset → T1/T4 · §3 fuentes → T2 (mapping term documentado) · §4 Pro ambas+aterrizaje → T2 (derecha) + T4/T5 (izquierda: ocultos/tabs/switch) + test dedicado T4 · §5 estructura → T2/T3/T4 · móvil sin regresión (lectura visible, lámina tras toggle) → T4.5/T5.
- **Placeholders:** el harness de `pilares-selection.test.tsx` referencia tests existentes como molde (nombrados como fuente obligada, mismo criterio aceptado en el plan de carta); la nota de firma de `pilarSelectionTitle` (4º parámetro `locale`) es una corrección explícita, no un TBD.
- **Consistencia de tipos:** `PilarSelection` idéntico en T1/T2/T3/T4; `onSelect: (s: PilarSelection) => void` uniforme; `PilaresInterpretation` misma firma en T2/T4 (`set: PillarSet`, `script`); `pilarSelectionTitle(selected, t, L, locale)` fijada en T2-nota y usada así en T4.
