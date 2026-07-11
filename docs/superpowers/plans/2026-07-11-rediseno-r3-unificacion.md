# Rediseño R3 — Unificación + colores compartidos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 40+ duplicated implementations of colors, cards, chips and segmented controls
across `apps/web` and `apps/mobile` collapse into few sources of truth — domain colors
(zodiac element→color, aspect/armonía, Wu Xing) move to `@aluna/core` as typed exports;
web gets a `.card` primitive (base + 4 modifiers), 2 chip primitives, and a unified
`.seg`; mobile adopts the R1 primitives where it still hand-rolls them; on-accent ink
becomes theme×mode-aware (the one real WCAG risk, confirmed by Gio); R4 (desktop) rides
along as the last task. Zero flattening of intentional variants — every one-off is
preserved and named, not silently merged.

**Architecture:** Foundation-first, dependency-ordered. Core colors land first (task 1)
because the web wheel shim, the mobile ChartWheel/pilares imports, and the Wu Xing CSS
comment all point at it. Then the three web primitive families (`.card`, chip, `.seg`)
land as define-then-migrate pairs, each ending in a real `next build` + browser
verification (this is CSS-only surface work — the controller's live render is the actual
gate, not just green tests). On-accent theme-awareness (task 7) is sequenced right after
`.seg` because `.seg`'s migration of `energy.module.css`'s `#14132a` deliberately lands
on the OLD single `--ink-on-acc` first (one visible color change), then task 7 makes that
token theme×mode-aware (a second, final visible change) — this order is intentional, not
an oversight; both steps are individually screenshot-checked. Mobile primitives (tasks
8-9), the mini-doc (10), the axe pass (11), R4 desktop (12) and the closing grep gate
(13) follow, in that order, so the mini-doc and axe pass have a finished system to
describe/verify.

**Tech Stack:** CSS Modules + CSS custom properties (NOT Tailwind — firm decision, see
R1/R2 precedent). Next.js 15 web. Expo 56 / React Native mobile. `@aluna/core` is a pure
TypeScript workspace package (RN-safe: 0 runtime deps, no `node:` imports) consumed by
both. Vitest for unit tests in `packages/core` and `apps/mobile/lib`. Turbo for the
monorepo-wide gate.

## Global Constraints

- CSS Modules + CSS vars, NOT Tailwind. `@aluna/core` must stay RN-safe (no `node:` imports).
- Zodiac colors and Wu Xing colors are SEPARATE typed exports (`Element`-keyed vs new `WuXingElement`-keyed) — NEVER a single merged map (only `fire` agrees in value; merging corrupts a domain).
- On-accent is theme-dependent (Gio decided): web `--ink-on-acc` becomes per-theme×mode, mirroring `apps/mobile/theme/tokens.ts` `onAcc` values; the `#14132a` local in hoy/energy.module.css is retired. On-accent does NOT go into core.
- Preserve intentional variants as modifiers, do not flatten: `.seg--gradient` (carta/numerology flagship gradient active-fill), `.chip--control-outline` (pilares scriptBtn, active = border+text only, no fill), `.chip--pill` (pilares tag pill).
- Wu Xing on web stays as CSS classes `.el_*` with a comment pointing to `@aluna/core` WU_XING_COLORS as canonical (CSS can't import TS; mobile imports from core.
- One-off surfaces NOT forced into `.card` (name them): numerology.hero, chat bubbles, bottom-sheet, selectable tiles (settings.tc/onboarding.gender).
- Every surviving grep-gate exception must carry a justification comment (repo convention).

**Additional constraints discovered during exploration (apply throughout):**

- Comments in Spanish, matching the rest of the codebase's convention.
- `.card`, `.card--*`, `.chip`, `.chip--*`, `.seg`, `.seg__*` are **global** classes defined
  once in `apps/web/app/globals.css` (not CSS Modules — that file has no `.module.` suffix
  and is imported once in the root layout). Consumers combine the literal string
  `"card card--tight"` with their CSS-Module class for layout-only overrides, e.g.
  `` `card card--tight ${styles.big}` ``. Do not try to import these from a `.module.css`.
- `apps/web/lib/theme/tokens.css` structures theme×mode as `[data-theme="X"]` (dark/default
  variant of that theme) + `[data-theme="X"][data-mode="Y"]` (the override for the
  non-default mode). Observatory and Cosmic default to dark; Aurora defaults to light. Any
  per-theme×mode token (like `--ink-on-acc` in task 7) must follow this exact structure.
- Gate for web tasks: `cd apps/web && npx tsc --noEmit && npx vitest run && rm -rf .next && npx next build` (R2 precedent).
- Gate for mobile tasks: `cd apps/mobile && npx tsc --noEmit && npx vitest run && npx expo export --platform ios && rm -rf dist` (R1 precedent).
- Gate for `packages/core` tasks: `cd packages/core && npx vitest run && npx tsc --noEmit -p tsconfig.json`.
- Every CSS-surface task (`.card`, chip, `.seg`, on-accent) needs a live browser pass by the
  controller (localhost dev server, the touched pages, relevant theme×mode combos) — green
  tests/build alone do not verify a visual unification task. This mirrors R2's rule.
- Commit prefix: `feat(r3): ...`, one commit per task (matches R1/R2 style).

---

### Task 1: Core color constants (`@aluna/core`)

The foundation everything else imports. Creates the two new domain-color files, wires
their exports through `packages/core/src/index.ts`, and updates the one web CSS comment
that documents the Wu Xing mirror relationship (decision 5 — cheap to do here since this
task already touches the Wu Xing domain).

**Files:**
- Create: `packages/core/src/constants/colors.ts`
- Create: `packages/core/src/constants/__tests__/colors.test.ts`
- Create: `packages/core/src/bazi/colors.ts`
- Create: `packages/core/src/bazi/__tests__/colors.test.ts`
- Modify: `packages/core/src/bazi/bazi.ts` (add `WuXingElement` type export, ~line 19)
- Modify: `packages/core/src/index.ts` (wire the two new files)
- Modify: `apps/web/app/(app)/pilares/pilares.module.css` (comment only, lines 104-107)

- [ ] **Step 1: Write failing tests (byte-check against today's literals)**

  `packages/core/src/constants/__tests__/colors.test.ts`:
  ```ts
  import { describe, it, expect } from "vitest";
  import { ELEMENT_INK, ELEMENT_FILL, ASPECT_COLORS } from "../colors";

  describe("ELEMENT_INK / ELEMENT_FILL / ASPECT_COLORS", () => {
    it("match the byte-identical literals from wheel-colors.ts / ChartWheel.tsx today", () => {
      expect(ELEMENT_INK).toEqual({
        fire: "#e0795a", earth: "#7fb069", air: "#7aaae0", water: "#9b8fd6",
      });
      expect(ELEMENT_FILL).toEqual({
        fire: "rgba(224,121,90,0.12)", earth: "rgba(127,176,105,0.12)",
        air: "rgba(122,170,224,0.12)", water: "rgba(150,140,214,0.12)",
      });
      expect(ASPECT_COLORS).toEqual({
        hard: "rgba(224,121,90,0.55)", soft: "rgba(122,170,224,0.5)", neutral: "rgba(231,201,134,0.4)",
      });
    });
  });
  ```

  `packages/core/src/bazi/__tests__/colors.test.ts`:
  ```ts
  import { describe, it, expect } from "vitest";
  import { WU_XING_COLORS } from "../colors";

  describe("WU_XING_COLORS", () => {
    it("matches the byte-identical literals from pilares.module.css / pilares.tsx EL_COLOR today", () => {
      expect(WU_XING_COLORS).toEqual({
        wood: "#7fb069", fire: "#e0795a", earth: "#d4a85f", metal: "#b8b6c8", water: "#7aaae0",
      });
    });
    it("only 'fire' matches the zodiac ELEMENT_INK value — the two domains must stay separate", () => {
      // Regression guard for the "never merge" constraint: earth/water Wu Xing ≠ earth/water zodiac.
      expect(WU_XING_COLORS.earth).not.toBe("#7fb069"); // zodiac earth
      expect(WU_XING_COLORS.water).not.toBe("#9b8fd6"); // zodiac water (ELEMENT_INK, not ELEMENT_FILL)
      expect(WU_XING_COLORS.fire).toBe("#e0795a"); // the one key that DOES agree
    });
  });
  ```
  Run both — confirm they fail (module doesn't exist yet).

- [ ] **Step 2: `packages/core/src/constants/colors.ts`**
  ```ts
  // Colores de dominio (zodiaco/tránsitos) — R3: única fuente de verdad, RN-safe.
  // Espejados hoy en apps/web/app/(app)/carta/wheel-colors.ts (shim tras esta tarea) y
  // apps/mobile/components/ChartWheel.tsx (import directo tras esta tarea). Byte-idénticos
  // en ambas plataformas — cero drift documentado en el inventario R3.
  import type { Element, AspectHarmony } from "./astrology";

  /** Tinta sólida por elemento zodiacal (glifos/signos de la rueda). */
  export const ELEMENT_INK: Record<Element, string> = {
    fire: "#e0795a",
    earth: "#7fb069",
    air: "#7aaae0",
    water: "#9b8fd6",
  };

  /** Relleno semi-transparente por elemento (sectores de la rueda) — pensado para
   *  tintar sobre cualquier tema. */
  export const ELEMENT_FILL: Record<Element, string> = {
    fire: "rgba(224,121,90,0.12)",
    earth: "rgba(127,176,105,0.12)",
    air: "rgba(122,170,224,0.12)",
    water: "rgba(150,140,214,0.12)",
  };

  /** Trazo por armonía de aspecto (líneas de la rueda / clima de tránsitos). */
  export const ASPECT_COLORS: Record<AspectHarmony, string> = {
    hard: "rgba(224,121,90,0.55)",
    soft: "rgba(122,170,224,0.5)",
    neutral: "rgba(231,201,134,0.4)",
  };
  ```

- [ ] **Step 3: `packages/core/src/bazi/bazi.ts` — add `WuXingElement` (after the `StemDef` interface, ~line 19)**
  ```ts
  /** Elemento de un tronco/rama del sistema Wu Xing (五行) — clave de WU_XING_COLORS. */
  export type WuXingElement = StemDef["element"];
  ```

- [ ] **Step 4: `packages/core/src/bazi/colors.ts`**
  ```ts
  // Colores Wu Xing (五行) — R3: única fuente de verdad, RN-safe. Espejados hoy en
  // apps/web/app/(app)/pilares/pilares.module.css (.el_*/.elBg_*, se MANTIENEN como
  // clases CSS — CSS no puede importar TS — con comentario apuntando aquí) y en
  // apps/mobile/app/(tabs)/pilares.tsx (import directo tras esta tarea, antes EL_COLOR
  // local). Comparte las claves fire/earth/water con el zodiaco (constants/colors.ts)
  // pero SOLO fire coincide en valor — dominios separados, nunca fusionar (earth Wu Xing
  // #d4a85f ≠ earth zodiaco #7fb069; water Wu Xing #7aaae0 ≠ water zodiaco #9b8fd6).
  import type { WuXingElement } from "./bazi";

  export const WU_XING_COLORS: Record<WuXingElement, string> = {
    wood: "#7fb069",
    fire: "#e0795a",
    earth: "#d4a85f",
    metal: "#b8b6c8",
    water: "#7aaae0",
  };
  ```

- [ ] **Step 5: Wire `packages/core/src/index.ts`**
  - After the existing `export * from "./constants/astrology";` line, add:
    `export * from "./constants/colors";`
  - After the existing bazi export block, add:
    `export { WU_XING_COLORS } from "./bazi/colors";`
  - In the existing `export type { BaZiInput, BaZiResult, Pillar, StemDef, BranchDef, TenGod, TenGodDef } from "./bazi/bazi";` line, append `WuXingElement` to the type list.

- [ ] **Step 6: Update the web Wu Xing comment (decision 5, cheap to do now)**
  `apps/web/app/(app)/pilares/pilares.module.css:104-107` — before:
  ```css
  /* Colores de los cinco elementos (Wu Xing) — DOMINIO, intocable.
     el_fire/elBg_fire (#e0795a) y el_water/elBg_water (#7aaae0) coinciden en valor con los nuevos
     --tone-warm/--tone-cool, pero son ejes semánticos distintos (elemento Wu Xing vs. tono de
     tránsito) — NO se reemplazan por los tokens semánticos. */
  ```
  after (append the mirror note, keep the existing content):
  ```css
  /* Colores de los cinco elementos (Wu Xing) — DOMINIO, intocable.
     el_fire/elBg_fire (#e0795a) y el_water/elBg_water (#7aaae0) coinciden en valor con los nuevos
     --tone-warm/--tone-cool, pero son ejes semánticos distintos (elemento Wu Xing vs. tono de
     tránsito) — NO se reemplazan por los tokens semánticos.
     Espejo de @aluna/core WU_XING_COLORS (packages/core/src/bazi/colors.ts) — CSS no puede
     importar TS, así que estas clases son la fuente de verdad PARA EL NAVEGADOR, pero los
     valores deben permanecer byte-idénticos al export de core (verificado por test en core). */
  ```
  This is comment-only — no visual change, no test needed beyond a visual diff of zero.

- [ ] **Step 7: Gate + commit**
  Run: `cd packages/core && npx vitest run && npx tsc --noEmit -p tsconfig.json` → verde (both new test files pass).
  Commit: `feat(r3): colores de dominio (zodiaco, aspecto, Wu Xing) a @aluna/core`

---

### Task 2: Web wheel-colors.ts shim

`carta/wheel-colors.ts` becomes a thin re-export so `chart-wheel.tsx`'s import
(`import { HARMONY_STROKE, ELEMENT_FILL, ELEMENT_INK } from "./wheel-colors";` at
`apps/web/app/(app)/carta/chart-wheel.tsx:12`) does not change at all.

**Files:**
- Modify: `apps/web/app/(app)/carta/wheel-colors.ts`

- [ ] **Step 1:** Replace the full file content:

  Before (current, 23 lines):
  ```ts
  export const ELEMENT_FILL: Record<string, string> = { fire: "rgba(224,121,90,0.12)", ... };
  export const ELEMENT_INK: Record<string, string> = { fire: "#e0795a", ... };
  export const HARMONY_STROKE: Record<string, string> = { hard: "rgba(224,121,90,0.55)", ... };
  ```

  After:
  ```ts
  // Colores de la rueda derivados de los elementos/armonías — shim: la fuente de verdad
  // vive en @aluna/core (packages/core/src/constants/colors.ts), compartida con el móvil.
  // Re-exporta con los NOMBRES HISTÓRICOS (HARMONY_STROKE en vez de ASPECT_COLORS) para que
  // chart-wheel.tsx no cambie ni un import.
  export { ELEMENT_FILL, ELEMENT_INK, ASPECT_COLORS as HARMONY_STROKE } from "@aluna/core";
  ```

- [ ] **Step 2:** Confirm `chart-wheel.tsx` needs zero changes (its import line is untouched) — `grep -n "wheel-colors" apps/web -r` should still show only the one import site, unchanged.

- [ ] **Step 3: Gate + browser verification**
  `cd apps/web && npx tsc --noEmit && npx vitest run && rm -rf .next && npx next build` → verde.
  Controller: open `/carta` in the 3 themes, confirm the wheel's element fills/inks and
  aspect lines render pixel-identical to before (values are byte-identical, so this should
  be a no-op visually — the check is that nothing broke the import chain).
  Commit: `feat(r3): wheel-colors.ts como shim de @aluna/core`

---

### Task 3: Mobile ChartWheel + pilares import core colors

**Files:**
- Modify: `apps/mobile/components/ChartWheel.tsx` (delete lines 23-40, extend the `@aluna/core` import at lines 10-14)
- Modify: `apps/mobile/app/(tabs)/pilares.tsx` (delete lines 40-46, extend the `@aluna/core` import at lines 4-27)

- [ ] **Step 1: `ChartWheel.tsx`** — delete the local consts (lines 23-40):
  ```ts
  // Paridad con apps/web/app/(app)/carta/wheel-colors.ts (theme-agnostic).
  const ELEMENT_FILL: Record<string, string> = { ... };
  const ELEMENT_INK: Record<string, string> = { ... };
  const HARMONY_STROKE: Record<string, string> = { ... };
  ```
  Extend the existing `@aluna/core` import (lines 10-14) to add, aliasing `ASPECT_COLORS`
  to the local historical name so the 3 call sites (lines 86, 87, 148: `ELEMENT_FILL[s.element]`,
  `ELEMENT_INK[s.element]`, `HARMONY_STROKE[asp.harmony]`) need zero changes:
  ```ts
  import {
    WHEEL, pointAt, annularSector, spreadBodies,
    ZODIAC_SIGNS, PLANETS,
    ELEMENT_FILL, ELEMENT_INK, ASPECT_COLORS as HARMONY_STROKE,
    type ChartResult, type BodyPosition,
  } from "@aluna/core";
  ```

- [ ] **Step 2: `pilares.tsx`** — delete `EL_COLOR` (lines 38-46):
  ```ts
  // Colores fijos de los 5 elementos (Wu Xing), iguales a la web (pilares.module.css):
  // identidad del elemento, no del tema — se ven igual en cualquier tema/modo de luz.
  const EL_COLOR: Record<string, string> = { wood: "#7fb069", ... };
  ```
  Extend the `@aluna/core` import (lines 4-27) with `WU_XING_COLORS as EL_COLOR` — this
  alias preserves all 6 existing `EL_COLOR[...]` call sites (lines 217, 225, 241, 297, 411,
  495) untouched:
  ```ts
  import {
    HEAVENLY_STEMS, EARTHLY_BRANCHES, STEM_LABELS, BRANCH_LABELS,
    TEN_GODS, TEN_GOD_KO, hiddenStems, tenGod, nayin, lifeStage, TWELVE_STAGES,
    detectInteractions, symbolicStars, STARS, dayMasterStrength, favorableElements,
    luckPillars, annualPillars,
    WU_XING_COLORS as EL_COLOR,
    type Pillar, type PillarSet, type TenGod, type LuckSequence,
  } from "@aluna/core";
  ```

- [ ] **Step 3: Gate + browser/simulator verification**
  `cd apps/mobile && npx tsc --noEmit && npx vitest run && npx expo export --platform ios && rm -rf dist` → verde.
  Controller: run the app (Expo dev), open Carta (wheel colors unchanged) and Pilares
  (all 6 `EL_COLOR` usages: pillar hanzi/hangul chars, hidden stems, element balance bars,
  nayin row, Favor/Avoid chips) in at least 1 theme — confirm zero visual change.
  Commit: `feat(r3): móvil importa colores de dominio de @aluna/core (borra EL_COLOR/consts locales)`

---

### Task 4: Web `.card` global primitive — define classes

Seeds `.card` from the orphaned `.glass` (`apps/web/app/globals.css:56-61`, currently used
by 0 `.tsx` files) and adds the 4 modifiers. This task ONLY adds CSS — no consumer
migrates yet (that's tasks 5-6), so the gate is purely "nothing broke" (the new classes
are unused dead CSS until the next tasks reference them).

**Files:**
- Modify: `apps/web/app/globals.css`

- [ ] **Step 1:** Replace the orphaned `.glass` block (lines 55-61) with `.card` + 4 modifiers.
  Keep `.glass` too if anything still references it — `grep -rn "styles\.glass\|className.*glass" apps/web` first; the R3 brief says it's used by 0 `.tsx` today, so it is safe to fold into `.card` and delete `.glass` outright if the grep confirms zero consumers.

  ```css
  /* ----------------------------------------------------------------
     R3: primitivo .card — base + 4 modificadores. Semilla: la antigua
     .glass (huérfana, 0 consumidores). Ver docs/redesign/R3-sistema.md.
  ----------------------------------------------------------------- */
  .card {
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    padding: var(--sp-5);
  }
  /* Radio menor (16px) + padding más compacto — bloques Pro / mini-tarjetas del núcleo. */
  .card--tight {
    border-radius: var(--radius);
  }
  /* Superficie con feedback de hover — tiles/tarjetas clicables (hub, day-number). */
  .card--interactive {
    transition: transform var(--dur-fast) var(--ease-spring),
      border-color var(--dur-fast) var(--ease), box-shadow var(--dur-fast) var(--ease);
  }
  .card--interactive:hover {
    transform: translateY(-3px);
    border-color: rgba(var(--acc-rgb), 0.45);
    box-shadow: var(--glow-soft);
  }
  /* Estado vacío/durmiente — borde punteado, surface-2. */
  .card--dashed {
    border: 1px dashed rgba(var(--acc-rgb), 0.35);
    background: var(--surface-2);
    border-radius: var(--radius-lg);
  }
  /* Elevada — flagship login/signup. */
  .card--elevated {
    box-shadow: var(--elev);
    backdrop-filter: blur(8px);
  }
  ```

  Note: `.card--tight` and `.card--dashed` only override what differs from `.card` base —
  consumers apply BOTH classes together (`"card card--tight"`, not `"card--tight"` alone),
  since the modifiers don't repeat `background`/`padding`/`border`.

- [ ] **Step 2: Gate + commit**
  `cd apps/web && npx tsc --noEmit && npx vitest run && rm -rf .next && npx next build` → verde (new CSS is inert until consumed).
  Commit: `feat(r3): primitivo .card global (base + 4 modificadores) en globals.css`

---

### Task 5: Web `.card` — migrate group 1 (exact-recipe matches)

These 7 blocks are ALREADY byte-identical (or near-identical, modulo their own
margin/padding tweaks) to one of the 4 recipes from task 4 — lowest-risk migrations
first.

**Files:**
- Modify: `apps/web/app/(app)/informe/informe.module.css` (`.card`, lines 9-12)
- Modify: `apps/web/app/(app)/pilares/pilares.module.css` (`.card`, line 129)
- Modify: `apps/web/app/(app)/compatibilidad/compat.module.css` (`.overall`, lines 45-48)
- Modify: `apps/web/components/auth.module.css` (`.card`, lines 24-32)
- Modify: `apps/web/app/(app)/carta/carta.module.css` (`.big` line 57, `.card` line 88)
- Modify: `apps/web/app/(app)/numeros/numerology-view.module.css` (`.card`, line 82)
- Modify the corresponding `.tsx` consumers to add the global `card`/`card--tight`/`card--elevated` class strings.

- [ ] **Step 1: `.card` base — informe.card, pilares.card, compat.overall, auth.card+elevated**

  `informe.module.css:9-12` before:
  ```css
  .card {
    border: 1px solid var(--line); border-radius: var(--radius-lg);
    background: var(--surface); padding: var(--sp-5);
  }
  ```
  after (trim to nothing — the recipe is now 100% covered by the global `.card`; if the
  class needs to stay as a CSS-Modules hook for the `.tsx`, leave it empty or delete and
  update the consumer to use the literal `"card"` string):
  ```css
  /* .card migrado al primitivo global (globals.css) — ver informe-view.tsx: className="card" */
  ```
  `informe-view.tsx` consumer: `className={styles.card}` → `className="card"`.

  `pilares.module.css:129` (Lámina Pro sections) — identical recipe, same treatment.
  `pilares-view.tsx`/`pro-lamina.tsx` consumers (`SectionCard`/`.card` usages): `styles.card` → `"card"`.

  `compat.module.css:45-48` (`.overall`) — matches `.card` base exactly PLUS its own
  `margin`/`overflow: hidden` (the `::before` glow pseudo needs `overflow:hidden` to stay
  local). Keep `.overall` as a thin CSS-Module class carrying only the extras:
  ```css
  .overall { margin: var(--sp-2) 0 var(--sp-5); overflow: hidden; }
  .overall::before { /* unchanged */ }
  ```
  `compat-view.tsx` consumer: `className={styles.overall}` → `` className={`card ${styles.overall}`} ``.

  `auth.module.css:24-32` (`.card`) — matches `.card` base PLUS `box-shadow:var(--elev)` +
  `backdrop-filter:blur(8px)` (= `.card--elevated`) PLUS its own `animation`. Keep:
  ```css
  .card { animation: aluna-rise-in var(--dur) var(--ease) both; }
  ```
  `login/page.tsx` + `signup/page.tsx` consumers: `className={styles.card}` → `` className={`card card--elevated ${styles.card}`} ``.

- [ ] **Step 2: `.card--tight` — carta.big/.card, numerology.pro.card**

  `carta.module.css:88` (`.card`, Pro block) before:
  ```css
  .card { border: 1px solid var(--line); border-radius: var(--radius); background: var(--surface); padding: var(--sp-5); }
  ```
  after: delete (100% covered by `card card--tight`); consumer `styles.card` → `"card card--tight"`.

  `numerology-view.module.css:82` — identical, same treatment.

  `carta.module.css:57` (`.big`, core Sol/Luna/Asc mini-cards) before:
  ```css
  .big { display: flex; flex-direction: column; align-items: center; gap: var(--sp-1); padding: var(--sp-3) var(--sp-1); text-align: center; border: 1px solid var(--line); border-radius: var(--radius); background: var(--surface); }
  ```
  after (trim to the layout-only parts NOT covered by `.card`/`.card--tight`; padding
  differs from the base `--sp-5` uniform padding, so it must stay local and override):
  ```css
  .big { display: flex; flex-direction: column; align-items: center; gap: var(--sp-1); padding: var(--sp-3) var(--sp-1); text-align: center; }
  ```
  Consumer (`carta-view.tsx`): `className={`${styles.big} ${dim ? styles.bigDim : ""}`}` → `` className={`card card--tight ${styles.big} ${dim ? styles.bigDim : ""}`} `` (verify class order — the last class's `padding` must win over `.card`'s in specificity, which holds since both are single-class selectors of equal specificity and `.big`'s CSS Module hash is emitted after `globals.css` in the page's stylesheet — if the browser check shows the base `--sp-5` padding winning instead, add `!important`-free fix: keep `.big`'s selector as `.card.big` in the CSS-module file to raise specificity, OR confirm import order; flag in the review if this needs adjustment).

- [ ] **Step 3: Gate + browser verification**
  `cd apps/web && npx tsc --noEmit && npx vitest run && rm -rf .next && npx next build` → verde.
  Controller: open Informe, Pilares (Pro lámina), Compatibilidad (overall band), Login,
  Signup, Carta (Sol/Luna/Asc core + Pro block), Números (Pro block) in Observatory
  dark/light — confirm all 7 surfaces render identically (radii, padding, borders,
  shadows unchanged — this migration should be a visual no-op by construction).
  Commit: `feat(r3): .card — migra informe/pilares/compat/auth/carta/numerology (grupo exacto)`

---

### Task 6: Web `.card` — migrate group 2 (interactive + dashed + 14px cluster)

**Files:**
- Modify: `apps/web/app/(app)/hoy/day-number.module.css` (`.card`, lines 6-26)
- Modify: `apps/web/app/(app)/hoy/hub.module.css` (`.tile` lines 12-21, `.weatherCard` lines 33-39)
- Modify: `apps/web/app/(app)/compatibilidad/compat.module.css` (`.empty`, lines 109-110)
- Modify: `apps/web/app/(app)/informe/informe.module.css` (`.dormant`/`.plusTease`/`.emptyProfile`, lines 40-43)
- Modify: `apps/web/app/(app)/numeros/numerology-view.module.css` (`.gatedNote`, lines 152-155)
- Modify: `apps/web/app/(app)/preguntar/chat.module.css` (`.dormant`, lines 36-39)
- Modify: `apps/web/app/(app)/ajustes/settings.module.css` (`.tc`, line 33 — token-only, no reclass)
- Modify: `apps/web/app/(app)/numeros/numerology-view.module.css` (`.practiceBlock`, line 123 — token-only)
- Modify: `apps/web/app/(app)/pilares/pilares.module.css` (`.luckCol`, line 161 — token-only)
- Modify corresponding `.tsx` consumers.

- [ ] **Step 1: `.card--interactive` — hoy.day-number.card, hub.tile, hub.weatherCard**

  `day-number.module.css:6-26` before:
  ```css
  .card {
    position: relative; z-index: 1; display: flex; align-items: center; gap: var(--sp-4);
    padding: var(--sp-4) var(--sp-5); margin-bottom: var(--sp-6);
    border: 1px solid var(--line); border-radius: var(--radius-lg); background: var(--surface);
    transition: transform var(--dur-fast) var(--ease-spring), border-color var(--dur-fast) var(--ease), box-shadow var(--dur-fast) var(--ease);
  }
  .card:hover { transform: translateY(-3px); border-color: rgba(var(--acc-rgb), 0.45); box-shadow: var(--glow-soft); }
  ```
  after (keep only what `.card--interactive` doesn't cover — the flex layout, the
  non-uniform padding, and the margin):
  ```css
  .card {
    position: relative; z-index: 1; display: flex; align-items: center; gap: var(--sp-4);
    padding: var(--sp-4) var(--sp-5); margin-bottom: var(--sp-6);
  }
  ```
  Consumer (`day-number-card.tsx`): `styles.card` → `` `card card--interactive ${styles.card}` ``.

  `hub.module.css:12-21` (`.tile`) before:
  ```css
  .tile {
    display: flex; flex-direction: column; gap: var(--sp-3); min-height: 116px; padding: var(--sp-4);
    border: 1px solid var(--line); border-radius: var(--radius-lg); background: var(--surface);
    position: relative;
    transition: transform var(--dur-fast) var(--ease-spring), border-color var(--dur-fast) var(--ease), box-shadow var(--dur-fast) var(--ease);
  }
  a .tile:hover { transform: translateY(-3px); border-color: rgba(var(--acc-rgb), 0.45); box-shadow: var(--glow-soft); }
  ```
  after (the `a .tile:hover` ancestor-selector quirk goes away — `.card--interactive:hover`
  is a direct pseudo-class on the class itself, which fires correctly since `.tile` fills
  the `<Link>`'s clickable area):
  ```css
  .tile { display: flex; flex-direction: column; gap: var(--sp-3); min-height: 116px; padding: var(--sp-4); position: relative; }
  ```
  Consumer (`hub-view.tsx:89`): `` `${styles.tile} ${l.soon ? styles.soon : ""} reveal` `` → `` `card card--interactive ${styles.tile} ${l.soon ? styles.soon : ""} reveal` ``.

  `hub.module.css:33-39` (`.weatherCard`) — same pattern, but its `:hover` is already a
  direct pseudo-class (`.weatherCard:hover`, since `weatherCard` IS the `<Link>`'s own
  className) — this is the inconsistency the brief calls out ("unifica el `a .tile:hover`
  vs `.weatherCard:hover`"): after this step both surfaces get their hover behavior from
  the SAME shared rule (`.card--interactive:hover`), so the two previously-inconsistent
  local rules both disappear.
  ```css
  .weatherCard { display: flex; flex-direction: column; gap: var(--sp-2); padding: var(--sp-4); margin-bottom: var(--sp-6); }
  ```
  Consumer (`hub-view.tsx:63`): `` `${styles.weatherCard} reveal` `` → `` `card card--interactive ${styles.weatherCard} reveal` ``.

- [ ] **Step 2: `.card--dashed` — compat.empty, informe.dormant/.plusTease/.emptyProfile, numerology.gatedNote, chat.dormant**

  These 5 blocks converge from 3 different radii (22px, 18px, 14px) to ONE (`--radius-lg`,
  22px). `compat.empty` is already 22px (no visible change). `chat.dormant` moves 18→22px
  (small, screenshot-check). `informe.dormant`/`.plusTease`/`.emptyProfile` and
  `numerology.gatedNote` move 14→22px (the larger jump in this cluster — explicit
  screenshot-check, per the brief's own flag on this convergence).

  `compat.module.css:109-110` before:
  ```css
  .empty { position: relative; z-index: 1; margin-top: var(--sp-7); text-align: center; padding: var(--sp-6) var(--sp-5);
    border: 1px dashed rgba(var(--acc-rgb), 0.35); border-radius: var(--radius-lg); background: var(--surface-2); }
  ```
  after:
  ```css
  .empty { margin-top: var(--sp-7); text-align: center; padding: var(--sp-6) var(--sp-5); }
  ```
  Consumer: `styles.empty` → `` `card card--dashed ${styles.empty}` ``.

  `informe.module.css:40-43` before:
  ```css
  .dormant, .plusTease, .emptyProfile {
    text-align: center; padding: var(--sp-5); border: 1px dashed rgba(var(--acc-rgb), 0.35);
    border-radius: 14px; background: var(--surface-2);
  }
  ```
  after:
  ```css
  .dormant, .plusTease, .emptyProfile { text-align: center; padding: var(--sp-5); }
  ```
  Consumer (`informe-view.tsx`, 3 sites): each `styles.dormant`/`styles.plusTease`/`styles.emptyProfile` → prefixed with `"card card--dashed "`.

  `numerology-view.module.css:152-155` (`.gatedNote`) before:
  ```css
  .gatedNote {
    margin: 0; text-align: center; font-size: var(--text-xs); font-style: italic; line-height: 1.6; color: var(--soft);
    padding: var(--sp-3) var(--sp-4); border: 1px dashed rgba(var(--acc-rgb), 0.35); border-radius: 14px; background: var(--surface-2);
  }
  ```
  after:
  ```css
  .gatedNote { margin: 0; text-align: center; font-size: var(--text-xs); font-style: italic; line-height: 1.6; color: var(--soft); padding: var(--sp-3) var(--sp-4); }
  ```
  Consumer: `styles.gatedNote` → `` `card card--dashed ${styles.gatedNote}` ``.

  `chat.module.css:36-39` (`.dormant`) before:
  ```css
  .dormant {
    margin: var(--sp-6) auto; max-width: 32ch; text-align: center;
    display: flex; flex-direction: column; align-items: center; gap: var(--sp-2);
    padding: var(--sp-5) var(--sp-5); border: 1px dashed rgba(var(--acc-rgb), 0.35); border-radius: 18px; background: var(--surface-2);
  }
  ```
  after:
  ```css
  .dormant { margin: var(--sp-6) auto; max-width: 32ch; text-align: center; display: flex; flex-direction: column; align-items: center; gap: var(--sp-2); padding: var(--sp-5) var(--sp-5); }
  ```
  Consumer: `styles.dormant` → `` `card card--dashed ${styles.dormant}` ``.

- [ ] **Step 3: 14px cluster — token-only normalization (NOT reclassed to `.card`)**

  These 3 remaining 14px occurrences are genuinely one-off shapes (different background —
  `surface-2`, `none` — not the `.card` base's `surface`), so per the brief's own "one-offs
  NOT forced into `.card`" list they stay as local classes; only their hardcoded radius
  becomes the token. This closes out the "7× 14px hardcoded" inventory finding (4 of the 7
  were the dashed cluster in Step 2 above — `.dormant`/`.plusTease`/`.emptyProfile` count
  as 3 selectors sharing 1 rule + `.gatedNote` = 4; these 3 are the rest).

  `settings.module.css:33`: `border-radius: 14px;` → `border-radius: var(--radius);` (delta 2px — screenshot-check; this is also on the "one-off tile family" list alongside `onboarding.gender`, explicitly NOT forced into `.card`).
  `numerology-view.module.css:123` (`.practiceBlock`): `border-radius: 14px;` → `border-radius: var(--radius);`.
  `pilares.module.css:161` (`.luckCol`): `border-radius: 14px;` → `border-radius: var(--radius);`.

- [ ] **Step 4: Named one-offs — confirm NO changes (verification only, no diff)**

  Confirm these stay exactly as-is (no `.card` class added, no radius token change beyond
  what's already tokenized) — this is a checklist, not a code change:
  - `numerology-view.module.css:11-23` `.hero` (gradient + acc border + tap-scale — flagship, semantic gradient).
  - `chat.module.css:24-33` `.msg`/`.user`/`.aluna` (asymmetric bubble corners — semantic bubble shape).
  - `bottom-sheet.module.css:13-49` `.sheet`/`.modal` (`--bg` background, drawer chrome, 24/26px radii — NOT `--surface`, structurally different from `.card`).
  - `onboarding.module.css:99-116` `.gender` (selectable tile family, paired with `settings.tc` above — both explicitly out of `.card`).

- [ ] **Step 5: Gate + browser verification**
  `cd apps/web && npx tsc --noEmit && npx vitest run && rm -rf .next && npx next build` → verde.
  Controller: open Hoy (day-number card, hub tiles, weather card hover), Compatibilidad
  (empty state), Informe (dormant/plusTease/emptyProfile), Números (gatedNote), Preguntar
  (chat dormant), Ajustes (theme tiles) in Observatory + Aurora + Cosmic — confirm the
  radius convergence (14/18px → 22px on the dashed cluster; 14→16px on the token-only 3)
  reads as an intentional, not broken, size change. Screenshot the dashed cluster
  before/after since that's the largest visual delta in this task.
  Commit: `feat(r3): .card--interactive + .card--dashed + normaliza el radio 14px huérfano`

---

### Task 7: Web chip primitives

Two primitives: `.chip` (static tag/display, optionally `.chip--pill`) and
`.chip--control` (interactive pill, with `.chip--control-on`/`-disabled`/`-outline`
modifiers). Adds `--tone-caution` for the two duplicated warn-chip literals.

**Files:**
- Modify: `apps/web/app/globals.css` (define primitives + `--tone-caution` reference)
- Modify: `apps/web/lib/theme/tokens.css` (add `--tone-caution` token)
- Modify: `apps/web/app/(app)/carta/carta.module.css` (`.chip`, `.tag`/`.tagWarn`, `.ctrl`/`.ctrlOn`)
- Modify: `apps/web/app/(app)/numeros/numerology-view.module.css` (`.chip`/`.chipWarn`)
- Modify: `apps/web/app/(app)/pilares/pilares.module.css` (`.god`/`.godSelf`, `.dayTag`, `.chip`/`.chipDim` → pill, `.scriptBtn`/`.scriptOn`)
- Modify: `apps/web/app/(app)/hoy/hub.module.css` (`.badge`)
- Modify: `apps/web/app/(app)/hoy/day-number.module.css` (`.chip` → rename, not a chip)
- Modify: `apps/web/app/(app)/compatibilidad/compat.module.css` (`.chip`/`.chipOn`/`.chipDot`/`.chipDisabled`)
- Modify corresponding `.tsx` consumers.

- [ ] **Step 1: Token — `--tone-caution`**
  `tokens.css` `:root` block, next to `--tone-warm`/`--tone-cool`:
  ```css
  --tone-caution: #e0a07a; /* aviso/warn de chip — distinto eje que --tone-warm (tenso de aspecto) */
  ```
  This replaces the duplicated literal in `carta.module.css:125` (`.tagWarn { border-color: rgba(220, 120, 80, 0.6); color: #e0a07a; }`) and `numerology-view.module.css:87` (`.chipWarn`, identical literals) — both become `border-color: rgba(224, 160, 122, 0.6); color: var(--tone-caution);` (rgba computed from the same hex; keep the class-local border-color rgba since there's no `--tone-caution-rgb` triplet token in this codebase's convention — follow the `--acc-rgb` precedent if a rgba consumer is needed, i.e. add `--tone-caution-rgb: 224, 160, 122;` alongside).

- [ ] **Step 2: Define primitives in `globals.css`**
  ```css
  /* ----------------------------------------------------------------
     R3: primitivos de chip. Ver docs/redesign/R3-sistema.md.
  ----------------------------------------------------------------- */
  .chip {
    display: inline-flex; align-items: center; gap: var(--sp-1);
    border: 1px solid var(--line); border-radius: 9px;
    padding: var(--sp-1) var(--sp-3);
    font-size: var(--text-sm); color: var(--ink);
  }
  /* Outlier documentado: pilares Favor/Avoid + estrellas — pill 999px, no aplanar en .chip base. */
  .chip--pill { border-radius: 999px; }

  .chip--control {
    display: inline-flex; align-items: center; gap: var(--sp-2);
    padding: var(--sp-2) var(--sp-3); border: 1px solid var(--line); border-radius: 999px;
    background: var(--surface); font-family: inherit; font-size: var(--text-xs); font-weight: 600;
    color: var(--soft); cursor: pointer;
    transition: color var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease), background var(--dur-fast) var(--ease);
  }
  .chip--control:hover { color: var(--ink); }
  .chip--control-on {
    color: var(--ink-on-acc);
    background: linear-gradient(90deg, rgba(var(--acc-rgb), 1), rgba(var(--acc-rgb), 0.8));
    border-color: transparent;
    box-shadow: var(--glow-soft);
  }
  .chip--control-disabled { opacity: 0.32; cursor: not-allowed; pointer-events: none; }
  /* pilares.scriptBtn: activo = SOLO borde+texto, sin relleno — variante, no aplanar a -on. */
  .chip--control-outline.chip--control-on {
    background: transparent; color: var(--acc); border-color: var(--acc); box-shadow: none;
  }
  ```

- [ ] **Step 3: Migrate tag/display chips → `.chip`**

  `pilares.module.css:73-80` (`.god`/`.godSelf`) before:
  ```css
  .god {
    font-family: var(--font-ui); font-size: var(--text-2xs); line-height: 1.25; font-weight: 700;
    letter-spacing: 0.3px; text-align: center; text-transform: uppercase; color: var(--acc);
    border: 1px solid rgba(var(--acc-rgb), 0.3); border-radius: 6px;
    padding: var(--sp-1) var(--sp-1); min-height: 24px; display: flex; align-items: center; justify-content: center;
  }
  .godSelf { border-color: transparent; background: rgba(var(--acc-rgb), 0.12); font-size: var(--text-2xs); }
  ```
  after (keep the class-local typographic/layout specifics that `.chip` doesn't cover — the
  `.chip` primitive supplies border/radius/padding/font-size baseline, `.god` overrides
  border-color/radius/padding/min-height/layout to keep its distinct small-badge shape —
  since this doesn't cleanly reduce to `.chip` unmodified, keep `.god`/`.godSelf` as their
  own class combined with `.chip` for the shared color/family baseline only):
  ```css
  .god {
    line-height: 1.25; font-weight: 700; letter-spacing: 0.3px; text-align: center; text-transform: uppercase;
    color: var(--acc); border-color: rgba(var(--acc-rgb), 0.3); border-radius: 6px;
    padding: var(--sp-1) var(--sp-1); min-height: 24px; display: flex; align-items: center; justify-content: center;
  }
  .godSelf { border-color: transparent; background: rgba(var(--acc-rgb), 0.12); }
  ```
  Consumer (`pilares-view.tsx:137`): `` `${styles.god} ${isDay ? styles.godSelf : ""}` `` → `` `chip ${styles.god} ${isDay ? styles.godSelf : ""}` ``.

  `pilares.module.css:34-38` (`.dayTag`) — same pattern: keep the class for its
  color/border-radius specifics, add `chip` for the shared baseline. Consumer
  (`pilares-view.tsx:160`): `styles.dayTag` → `` `chip ${styles.dayTag}` ``.

  `hub.module.css:25-30` (`.badge`) — keep local (absolute positioning + its own
  background/border), add `chip` for baseline. Consumer (`hub-view.tsx:94`):
  `styles.badge` → `` `chip ${styles.badge}` ``.

  `carta.module.css:114` (`.chip`, Pro tech chips) and `:124-125` (`.tag`/`.tagWarn`, sheet
  meta) — both already match the `.chip` recipe almost exactly (border 1px, radius 9px,
  padding sp-1/sp-3). Trim to just the color override, add `chip` class. `.tagWarn` uses
  the new `--tone-caution` token (Step 1). Consumer (`carta-view.tsx`/`body-reading.tsx`
  sheet-meta usages): add `"chip "` prefix.

  `numerology-view.module.css:86-87` (`.chip`/`.chipWarn`) — same treatment, `.chipWarn`
  → `--tone-caution`.

  `pilares.module.css:153-154` (`.chip`/`.chipDim`, Favor/Avoid + stars — 999px radius) →
  **`.chip--pill`** (the explicit outlier, per brief). Before:
  ```css
  .chip { border: 1px solid var(--line); border-radius: 999px; padding: var(--sp-1) var(--sp-3); font-size: var(--text-sm); color: var(--ink); }
  .chipDim { opacity: 0.6; }
  ```
  after:
  ```css
  .chipDim { opacity: 0.6; }
  ```
  Consumer (`pro-lamina.tsx:121,125,186`): `` `${styles.chip} ${styles[`elBg_${el}`] ?? ""}` `` → `` `chip chip--pill ${styles[`elBg_${el}`] ?? ""}` ``; the `.elBg_*` Wu Xing override (background) is applied AFTER `chip`/`chip--pill` in class order and wins on equal specificity via source order in the same stylesheet load — verify in the browser pass that the Wu Xing tint still overrides the (now-removed) chip background correctly (since `.chip` doesn't set a `background`, this is actually simpler post-migration — `.elBg_*` sets it directly, no override contest).

  `day-number.module.css:73-83` (`.chip`) — **NOT a chip** (no border, no background —
  brief: "day-number.chip NO es chip visual"). Rename, do not migrate:
  ```css
  .stat { font-family: var(--font-ui); font-size: var(--text-2xs); letter-spacing: 0.3px; color: var(--soft); }
  .stat b { color: var(--ink); font-weight: 600; font-variant-numeric: tabular-nums; }
  ```
  Consumer (`day-number-card.tsx`): `styles.chip` → `styles.stat` (class name only, zero visual change).

- [ ] **Step 4: Migrate control chips → `.chip--control`**

  `compat.module.css:16-29` (`.chip`/`.chipOn`/`.chipDot`/`.chipDisabled`, person-picker,
  already pill) before:
  ```css
  .chip {
    display: inline-flex; align-items: center; gap: var(--sp-2);
    padding: var(--sp-2) var(--sp-3); border: 1px solid var(--line); border-radius: 999px; background: var(--surface);
    font-family: var(--font-ui); font-size: var(--text-xs); font-weight: 600; color: var(--soft); cursor: pointer;
    transition: color var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease), background var(--dur-fast) var(--ease);
  }
  .chip:hover { color: var(--ink); }
  .chipOn { color: var(--ink-on-acc); background: linear-gradient(90deg, rgba(var(--acc-rgb), 1), rgba(var(--acc-rgb), 0.8)); border-color: transparent; box-shadow: var(--glow-soft); }
  .chipOn .chipDot { background: rgba(26, 19, 5, 0.18); color: var(--ink-on-acc); }
  .chipDot { display: inline-grid; place-items: center; width: 19px; height: 19px; border-radius: 50%; background: var(--surface-2); color: var(--acc); font-size: var(--text-2xs); font-weight: 700; font-family: var(--font-display); }
  .chipDisabled { opacity: 0.32; cursor: not-allowed; pointer-events: none; }
  ```
  after — this recipe is now 100% covered by `.chip--control`/`.chip--control-on`/`.chip--control-disabled`; keep only `.chipDot` (unique to this consumer, the letter-avatar circle):
  ```css
  .chipOn .chipDot { background: rgba(26, 19, 5, 0.18); color: var(--ink-on-acc); }
  .chipDot { display: inline-grid; place-items: center; width: 19px; height: 19px; border-radius: 50%; background: var(--surface-2); color: var(--acc); font-size: var(--text-2xs); font-weight: 700; font-family: var(--font-display); }
  ```
  Consumer (`compat-view.tsx`): `styles.chip`/`styles.chipOn`/`styles.chipDisabled` → `"chip--control"`/`"chip--control-on"`/`"chip--control-disabled"` (combined per-instance); `styles.chipDot` stays as-is (local, unchanged class name).

  `carta.module.css:24-30` (`.ctrl`/`.ctrlOn`, houses/zodiac controls, radius 18px) →
  `.chip--control`/`.chip--control-on` (radius 18→999px — **visible shape change,
  screenshot-check**, per brief). Consumer (`carta-view.tsx:137,145` + `body-reading.tsx:145`):
  `` `${styles.ctrl} ${on ? styles.ctrlOn : ""}` `` → `` `chip--control ${on ? "chip--control-on" : ""}` `` (drop the now-empty local classes once verified no other rule references them).

  `pilares.module.css:121-125` (`.scriptBtn`/`.scriptOn`) → `.chip--control
  .chip--control-outline` base classes, toggling `.chip--control-on`:
  ```
  before: className={`${styles.scriptBtn} ${on ? styles.scriptOn : ""}`}
  after:  className={`chip--control chip--control-outline ${on ? "chip--control-on" : ""}`}
  ```
  Delete `.scriptBtn`/`.scriptOn` from `pilares.module.css` once confirmed no other
  consumer references them.

- [ ] **Step 5: Gate + browser verification**
  `cd apps/web && npx tsc --noEmit && npx vitest run && rm -rf .next && npx next build` → verde.
  Controller: open Carta (Pro chips, sheet tags incl. `.tagWarn`, house/zodiac controls —
  radius 18→999 change), Números (Pro chips incl. `.chipWarn`), Pilares (god/dayTag chips,
  Favor/Avoid pill chips with Wu Xing tint intact, script switch outline behavior), Hoy
  (soon badge), Compatibilidad (person-picker pill+dot+disabled state) in Observatory +
  Aurora + Cosmic. Confirm: Wu Xing tint on Favor/Avoid still overrides correctly; scriptBtn
  active state shows border+text only (no fill); ctrl radius change reads intentional.
  Commit: `feat(r3): primitivos .chip / .chip--control(-on/-disabled/-outline/-pill) + --tone-caution`

---

### Task 8: Web `.seg` unified

**Files:**
- Modify: `apps/web/app/globals.css` (define `.seg`/`.seg__item`/`.seg__item--active`/`.seg--gradient`)
- Modify: `apps/web/app/(app)/carta/carta.module.css` (`.kindRow`/`.kindBtn`/`.kindOn`)
- Modify: `apps/web/app/(app)/numeros/numerology-view.module.css` (`.tierRow`/`.tier`/`.tierOn`)
- Modify: `apps/web/app/(app)/ajustes/settings.module.css` (`.seg`/`.segItem`/`.segOn`, and new `.planActions`/`.planBtn` for plan-card.tsx)
- Modify: `apps/web/app/(app)/hoy/energy.module.css` (`.periods`/`.period`/`.periodOn`, incl. `#14132a` retirement)
- Modify: `apps/web/app/(app)/ajustes/plan-card.tsx` (repoint off `.seg`)
- Modify corresponding `.tsx` consumers.

**Correction against the brief:** the brief's "CÓDIGO MUERTO — BORRAR" claim (hub.module.css
having a dead `.periods`/`.period`/`.periodOn` block) does not match current source —
verified by grep: `apps/web/app/(app)/hoy/hub.module.css` has NO such block today (47
lines total, confirmed), and `hub-view.tsx` never references "period". Only
`energy.module.css` has this block, and it IS live (rendered by `energy-panel.tsx:83-90`).
**Skip the deletion step entirely** — there is nothing to delete in `hub.module.css`. Only
migrate the live block in `energy.module.css` (Step 3 below).

- [ ] **Step 1: Define primitives in `globals.css`**
  ```css
  /* ----------------------------------------------------------------
     R3: primitivo .seg (segmentado). Ver docs/redesign/R3-sistema.md.
  ----------------------------------------------------------------- */
  .seg {
    display: flex; gap: var(--sp-1); padding: var(--sp-1);
    background: var(--surface-2); border: 1px solid var(--line); border-radius: var(--radius);
  }
  .seg__item {
    flex: 1; border: 0; border-radius: calc(var(--radius) - 5px);
    background: transparent; color: var(--soft); font-family: inherit; cursor: pointer;
    transition: color var(--dur-fast) var(--ease), background var(--dur-fast) var(--ease);
  }
  .seg__item:hover { color: var(--ink); }
  /* Relleno plano — settings (modo de luz, idioma), energy (periodo). */
  .seg__item--active {
    background: var(--acc); color: var(--ink-on-acc); box-shadow: var(--glow-soft); font-weight: 600;
  }
  /* Relleno gradiente — flagship carta/numerología, NO aplanar a plano. */
  .seg--gradient .seg__item--active {
    background: linear-gradient(90deg, rgba(var(--acc-rgb), 1), rgba(var(--acc-rgb), 0.8));
  }
  ```

- [ ] **Step 2: Migrate flagship gradient segs — carta.kindRow, numerology.tierRow**

  `carta.module.css:11-18` before:
  ```css
  .kindRow { position: relative; z-index: 1; display: flex; gap: var(--sp-1); padding: var(--sp-1); border: 1px solid var(--line); border-radius: 16px; background: var(--surface-2); margin-bottom: var(--sp-2); }
  .kindBtn { flex: 1; min-width: 0; padding: var(--sp-2) var(--sp-1); border: 0; border-radius: 11px; background: transparent; font-family: var(--font-display); font-size: var(--text-sm); line-height: 1.15; color: var(--soft); cursor: pointer; transition: color var(--dur-fast) var(--ease), background var(--dur-fast) var(--ease); }
  .kindBtn:hover { color: var(--ink); }
  .kindOn { color: var(--ink-on-acc); background: linear-gradient(90deg, rgba(var(--acc-rgb), 1), rgba(var(--acc-rgb), 0.8)); box-shadow: var(--glow-soft); }
  ```
  after (keep the `.kindBtn` display-family override — `font-family: var(--font-display)`
  is specific to this consumer, not part of the shared `.seg__item`):
  ```css
  .kindRow { position: relative; z-index: 1; margin-bottom: var(--sp-2); }
  .kindBtn { min-width: 0; padding: var(--sp-2) var(--sp-1); font-family: var(--font-display); font-size: var(--text-sm); line-height: 1.15; }
  ```
  Consumer (`carta-view.tsx:117,124`):
  ```
  before: <div className={styles.kindRow} role="tablist" ...>
            <button className={`${styles.kindBtn} ${kind === k ? styles.kindOn : ""}`}>
  after:  <div className={`seg seg--gradient ${styles.kindRow}`} role="tablist" ...>
            <button className={`seg__item ${styles.kindBtn} ${kind === k ? "seg__item--active" : ""}`}>
  ```

  `numerology-view.module.css:128-137` (`.tierRow`/`.tier`/`.tierOn`) — identical pattern,
  same treatment. Consumer: wherever `.tierRow`/`.tier`/`.tierOn` render (numerology-view.tsx
  or number-reading.tsx — locate via grep for `styles.tierRow`).

- [ ] **Step 3: Migrate flat segs — settings.seg, energy.periods (incl. `#14132a` retirement)**

  `settings-controls.tsx:24-26,47-49` (2 real `.seg` uses: light mode, language) — direct
  1:1 recipe match. `settings.module.css:10-27` before:
  ```css
  .seg { display: flex; gap: var(--sp-1); background: var(--surface-2); border: 1px solid var(--line); border-radius: 13px; padding: var(--sp-1); }
  .segItem { flex: 1; text-align: center; padding: var(--sp-3) var(--sp-2); font-size: var(--text-sm); font-weight: 600; color: var(--soft); background: transparent; border: none; border-radius: 9px; cursor: pointer; transition: color var(--dur-fast) var(--ease), background var(--dur-fast) var(--ease); }
  .segItem:hover { color: var(--ink); }
  .segOn { background: var(--acc); color: var(--ink-on-acc); box-shadow: var(--glow-soft); }
  ```
  after: delete entirely (100% covered by `.seg`/`.seg__item`/`.seg__item--active`).
  Consumer (`settings-controls.tsx:24,26,47,49`): `styles.seg` → `"seg"`; `` `${styles.segItem} ${on ? styles.segOn : ""}` `` → `` `seg__item ${on ? "seg__item--active" : ""}` ``.

  `energy.module.css:11-26` (`.periods`/`.period`/`.periodOn`) before:
  ```css
  .periods { display: inline-flex; gap: var(--sp-1); padding: var(--sp-1); border: 1px solid var(--line); border-radius: 999px; background: var(--surface); }
  .period { font-family: var(--font-ui); font-size: var(--text-2xs); letter-spacing: 0.3px; color: var(--soft); background: none; border: 0; cursor: pointer; padding: var(--sp-1) var(--sp-3); border-radius: 999px; transition: color var(--dur-fast) var(--ease), background var(--dur-fast) var(--ease); }
  .period:hover { color: var(--ink); }
  .periodOn {
    color: #14132a; /* ink-sobre-acento local (azul marino, ≠ --ink-on-acc marrón): candidato a token propio — decisión de diseño pendiente */
    background: var(--acc); font-weight: 600;
    box-shadow: var(--glow-soft);
  }
  ```
  after — note this consumer's track is a 999px pill (not the `.seg` 16px `--radius`
  track), so `.periods` stays local for its radius/background, using `.seg__item`/`--active`
  for the item styling only. **This step replaces `#14132a` with `var(--ink-on-acc)` — a
  real visible color change (navy → the current global brown) in the default dark theme;
  task 12 (on-accent theme-aware) will further refine this per theme×mode. Screenshot both
  states.**
  ```css
  .periods { display: inline-flex; gap: var(--sp-1); padding: var(--sp-1); border: 1px solid var(--line); border-radius: 999px; background: var(--surface); }
  .period { font-family: var(--font-ui); font-size: var(--text-2xs); letter-spacing: 0.3px; padding: var(--sp-1) var(--sp-3); border-radius: 999px; }
  ```
  Consumer (`energy-panel.tsx:83,90`): `styles.periods` → `styles.periods` (stays, local
  track shape); `` `${styles.period} ${p === period ? styles.periodOn : ""}` `` → `` `seg__item ${styles.period} ${p === period ? "seg__item--active" : ""}` ``. Delete `.periodOn` from the CSS file (fully covered by `.seg__item--active`).

- [ ] **Step 4: Repoint plan-card.tsx off `.seg`**

  `plan-card.tsx:81-82,85-86,97` misuses `styles.seg`/`styles.segItem` (from
  `settings.module.css`) for 3 plain checkout/portal buttons with NO active state — since
  Step 3 just deleted `.seg`/`.segItem` from `settings.module.css`, this MUST be repointed
  in the same task (not a follow-up) or the build breaks. Add a plain button-group class
  to `settings.module.css`:
  ```css
  .planActions { display: flex; gap: var(--sp-1); padding: var(--sp-1); background: var(--surface-2); border: 1px solid var(--line); border-radius: 13px; }
  .planBtn { flex: 1; text-align: center; padding: var(--sp-3) var(--sp-2); font-size: var(--text-sm); font-weight: 600; color: var(--soft); background: transparent; border: none; border-radius: 9px; cursor: pointer; transition: color var(--dur-fast) var(--ease); }
  .planBtn:hover { color: var(--ink); }
  .planBtn:disabled { opacity: 0.5; cursor: default; }
  ```
  (This is literally the old `.seg`/`.segItem` recipe minus the active-state — kept local
  since it has no real "selected" semantics and doesn't belong in the shared `.seg`
  primitive per the brief's explicit call-out.)
  `plan-card.tsx`: 3 sites — `className={styles.seg}` → `className={styles.planActions}`; 3× `className={styles.segItem}` → `className={styles.planBtn}`.

- [ ] **Step 5: Gate + browser verification**
  `cd apps/web && npx tsc --noEmit && npx vitest run && rm -rf .next && npx next build` → verde.
  Controller: open Carta (kind selector, gradient active fill), Números (tier selector,
  gradient), Ajustes (light-mode + language segs — flat fill; theme/plan section — plain
  button group, no active pill), Hoy (energy period selector — flat fill, `#14132a`→
  `--ink-on-acc` navy→brown shift) in Observatory dark/light. Confirm the gradient vs flat
  distinction still reads correctly (this is the flagship-preserving check).
  Commit: `feat(r3): primitivo .seg (+ .seg--gradient) — carta/numerology/settings/energy; repunta plan-card.tsx`

---

### Task 9: On-accent theme×mode-aware (web)

Highest visual-risk task in this plan — the actual WCAG fix (decision 1). Mirrors the
mobile `onAcc` values exactly (`apps/mobile/theme/tokens.ts` `makeTokens()`).

**Files:**
- Modify: `apps/web/lib/theme/tokens.css`

- [ ] **Step 1: Add per-theme×mode `--ink-on-acc` overrides**

  Exact source values (from `apps/mobile/theme/tokens.ts` `makeTokens()`, read directly):
  | theme | mode | `onAcc` |
  |---|---|---|
  | observatory | dark (default) | `#070a1c` |
  | observatory | light | `#fffaf2` |
  | aurora | light (default) | `#ffffff` |
  | aurora | dark | `#1c1730` |
  | cosmic | dark (default) | `#1c0529` |
  | cosmic | light | `#ffffff` |

  `tokens.css` — update the `:root` fallback (currently `--ink-on-acc: #1a1305;`, line 39)
  to the observatory-dark value (the real default of `<html data-theme="observatory"
  data-mode="dark">` per `layout.tsx:19`):
  ```css
  --ink-on-acc: #070a1c; /* fallback = observatory dark, el default real de <html> (layout.tsx) */
  ```
  Add `--ink-on-acc` to each of the 6 theme×mode blocks, alongside their existing
  `--bg`/`--surface`/etc. declarations:
  ```css
  [data-theme="observatory"] { /* ...existing... */ --ink-on-acc: #070a1c; }
  [data-theme="observatory"][data-mode="light"] { /* ...existing... */ --ink-on-acc: #fffaf2; }
  [data-theme="aurora"] { /* ...existing... */ --ink-on-acc: #ffffff; }
  [data-theme="aurora"][data-mode="dark"] { /* ...existing... */ --ink-on-acc: #1c1730; }
  [data-theme="cosmic"] { /* ...existing... */ --ink-on-acc: #1c0529; }
  [data-theme="cosmic"][data-mode="light"] { /* ...existing... */ --ink-on-acc: #ffffff; }
  ```

- [ ] **Step 2: Confirm no remaining hardcoded on-accent literals**
  `grep -rn "#1a1305\|#14132a" apps/web` → 0 (both retired: `#1a1305` was the old single
  value everywhere `--ink-on-acc` is used; `#14132a` was retired in task 8 Step 3).

- [ ] **Step 3: Gate + browser verification (the real gate for this task)**
  `cd apps/web && npx tsc --noEmit && npx vitest run && rm -rf .next && npx next build` → verde.
  Controller: open every page that renders filled-accent text (CTAs, active `.chip--control`,
  active `.seg__item`, numerology hero pill, compat CTA/chipOn) across ALL 6 theme×mode
  combos (Observatory/Aurora/Cosmic × light/dark) — confirm text-on-accent is legible in
  every combo, especially the 3 LIGHT modes (the WCAG risk this task fixes: gold/pastel
  accents with near-white text used to read #1a1305 dark-brown-on-light, now reads
  near-white-on-light per the mobile-matched values — verify this doesn't invert into
  low-contrast white-on-light-gold; if `#fffaf2`/`#ffffff` on a light accent reads as
  LOWER contrast than the old dark value, flag immediately — this exact risk is what task
  11's axe pass formally checks, but a visual catch here is faster).
  Commit: `feat(r3): --ink-on-acc por tema×modo (espeja apps/mobile/theme/tokens.ts onAcc) — fix WCAG modos claros`

---

### Task 10: Mobile — extract `ToggleRow` primitive

Kills the byte-identical 3× `proToggle`/`proDot`/`proText` duplication
(`carta.tsx:237-240,445-451`, `numeros.tsx:130-133,341-354`, `pilares.tsx:257-260,832-838`
— all 3 confirmed byte-identical style objects and identical JSX shape).

**Files:**
- Modify: `apps/mobile/components/ui.tsx` (add `ToggleRow`)
- Modify: `apps/mobile/app/(tabs)/carta.tsx`
- Modify: `apps/mobile/app/(tabs)/numeros.tsx`
- Modify: `apps/mobile/app/(tabs)/pilares.tsx`

- [ ] **Step 1: `ToggleRow` in `ui.tsx`** (same pattern as `Card`/`Chip` — `useTheme()` + `useMemo` styles):
  ```tsx
  /**
   * Fila de interruptor "Modo Pro": pill bordeada + dot animable + label. Extraído de
   * 3 copias byte-idénticas (carta.tsx, numeros.tsx, pilares.tsx) — R3.
   */
  export function ToggleRow({
    label,
    on,
    onPress,
  }: {
    label: string;
    on: boolean;
    onPress: () => void;
  }) {
    const { t } = useTheme();
    const s = useMemo(() => makeToggleRow(t), [t]);
    return (
      <Pressable style={s.wrap} onPress={onPress}>
        <View style={[s.dot, on && s.dotOn]} />
        <Text style={s.text}>{label}</Text>
      </Pressable>
    );
  }

  function makeToggleRow(t: ThemeTokens) {
    return StyleSheet.create({
      wrap: {
        flexDirection: "row", alignItems: "center", gap: space.md,
        borderWidth: 1, borderColor: t.accHair, borderRadius: radius.pill,
        paddingHorizontal: space.xl, paddingVertical: space.md,
      },
      dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: t.accHair },
      dotOn: { backgroundColor: t.acc },
      text: { color: t.text, fontSize: typeScale.md, letterSpacing: 1, fontFamily: fonts.sans },
    });
  }
  ```
  Note: the 3 originals differ ONLY in `marginTop`/`alignSelf`/`marginTop` (layout, owned
  by the caller, not the primitive) — `carta.tsx` had `marginTop: space.lg` (no
  `alignSelf`), `numeros.tsx` had `marginTop: space.xxl` (no `alignSelf`), `pilares.tsx`
  had `marginTop: space.lg, alignSelf: "center"`. `ToggleRow` does NOT set its own
  margin/alignSelf — callers wrap it in a `style` prop or a parent View with the margin,
  OR (simpler, matching `Card`/`FadeIn`'s existing pattern) add an optional `style?:
  StyleProp<ViewStyle>` prop to `ToggleRow` merged into `s.wrap`, so each caller passes
  its own margin. Use the `style` prop approach for consistency with `Card`/`FadeIn`.

- [ ] **Step 2: Replace the 3 call sites**

  `carta.tsx:237-240` before:
  ```tsx
  <Pressable style={styles.proToggle} onPress={() => setPro(!pro)}>
    <View style={[styles.proDot, pro && styles.proDotOn]} />
    <Text style={styles.proText}>{t("carta.pro")}</Text>
  </Pressable>
  ```
  after:
  ```tsx
  <ToggleRow label={t("carta.pro")} on={pro} onPress={() => setPro(!pro)} style={{ marginTop: space.lg }} />
  ```
  Delete `proToggle`/`proDot`/`proDotOn`/`proText` from `carta.tsx`'s `makeStyles` (lines
  445-451). Same pattern for `numeros.tsx:130-133`/`341-354` (`marginTop: space.xxl`) and
  `pilares.tsx:257-260`/`832-838` (`marginTop: space.lg, alignSelf: "center"`).

- [ ] **Step 3: Gate + simulator verification**
  `cd apps/mobile && npx tsc --noEmit && npx vitest run && npx expo export --platform ios && rm -rf dist` → verde.
  Controller: open Carta, Números, Pilares — toggle Pro mode in each, confirm the pill's
  position/size/dot-slide animation is pixel-identical to before.
  Commit: `feat(r3): primitivo ToggleRow en ui.tsx — mata 3 copias byte-idénticas de proToggle`

---

### Task 11: Mobile — Chip Wu Xing tint + luckCol + PlaceAutocomplete review

Three independent, judgment-requiring extensions bundled because each is small. This
task has real design decisions the brief flags as open questions — resolve them by
investigating first, per the steps below, not by guessing.

**Files:**
- Modify: `apps/mobile/components/ui.tsx` (`Chip` — add tint support; `Card` — add `onPress` support)
- Modify: `apps/mobile/lib/chip-colors.ts` or new helper (if a pure-color function is needed)
- Modify: `apps/mobile/app/(tabs)/pilares.tsx` (Favor/Avoid + stars chips, `luckCol`)
- Modify: `apps/mobile/app/(tabs)/ajustes.tsx` (theme-picker swatch — investigate first)
- Modify: `apps/mobile/components/PlaceAutocomplete.tsx` (add justification comment)

- [ ] **Step 1: Extend `Chip` with a dynamic tint (closes the pilares.tsx Favor/Avoid/stars gap)**

  Current `Chip` (`ui.tsx:149-186`) has `kind: "control" | "tag"`; `"tag"` has no
  border/background (`makeChip.tag`, lines 216-220). `pilares.tsx:892-905` explicitly
  documents this as a KNOWN gap blocking migration of the Favor/Avoid + stars chips
  (`.chip`/`.chipDim` local styles, lines 898-905) — it needs a bordered/filled tag with a
  per-instance dynamic color (Wu Xing `EL_COLOR[el]`), which neither existing `kind` supports.

  Add an optional `tint` prop to close this gap without breaking the existing `"tag"`
  (label-only) usages:
  ```tsx
  export function Chip({
    label, kind, selected = false, onPress, icon,
    tint, // NEW: { bg: string; border: string; fg: string } — per-instance dynamic color (Wu Xing)
  }: {
    label: string;
    kind: "control" | "tag";
    selected?: boolean;
    onPress?: () => void;
    icon?: ReactNode;
    tint?: { bg: string; border: string; fg: string };
  }) {
    // ... "tag" branch: if (tint) render with borderWidth:1, borderColor:tint.border,
    // backgroundColor:tint.bg, and text color:tint.fg — else keep today's label-only look.
  }
  ```
  `pilares.tsx` Favor/Avoid (lines 493-507) and stars (734-745) chips become:
  ```tsx
  <Chip kind="tag" label={elName(el)} tint={{ bg: EL_COLOR[el], border: EL_COLOR[el], fg: "#fff" }} />
  ```
  for favor, and a dimmed variant (`opacity` wrapper or a `dim?: boolean` prop, matching
  today's `.chipDim { opacity: 0.6 }`) for avoid/stars. Update the "quedan como locales
  legítimos" comment at `pilares.tsx:892-897` — either delete it (gap closed) or, if the
  investigation finds the pill-shape/border difference still doesn't match cleanly, keep a
  NARROWER justification comment for whatever remains local.

- [ ] **Step 2: Investigate the theme-picker swatch (`ajustes.tsx:145-163`, styles `~326-341`) — verify before deciding**

  Open question from the brief: does the existing `icon?: ReactNode` prop on `Chip`
  already suffice for the swatch? Investigate:
  - Current shape: `themeChip` is a rounded-rect (`radius.md` = 16px) equal-width
    (`flex: 1`) card-like tile with the swatch `View` ABOVE the label (column-ish visual,
    though `alignItems:"center"` with `flexDirection` unset — check actual layout).
    `Chip kind="control"` is a `radius.pill` (999px) auto-width pill with `icon` rendered
    INLINE before the label (row layout).
  - If migrating to `<Chip kind="control" icon={<View style={swatchStyle}/>} />` changes
    the tile from a rounded-rect equal-width layout to a pill auto-width layout, that is a
    real shape change, not just an "does the prop exist" question — flag this to the
    controller with a screenshot comparison before committing to either path.
  - Resolution: if the shape change is acceptable (matches the flagship `Chip kind="control"`
    look used elsewhere in Ajustes for mode/language), migrate and delete the local
    `themeChip`/`themeChipOn`/`swatch`/`themeChipText`/`themeChipTextOn` styles. If the
    rounded-rect equal-width tile is load-bearing (e.g. matches a specific approved mockup),
    leave it local and UPGRADE the existing comment at `ajustes.tsx:141-144`/`324-325` to
    explicitly say "investigated in R3 — Chip's icon prop is structurally compatible but the
    pill shape doesn't match this tile family; kept local" (closing the open question either
    way, not leaving it unresolved).

- [ ] **Step 3: `luckCol` — extend `Card` with `onPress` (or nest `Pressable`+`Card`)**

  `pilares.tsx:599-613` (`luckCol` — 大運/流年 decade tiles) is a hand-rolled `Pressable`
  with `borderColor: t.accHair, borderRadius: radius.md` while its siblings
  (`SectionCard`, the 4-pillar grid) all use `<Card>`. It needs `onPress` PLUS 2 dynamic
  states (`luckNow`: border→acc; `luckOpen`: bg→panel) that `Card` doesn't support today.

  Preferred approach — extend `Card` with an optional `onPress`:
  ```tsx
  export function Card({
    children, accent = false, style, onPress, // NEW
  }: { ...; onPress?: () => void }) {
    const { t } = useTheme();
    const s = useMemo(() => makeCard(t), [t]);
    const Wrapper = onPress ? Pressable : View;
    return (
      <Wrapper style={[s.wrap, accent && s.wrapAccent, style]} onPress={onPress}>
        <View style={s.highlight} pointerEvents="none" />
        {children}
      </Wrapper>
    );
  }
  ```
  `pilares.tsx` `luckCol` becomes:
  ```tsx
  <Card
    onPress={() => setOpenDecade(open ? null : id)}
    style={[styles.luckCol, current && styles.luckNow, open && styles.luckOpen]}
  >
    {/* unchanged children */}
  </Card>
  ```
  where `styles.luckCol` keeps only the layout (`minWidth`, `alignItems`, `gap`,
  `marginRight`) and `styles.luckNow`/`styles.luckOpen` keep only the state-specific
  `borderColor`/`backgroundColor` overrides — border-width/color base and border-radius
  now come from `Card`. If extending `Card` proves awkward in review (e.g. TypeScript
  friction with `Pressable`'s style-function form), fall back to the documented
  alternative: `<Pressable onPress={...} style={...}><Card style={...}>...</Card></Pressable>`
  — either is acceptable, but pick one and don't leave both half-done.

- [ ] **Step 4: `PlaceAutocomplete.tsx:113-120` — add the missing justification comment**

  The `options` dropdown (`backgroundColor: t.panel, borderWidth:1, borderColor:
  t.accHair, borderRadius: radius.md, overflow:"hidden"`) hand-rolls a Card-shaped surface
  with NO comment explaining why. Investigate: `Card` (`ui.tsx`) does not set
  `overflow:"hidden"` on its wrapper, and this dropdown needs clipped corners for its
  option-row dividers — using `<Card>` directly here would let option rows bleed past the
  rounded corners. This is legitimate. Add the comment (repo convention — every grep-gate
  exception carries one):
  ```tsx
  options: {
    // Superficie tipo Card a mano, NO el primitivo: necesita overflow:"hidden" para
    // recortar los divisores de las filas contra el radio — <Card> no declara overflow
    // (su highlight absoluto lo necesita visible). Local legítimo, ver R3.
    marginTop: space.sm,
    backgroundColor: t.panel,
    borderWidth: 1,
    borderColor: t.accHair,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  ```

- [ ] **Step 5: Gate + simulator verification**
  `cd apps/mobile && npx tsc --noEmit && npx vitest run && npx expo export --platform ios && rm -rf dist` → verde.
  Controller: open Pilares (Favor/Avoid chips retain Wu Xing tint, stars chips, luckCol
  tap-to-expand with luckNow/luckOpen states), Ajustes (theme picker — whichever shape was
  decided in Step 2), onboarding place autocomplete (dropdown still clips correctly).
  Commit: `feat(r3): Chip con tinte dinámico (Wu Xing) + Card onPress (luckCol) + comentario PlaceAutocomplete`

---

### Task 12: Mini-doc — `docs/redesign/R3-sistema.md`

**Files:**
- Create: `docs/redesign/R3-sistema.md`

- [ ] **Step 1:** Write a 1-page contract doc with exactly these sections (so 4b/4c/4d land
  inside the system instead of hand-rolling again):
  1. **Primitivos** — `.card` (base + `--tight`/`--interactive`/`--dashed`/`--elevated`,
     with the 1-line recipe of each and which surfaces use them), `.chip`
     (`--pill`/`--control`/`--control-on`/`--control-disabled`/`--control-outline`), `.seg`
     (`__item`/`__item--active`/`--gradient`) — and the named one-offs that intentionally
     stay outside (`numerology.hero`, chat bubbles, bottom-sheet, `settings.tc`/`onboarding.gender`).
  2. **Escala** — `--text-*`, `--sp-*`, `--radius`/`--radius-lg`, pointer to `tokens.css`.
  3. **Fuentes de color** — `@aluna/core` (`ELEMENT_INK`/`ELEMENT_FILL`/`ASPECT_COLORS`/
     `WU_XING_COLORS`, with the "never merge, only fire agrees" rule stated explicitly) +
     `--ink-on-acc` theme×mode table (the 6 values from task 9) + `--tone-warm`/`--tone-cool`/`--tone-caution`.
  4. **Mobile primitivos** — `Card`/`Chip`/`FadeIn`/`ToggleRow`/`SoonBadge`/`SectionHeading`, one line each.
  Keep it to ~1 page — this is a lookup contract, not a design-system tome.

- [ ] **Step 2: Commit**
  `feat(r3): docs/redesign/R3-sistema.md — contrato de primitivos + escala + fuentes de color`

---

### Task 13: axe/contrast pass (6 theme×mode combos)

**Files:**
- Modify: `apps/web/package.json` (add `axe-core`, `playwright` devDependencies)
- Create: `apps/web/scripts/axe-audit.mjs`

- [ ] **Step 1: Add tooling**
  `cd apps/web && npm pkg set devDependencies.axe-core="^4.10.0" devDependencies.playwright="^1.47.0" && pnpm install` (or the repo's actual install command — confirm against `pnpm-lock.yaml` conventions first).

- [ ] **Step 2: `apps/web/scripts/axe-audit.mjs`** — headless Chromium, injects `axe-core`
  locally via `page.addScriptTag({ path: require.resolve("axe-core") })` (no CDN — repo
  has no network-fetch-in-CI convention), iterates the 6 theme×mode combos × the pages
  touched by this plan (`/hoy`, `/carta`, `/pilares`, `/numeros`, `/compatibilidad`,
  `/ajustes`, `/informe`, `/preguntar`, `/login`), sets theme via
  `page.evaluate(() => { document.documentElement.dataset.theme = X; document.documentElement.dataset.mode = Y; })`
  (bypassing the UI picker for speed — direct attribute override is equivalent to what the
  picker does under the hood), runs `axe.run()`, and asserts **zero `color-contrast`
  violations** across all combos × pages (this plan's scope is specifically the contrast
  risk from decision 1 — pre-existing non-contrast violations unrelated to R3, if any, are
  out of scope and should be listed separately, not silently ignored, not blocking this gate).
  Requires `apps/web` dev server running (`npm run dev`) on the conventional port
  (localhost:3002, per R2 precedent) before running the script.

- [ ] **Step 3: Run + fix**
  `cd apps/web && npm run dev &` then `node scripts/axe-audit.mjs`. If violations surface
  in a light-mode combo (the exact risk task 9 targeted), the fix belongs in task 9's
  token values — do NOT patch around it with a one-off override; if the mobile-matched
  `onAcc` value genuinely fails contrast against a given theme's `--acc`, that's a finding
  to bring back to Gio (the mobile value itself might need revisiting), not something to
  silently diverge from mobile over.

- [ ] **Step 4: Gate + commit**
  `node scripts/axe-audit.mjs` → 0 `color-contrast` violations across the 6×N matrix.
  Commit: `feat(r3): pasada axe/contraste (6 tema×modo) — script + 0 violaciones color-contrast`

---

### Task 14: R4 desktop

**⚠️ The brief gives direction but not exact numbers** (see Self-Review gaps) — this task
proposes a concrete conservative starting point; the controller's live browser pass is
the real spec (adjust the proposed values if they read wrong before committing).

**Files:**
- Modify: `apps/web/lib/theme/tokens.css`
- Modify: `apps/web/components/bottom-nav.module.css`
- Modify: `apps/web/app/(app)/app-shell.module.css` (container width, if the max-width lives there)

- [ ] **Step 1: `@media (min-width: 900px)` re-scale block in `tokens.css`**
  Append after the theme blocks:
  ```css
  /* ---------------- R4: DESKTOP (~900px+) ---------------- */
  @media (min-width: 900px) {
    :root {
      --text-2xs: 12px; --text-xs: 13px; --text-sm: 14px; --text-md: 16px; --text-lg: 18px;
      --text-xl: 22px; --text-2xl: 26px; --text-3xl: 36px; --display-sm: 48px; --display: 66px;
      --sp-1: 4px; --sp-2: 10px; --sp-3: 14px; --sp-4: 18px; --sp-5: 24px; --sp-6: 32px; --sp-7: 44px;
    }
  }
  ```
  (Roughly +1 step of visual weight per token — conservative, reversible per the brief's
  own "riesgo bajo, borrar = revertir" framing. Flag to Gio for visual sign-off; adjust
  before merge if the controller's browser pass shows it reading too timid or too loud.)

- [ ] **Step 2: Wider container**
  Locate the page-width constraint (likely `app-shell.module.css` or per-page `.wrap` max-width — grep `max-width` in `app-shell.module.css` first) and add a `@media (min-width: 900px)` override widening it moderately (e.g. current mobile-stretched single column → a centered `max-width: ~720-820px` column, still NOT a multi-column desktop layout — R4's stated goal is "deje de ser una columna móvil estirada," not a full desktop redesign).

- [ ] **Step 3: BottomNav as a dock**
  `bottom-nav.module.css` `.nav` (currently `position: sticky; bottom: 0;` full-width bar)
  gets a `@media (min-width: 900px)` override: centered, capped width, floating off the
  edge, elevated:
  ```css
  @media (min-width: 900px) {
    .nav {
      max-width: 480px; margin: 0 auto var(--sp-4); border-radius: 999px;
      border: 1px solid var(--line); box-shadow: var(--elev);
    }
  }
  ```

- [ ] **Step 4: Metrics baseline**
  Before/after: `cd apps/web && rm -rf .next && npx next build` — record the build-size
  output both ways (this change should be CSS-only, near-zero size delta). Lighthouse: run
  against `localhost:3002` at a ≥900px viewport, before and after, on `/hoy` — record
  scores (this is a re-measurement per the brief, not a target to hit blind).

- [ ] **Step 5: Gate + browser verification**
  `cd apps/web && npx tsc --noEmit && npx vitest run && rm -rf .next && npx next build` → verde.
  Controller: resize the browser to 900px+ on `/hoy`, `/carta`, `/pilares` — confirm the
  scale bump and dock nav read as intentional, not broken (overflow, clipped dock, etc.);
  confirm nothing regresses BELOW 900px (mobile web unaffected — the whole block is
  gated by the media query).
  Commit: `feat(r3): R4 — @media (min-width:900px) escalas + contenedor + BottomNav dock`

---

### Task 15: Closing grep gate (A-E)

Run every grep from the brief verbatim; assert the stated result. Any survivor not
covered by a named one-off/primitive-definition-file needs either a fix or a
justification comment (repo convention) before this task closes.

**Files:** none (verification-only task).

- [ ] **Step 1: Gate A — core colors**
  ```
  grep -rn "#d4a85f\|#b8b6c8" apps/web apps/mobile --include="*.ts" --include="*.tsx" --include="*.css" | grep -v "packages/core\|tokens.css"
  grep -rn "#e0795a\|#7fb069\|#7aaae0\|#9b8fd6" apps/web apps/mobile --include="*.ts" --include="*.tsx" --include="*.css" | grep -v "packages/core\|tokens.css"
  ```
  Expect: 0 outside `packages/core`/`tokens.css` — EXCEPT `pilares.module.css:.el_*/.elBg_*`
  (named exception, decision 5, carries the core-mirror comment from task 1).
  ```
  grep -rn "const ELEMENT_INK\|const ELEMENT_FILL\|const HARMONY_STROKE\|const EL_COLOR" apps
  ```
  Expect: 0.

- [ ] **Step 2: Gate B — `.card`**
  ```
  grep -rn "border:\s*1px solid var(--line)" apps/web --include="*.module.css" | grep "background:\s*var(--surface)"
  grep -rEn "border-radius:\s*(14|18|24|26)px" apps/web --include="*.module.css"
  grep -rn "border:\s*1px dashed rgba(var(--acc-rgb)" apps/web --include="*.module.css"
  ```
  Expect: 0 except the named one-offs from task 6 Step 4 (`.hero`, `.msg`/`.aluna`,
  `.sheet`/`.modal`, `.tc`/`.gender` — note `.tc`/`.gender` are now `--radius`=16px, not in
  this grep's 14/18/24/26 list, so they should NOT appear at all post-migration).

- [ ] **Step 3: Gate C — chips**
  ```
  grep -rEn "^\.(chip|chipOn|chipWarn|chipDim|chipDisabled|chipDot|tag|tagWarn|god|godSelf|dayTag|badge)\b" apps/web --include="*.module.css"
  ```
  Expect: 0 except `.el_*`-adjacent Wu Xing overrides (`.elBg_*`, unrelated to this grep)
  and `.chipDot` (named local exception, task 7 Step 4, carries its own comment).
  ```
  grep -rn "e0a07a\|220, 120, 80" apps/web --include="*.module.css"
  ```
  Expect: 0 (both retired to `--tone-caution`).

- [ ] **Step 4: Gate D — `.seg`**
  ```
  grep -rEn "^\.(seg|segItem|segOn|kindRow|kindBtn|kindOn|periods|period|periodOn|tierRow|tier|tierOn)\b" apps/web --include="*.module.css"
  ```
  Expect: 0 except `.periods`/`.period` in `energy.module.css` (named local exception,
  task 8 Step 3 — kept for its 999px pill track shape, carries the primitive-composition
  comment) and `.kindRow`/`.kindBtn`/`.tierRow`/`.tier` where they carry ONLY the
  layout/typography leftovers (not selection state — verify none of the survivors still
  define `background`/`color` for an active state, which would mean the migration is
  incomplete).
  ```
  grep -rn "#14132a" apps/web
  ```
  Expect: 0.

- [ ] **Step 5: Gate E — mobile**
  ```
  grep -n "proDot: { width: 9, height: 9, borderRadius: 5" apps/mobile/app -r
  ```
  Expect: ≤1 (down from 3 — the primitive itself in `ui.tsx` is the only remaining
  definition; if any survives in `carta.tsx`/`numeros.tsx`/`pilares.tsx`, task 10 was incomplete).
  ```
  grep -n "const EL_COLOR" apps/mobile -r
  ```
  Expect: 0.
  Heuristic (manual review, not auto-zero per the brief): scan
  `borderColor: t.accHair` + background on `View`/`Pressable` outside `ui.tsx`, and
  `borderRadius: radius.pill` outside `ui.tsx` — every survivor needs a comment (repo
  convention); confirm `PlaceAutocomplete.tsx` (task 11 Step 4) and the other
  brief-listed legitimate locals (`inclCell` numeros:396, onboarding `foot`:355,
  `dayBadge` pilares:796) all carry one.

- [ ] **Step 6: Full monorepo gate + report**
  `npx pnpm -w exec turbo run typecheck test` → 12/12 (or however many packages) green.
  `cd apps/web && rm -rf .next && npx next build` → green.
  `cd apps/mobile && npx expo export --platform ios && rm -rf dist` → green.
  Compile a short closing report: every named exception from Gates A-E, with its file:line
  and whether it carries a justification comment (fix any that don't before closing).
  No commit for this task alone unless fixes were needed (then: `fix(r3): comentarios de justificación faltantes en el gate de cierre`).

---

## Self-Review

**Coverage vs. brief sections A-G:**
- **A (core colors):** Task 1 (creation + tests) + Task 2 (web shim) + Task 3 (mobile
  imports) — all 3 "sitios de import tras el refactor" from the brief are individually
  named tasks. Wu Xing web CSS comment update folded into Task 1 (decision 5).
- **B (`.card`):** Task 4 (define) + Task 5 (exact-match group) + Task 6 (interactive/
  dashed/14px-cluster group + named one-off verification checklist). Every occurrence the
  brief lists is named with file:line and a before/after; the 3 non-dashed 14px survivors
  (`settings.tc`, `numerology.practiceBlock`, `pilares.luckCol`) are explicitly kept
  token-only (not reclassed) — see gap below, this is a judgment call the brief left
  slightly underspecified.
- **C (chips):** Task 7 — both primitives, `--tone-caution`, `.chip--pill` outlier,
  `.chip--control-outline` outlier, and the `day-number.chip`-is-not-a-chip rename all covered.
- **D (`.seg`):** Task 8 — both flagship-gradient and flat segs, `#14132a` retirement (as
  a 2-step process spanning tasks 8 and 9, intentionally), plan-card.tsx repointed in the
  SAME task (not deferred) since deleting `.seg`/`.segItem` from settings.module.css would
  otherwise break it. **The brief's dead-code claim about `hub.module.css` was verified
  against current source and found incorrect — documented and corrected in Task 8 rather
  than silently dropped.**
- **E (mobile primitives):** Task 10 (ToggleRow) + Task 11 (Chip tint, Card onPress for
  luckCol, PlaceAutocomplete comment, theme-picker swatch investigation).
- **F (mini-doc + axe):** Task 12 + Task 13.
- **G (R4 desktop):** Task 14.
- Closing grep gate (brief's "Hecho cuando"): Task 15, every grep from A-E reproduced verbatim.

**Placeholder scan:** No task contains a bare `[migrate the X selectors]` instruction —
every CSS migration task shows the actual current CSS block (read from source) and the
actual target recipe, with the specific `.tsx` consumer line(s) that need the className
change. Where a genuine design judgment call remains open (theme-picker swatch shape,
R4's exact scale numbers), it's flagged as an explicit investigate-then-decide step or a
concrete-but-adjustable proposal, not left as TBD.

**Type/naming consistency:** `Element`/`AspectHarmony`/`WuXingElement` types match
verbatim across Task 1 (definition) and every consumer task (2, 3, 12's doc). Class names
(`.card--tight`, `.chip--control-on`, `.seg__item--active`, etc.) are introduced once in
Task 4/7/8 and referenced identically in every later task — no task invents a variant
name not already established in the Global Constraints or the defining task.

---

## Gaps / ambiguities for reviewer or Gio (not resolved by re-reading the brief further — genuine open points)

1. **The 14px "cluster" classname question (Task 6 Step 3):** the brief says
   `.card--tight` "cubre... el cluster 14px normalizado," but `.card--tight` inherits
   `background: var(--surface)` from `.card` base, while `settings.tc` and
   `numerology.practiceBlock` use `--surface-2` and `pilares.luckCol` uses no background
   at all (`background: none`). Reclassing them to `.card--tight` would silently change
   their background, not just their radius — bigger than the "delta 2px, screenshot-check"
   the brief describes for this cluster. This plan resolves it conservatively (token-only,
   keep local class), but the brief's own phrasing suggests the author may have intended
   the classname migration too. Worth a 30-second confirm from whoever reviews the plan.

2. **R4 desktop has no concrete target numbers in the brief** (Task 14) — the brief and
   PLAN-MAESTRO both say "re-escalando" and "contenedor algo más ancho" and "BottomNav
   como dock" directionally, with no mockup or exact values (unlike R2, which had an
   approved mockup file to cite line-by-line). This plan proposes conservative starting
   values and treats the controller's live browser pass as the real spec, but this is the
   one task in the plan where I could not encode an existing decision because — as far as
   the exploration found — none exists yet at the pixel level. Flag to Gio before this
   task ships if a stronger opinion exists.

3. **axe tooling is net-new to this repo** (Task 13) — no `axe-core`/`playwright`
   dependency or e2e infra exists today (confirmed by search). The task adds a minimal
   local script rather than a full e2e suite, scoped tightly to `color-contrast` checks
   across the 6 combos (the brief's literal ask), not a general accessibility audit. If
   the intent was broader, that's a bigger, separate task.

4. **`carta.big`'s padding-override-vs-specificity risk (Task 5 Step 2):** flagged inline
   in the task itself — combining a global `.card`/`.card--tight` class with a CSS-Module
   class for a padding override relies on CSS-Module stylesheet injection order relative
   to `globals.css`. This should just work in Next.js's normal build (global CSS loads
   first, CSS Modules follow), but it's the one place in this plan where cascade order
   is load-bearing rather than incidental — worth the browser check called out in that step.
