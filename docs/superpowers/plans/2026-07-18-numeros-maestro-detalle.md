# Números maestro-detalle — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/numeros` adopta el maestro-detalle: izquierda = hero + 5 lentes + secciones Pro (todo ya tocable), derecha = panel sticky que arranca con el Camino de Vida y lee el número tocado; Pro alterna esencia ↔ NumberReading con tiers en el panel; móvil conserva su sheet EXACTO de hoy.

**Architecture:** Un solo kind (`NumSelection` tipa el estado `sheet` actual). Renderizador `NumerosInterpretation` reusa `NumberReading` tal cual; el sheet móvil lo consume con `pro=true` fijo (regresión-cero: hoy el sheet siempre muestra NumberReading completo). `isMobileViewport` se extrae a `lib/viewport.ts` y lo adoptan carta+pilares+numeros. El default del panel es derivado (`selected ?? lifePathSel`), sin estado extra.

**Referencia del patrón EN ESTA RAMA (leer antes de implementar):** `apps/web/app/(app)/pilares/{selection.ts, interpretation-content.tsx, pilares-view.tsx, pilares.module.css}` — es el molde exacto.

**Spec:** `docs/superpowers/specs/2026-07-18-numeros-maestro-detalle-design.md`

## Global Constraints

- Rama `lentes-detalle`. NO tocar nav/admin/core (core solo LEER) ni otros lentes SALVO el refactor puntual de viewport en `carta/selection.ts` y `pilares/selection.ts` (Task 1, quirúrgico).
- i18n: claves nuevas al FINAL del namespace `numerology` en ambos locales; EN no calcado.
- Convención: comillas dobles, 2 espacios, comentarios en español; tokens CSS; bp 1080.
- Gates por tarea: RED→GREEN→commit con `Co-Authored-By: Claude <noreply@anthropic.com>`; NO `next build` hasta el gate final (con `NODE_OPTIONS=--max-old-space-size=16384`).
- **Checklist visual del gate (regla de la serie):** clickear CADA elemento tocable y CADA estado con Pro OFF **y** ON, desktop y móvil — no solo el aterrizaje.
- Móvil regresión-cero: el sheet muestra HOY `sheetN` + `calcMini` + (`NumberReading` completo | fallback arquetipo) — ese contenido byte-equivalente debe conservarse.

---

### Task 1: `lib/viewport.ts` compartido + `numeros/selection.ts` + i18n

**Files:**
- Create: `apps/web/lib/viewport.ts`
- Modify: `apps/web/app/(app)/carta/selection.ts` (re-export desde lib)
- Modify: `apps/web/app/(app)/pilares/selection.ts` (ídem)
- Create: `apps/web/app/(app)/numeros/selection.ts`
- Modify: `apps/web/messages/es.json` + `en.json` (namespace `numerology`, al final)
- Test: `apps/web/app/(app)/numeros/__tests__/selection.test.ts`

**Interfaces — Produces:**

```ts
// lib/viewport.ts
export function isMobileViewport(): boolean; // typeof window !== "undefined" && matchMedia("(max-width: 1079px)").matches

// numeros/selection.ts
import type { ReductionTrace } from "@aluna/core";
export type NumSelection = { kind: "number"; labelKey: string; glossKey: string; trace: ReductionTrace };
export { isMobileViewport } from "@/lib/viewport";
```

- [ ] **Step 1 (RED):** test con import runtime (lección P1):

```ts
// apps/web/app/(app)/numeros/__tests__/selection.test.ts
import { describe, it, expect } from "vitest";
import { isMobileViewport } from "../selection";
import type { NumSelection } from "../selection";

describe("NumSelection", () => {
  it("tipa el estado del sheet actual y expone el viewport compartido", () => {
    const sel: NumSelection = { kind: "number", labelKey: "lifePath", glossKey: "glossLifePath", trace: { value: 7, steps: [] } as never };
    expect(sel.kind).toBe("number");
    const orig = window.matchMedia;
    window.matchMedia = ((q: string) => ({ matches: false, media: q })) as never;
    expect(isMobileViewport()).toBe(false);
    window.matchMedia = orig;
  });
});
```

Run: `cd apps/web && pnpm vitest run "app/(app)/numeros/__tests__/selection.test.ts"` → FAIL (módulo inexistente).

- [ ] **Step 2:** crear `lib/viewport.ts` (mover el cuerpo EXACTO de `pilares/selection.ts:isMobileViewport`, comentario: helper compartido del patrón maestro-detalle, bp complementario del desktop 1080). En `carta/selection.ts` y `pilares/selection.ts`: borrar el cuerpo local y `export { isMobileViewport } from "@/lib/viewport";` actualizando su comentario de duplicación-consciente (la deuda se paga aquí). Crear `numeros/selection.ts` con el contrato de arriba.
- [ ] **Step 3:** i18n — `es.json` namespace `numerology` al final: `"interpTitle": "Interpretación"`; `en.json`: `"interpTitle": "Interpretation"`.
- [ ] **Step 4 (GREEN):** test nuevo + `pnpm vitest run "app/(app)/carta" "app/(app)/pilares"` (las suites de los 2 lentes refactorizados SIGUEN verdes) + `pnpm typecheck` + eslint de los 4 archivos.
- [ ] **Step 5:** Commit `feat(numeros): NumSelection + viewport compartido lib/viewport — carta y pilares pagan la deuda de duplicación`

---

### Task 2: `NumerosInterpretation` — renderizador

**Files:**
- Create: `apps/web/app/(app)/numeros/interpretation-content.tsx`
- Test: `apps/web/app/(app)/numeros/__tests__/interpretation-content.test.tsx`

**Interfaces — Produces:**
`NumerosInterpretation({ selected, pro, profileName }): JSX` — locale via hooks.

**Contrato:** cabecera SIEMPRE = número grande (`styles.sheetN`) + `calcMini` con `formatReduction(selected.trace)` (reusar las clases existentes del module CSS — el sheet actual es la referencia visual). Cuerpo:
- `meaning` inexistente para el valor → fallback arquetipo EXACTO del sheet actual (archetype + glossKey + proseSoon).
- `meaning` existe y `pro=false` → párrafo `meaning.essence` (leer la forma real en `lib/content/numerology-es.ts`) + línea hint reutilizando `t("tapHint")` en itálica suave (clase nueva `interpHintLine` en el module CSS de numeros, receta de pilares).
- `meaning` existe y `pro=true` → `<NumberReading value position calc profileName meaning lens />` completo (tal cual el sheet hoy).

- [ ] **Step 1 (RED):** tests: cabecera (número+cálculo) · sin pro → essence sí / `role tab Esencia` no · con pro → tiers sí · fallback sin meaning (valor sin prosa, p.ej. trace value 4 si no existe — verificar contra NUMBER_MEANINGS_ES real y elegir un valor SIN entrada; si todos 1-9+11/22/33 tienen, montar con un value imposible tipo 0). Harness: NextIntlClientProvider + fixture ReductionTrace.
- [ ] **Step 2:** implementar (imports de `numerology-es/en`, `POSITION_LENS_*`, `formatReduction`, `NumberReading`).
- [ ] **Step 3 (GREEN)** + carpeta numeros verde + typecheck + eslint. Commit `feat(numeros): NumerosInterpretation — cabecera de cálculo + esencia/tiers según Pro`.

---

### Task 3: Recableado de `numerology-view.tsx` + CSS 2-col

**Files:**
- Modify: `apps/web/app/(app)/numeros/numerology-view.tsx`
- Modify: `apps/web/app/(app)/numeros/numerology-view.module.css`
- Test: `apps/web/app/(app)/numeros/__tests__/numeros-selection.test.tsx`

**Cambios:**
1. Estados: `selected: NumSelection | null` (null = default) + `sheetSel: NumSelection | null`; router `select(s)` = `isMobileViewport() ? setSheetSel(s) : setSelected(s)`. TODOS los `setSheet({...})` actuales pasan a `select({kind:"number", ...})`.
2. Default derivado (sin estado): `const lifePathSel: NumSelection = { kind: "number", labelKey: "lifePath", glossKey: "glossLifePath", trace: core.lifePath };` y el panel renderiza `selected ?? lifePathSel`.
3. Reset: `useEffect(() => { setSelected(null); setSheetSel(null); }, [active]);` (numeros no tiene más opciones).
4. DOM: envolver en `deskCols` → `leftCol` (todo lo actual: head/h1 quedan FUERA arriba; hero+lentes+proToggle+pro+tapHint dentro) + `interpCol > card interpPanel` (cardH2 `t("interpTitle")` + `NumerosInterpretation selected={selected ?? lifePathSel} pro={pro} profileName={active.name}`).
5. Sheet móvil: `open={!!sheetSel}`, título `t(sheetSel.labelKey)`, cuerpo `<NumerosInterpretation selected={sheetSel} pro={true} profileName={active.name} />` — pro FIJO true (regresión-cero: el sheet de hoy siempre muestra NumberReading completo). El bloque bespoke viejo del sheet se borra (el renderizador lo reproduce).
6. CSS (module de numeros): base `.interpCol{display:none}` + `.interpHintLine` + copiar del module de pilares las clases de panel que falten (`.interpPanel`, `.cardH2` — mismos valores); en `@media (min-width:1080px)`: `.deskCols{display:grid;grid-template-columns:11fr 9fr;gap:var(--sp-6);align-items:start}` `.leftCol{min-width:0}` `.interpCol{display:block;position:sticky;top:84px}` `.interpPanel{max-height:calc(100vh - 100px);overflow-y:auto}`. El reflow desktop existente (lentes en fila, pro 2×2, max-width 880px) se ajusta: el `max-width` del wrap sube para acomodar 2 columnas (usar el patrón de pilares `.wrap` como vara).

- [ ] **Step 1 (RED):** tests (harness: mock useProfiles con perfil de fecha fija + matchMedia desktop): aterrizaje → panel muestra Camino de Vida (número + cálculo) · clic en lente "Expresión" → panel cambia (número de expresión) · **Pro inmediato en aterrizaje** → panel gana `role tab Esencia` (tiers) y la izquierda revela `karmicLessons` · reset por perfil · móvil (matchMedia true): clic en lente → dialog con NumberReading (tiers presentes AUN sin pro — pro fijo del sheet).
- [ ] **Step 2:** implementar. **Step 3 (GREEN)** + typecheck + eslint. Commit `feat(numeros): maestro-detalle cableado — panel sticky con Camino de Vida por defecto, router por viewport, sheet móvil intacto`.

---

### Task 4: Gate final de fase

- [ ] Suite completa web + typecheck + eslint app.
- [ ] Build (`NODE_OPTIONS=--max-old-space-size=16384`) EXIT 0 → reiniciar dev :3008.
- [ ] **Controlador, navegador propio:** checklist de la serie — clickear hero + 5 lentes + (Pro ON) chips kármicos/pináculos/ciclos [nota: NO son tocables hoy y el spec no los vuelve tocables — verificar que NO rompen] · Pro OFF y ON en aterrizaje (panel esencia↔tiers) · móvil: sheet por lente con tiers, Pro toggle revela secciones · capturas a `.dev-shots/`.
- [ ] Review integral de la fase (paquete desde el commit del spec de numeros) con el modelo más capaz; ola de fixes si hay; re-review.
- [ ] Push + ledger + memoria + continuar Fase 3 (Horóscopo).
