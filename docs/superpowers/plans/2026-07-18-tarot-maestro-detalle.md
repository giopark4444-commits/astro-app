# Tarot maestro-detalle — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Umbral del tarot con maestro-detalle real (carta del día/diario → panel sticky con `TarotSelection` de 3 kinds); paso "reading" de ceremonia y modo manual con split de layout (cartas | prosa+chat) SOLO en desktop; ritual táctil intacto; sin Modo Pro (decisión de spec §C).

**Molde EN ESTA RAMA:** `pilares/`+`numeros/`+`horoscopo/` (selection/renderizador/router/panel/sheet/CSS). **Spec:** `docs/superpowers/specs/2026-07-18-tarot-maestro-detalle-design.md` — leer entera; §B define qué NO tocar.

## Global Constraints
- Rama `lentes-detalle` (post-merge `1003aec`). Alcance: `apps/web/app/(app)/tarot/` + `messages/*.json` (namespace `tarot`, al final). Core/lib/nav/otros lentes solo LEER (lib/viewport se importa, no se modifica).
- **INTOCABLES:** `seal()`/gestureRng, pasos question/shuffle/cut/fan/reveal de `ceremony.tsx`, wizard template/select/jumpers de `manual-entry.tsx`, `.stepPane` compartida, la ruta del chat y `reading-chat.tsx`, los flip 3D.
- Serie: comillas dobles/2 espacios/comentarios ES; tokens; bp 1080; TDD; commits con trailer `Co-Authored-By: Claude <noreply@anthropic.com>`; NO next build hasta el gate (16GB); checklist visual = clickear TODO en cada estado y viewport, incluida una ceremonia completa de 3 cartas y un flujo manual completo.
- Regresión-cero móvil: sheets actuales del umbral se conservan; pasos reading móviles idénticos a hoy.

---

### Task 1: `TarotSelection` + i18n
**Files:** Create `apps/web/app/(app)/tarot/selection.ts` · Modify `messages/es.json`+`en.json` · Test `__tests__/selection.test.ts`
**Produces:**
```ts
import type { CardId } from "@aluna/core"; // verificar el nombre real del tipo de id de carta en core (tarot); si es string, usar string documentado
export type SavedReadingLite = { id: string; question: string | null; cards: Array<{ id: string; reversed: boolean; position: string }>; createdAt: string }; // ajustar al shape REAL que consume el diario en tarot-view (leerlo)
export type TarotSelection =
  | { kind: "daily" }
  | { kind: "saved"; reading: SavedReadingLite }
  | { kind: "card"; id: string; reversed: boolean; from?: TarotSelection | undefined }; // from: para "volver a la lectura"
export { isMobileViewport } from "@/lib/viewport";
```
i18n al final del namespace `tarot`: `interpTitle` ("Interpretación"/"Interpretation"), `interpHint` ("Toca la carta del día o una lectura del diario para leerla aquí." / EN natural), `backToReading` ("Volver a la lectura"/"Back to the reading").
- [ ] RED (molde numeros: import runtime + type) → implementar (leer el shape real del diario en `tarot-view.tsx` ANTES de fijar SavedReadingLite) → GREEN + typecheck + eslint → commit `feat(tarot): TarotSelection — daily, lectura guardada y carta suelta`.

---

### Task 2: `TarotInterpretation` — renderizador
**Files:** Create `interpretation-content.tsx` · Test `__tests__/interpretation-content.test.tsx` · (clases interp* al `tarot.module.css`, receta serie)
**Produces:** `TarotInterpretation({ selected, revealed, dailyCard, profileName, onSelect }): JSX` + `tarotSelectionTitle(selected, t, locale)`.
**Contrato:**
- `daily`: si `revealed` → nombre+keywords+essence de `dailyCard` (contenido core, mismo que el sheet actual) + prosa `composeReadingProse` de la carta del día (reusar la construcción `dailyProse` actual de tarot-view — moverla o replicarla); si NO revelada → `interpHint` + invitación (texto existente del umbral si lo hay; si no, interpHint sola).
- `saved`: pregunta (si hay) + cartas (misma fila visual del sheet actual del diario, cada carta BOTÓN → `onSelect({kind:"card", id, reversed, from: selected})`) + prosa `composeReadingProse` con la separación principal/jumpers EXACTA del `openReadingProse` actual.
- `card`: imagen pequeña + nombre + keywords + essence + camino (`upright.path`/`reversed.path` según reversed) + botón `backToReading` si `from` → `onSelect(from)`.
- [ ] RED (fixtures del contenido core real; presencia/ausencia por revealed; card con from→volver) → implementar → GREEN + typecheck + eslint → commit `feat(tarot): TarotInterpretation — carta del día, lecturas del diario y carta suelta`.

---

### Task 3: Umbral maestro-detalle — recablear `tarot-view.tsx` + CSS
**Files:** Modify `tarot-view.tsx`, `tarot.module.css` · Test `__tests__/tarot-selection.test.tsx`
**Cambios:**
1. Estados `selected: TarotSelection | null` + `sheetSel` + router `select()` + `useSheetAutoClose` + reset `[active?]` (verificar si el umbral depende de perfil; si no hay perfil-контexto, reset solo al desmontar — documentar).
2. Desktop: `deskCols` 11fr/9fr — leftCol = carta del día + tiradas + diario; interpCol sticky = panel (`selected ?? {kind:"daily"}`). Los DOS BottomSheet actuales quedan SOLO móvil (router decide); su contenido pasa a `TarotInterpretation` con el kind correspondiente (daily/saved) para no duplicar markup — el sheet móvil rinde el MISMO renderizador (título via `tarotSelectionTitle`).
3. El flip de la carta del día sigue igual (no es selección — es ritual); tras revelar, el panel (kind daily) se actualiza solo por props (`revealed`).
4. Diario: click → `select({kind:"saved", reading})`.
5. Ceremony/ManualEntry montados inline como hoy — cuando están abiertos, el umbral se oculta como hoy (verificar comportamiento actual y conservarlo).
- [ ] RED (harness: mocks de fetch de tarot-view actuales — mirá los tests existentes de tarot si los hay; si no, construir con matchMedia + fetch stub del diario): aterrizaje→panel daily con hint (no revelada) · revelar→panel con essence · click diario→panel saved con cartas · click carta→panel card→volver · móvil: diario→sheet (mismo contenido) → GREEN + typecheck + eslint → commit `feat(tarot): umbral maestro-detalle — panel sticky con la carta del día y el diario`.

---

### Task 4: Split del paso "reading" — ceremonia + manual (layout only)
**Files:** Modify `ceremony.tsx` (+`ceremony.module.css`), `manual-entry.tsx` (+`manual-entry.module.css`)
**Cambios (espejo en ambos):**
- El contenedor del paso reading gana clase adicional `readingPane` (junto a `.stepPane`, sin tocarla): `<div className={`${styles.stepPane} ${styles.readingPane}`}>`.
- CSS base: `.readingPane {}` vacío móvil. En `@media (min-width:1080px)`: `.readingPane { display:grid; grid-template-columns: 11fr 9fr; gap: var(--sp-6); align-items:start; text-align:left; }` + `.readingCards { grid-column:1; }` (conserva su grid 3-across interno) + wrapper nuevo `.readingSide { grid-column:2; position:sticky; top:84px; display:flex; flex-direction:column; gap:var(--sp-3); }` envolviendo prosa+chat+guardar/volver en el JSX (móvil: `display:contents`).
- Título/pregunta del paso quedan arriba a lo ancho (`grid-column: 1 / -1`).
- CERO cambios en los otros pasos EXCEPTO el requisito §E del spec (despliegue cómodo): en el paso `fan` de ceremony y el `select` del manual, calibrar SOLO CSS de tamaño/solape/hover-focus de las cartas a ≥1080 (mecánica intacta: mismos handlers, índices y RNG); móvil sin cambios salvo que haya solape real hoy.
- [ ] Test: estructural jsdom (el paso reading renderiza `.readingSide` conteniendo prosa+chat+save; los otros pasos NO tienen readingPane) — usar los tests existentes de ceremony/manual como harness (los hay: T3 los creó; leerlos) → implementar → GREEN + suite completa + typecheck + eslint → commit `feat(tarot): paso de lectura a dos columnas en desktop — cartas | prosa y chat (ritual intacto)`.

---

### Task 5: Gate final de fase Y DE LA SERIE
- [ ] Suite completa ×2 + typecheck + eslint + build 16GB EXIT 0 → reiniciar :3008.
- [ ] Controlador, navegador propio — checklist: umbral (flip, panel daily pre/post reveal, diario→panel, carta→volver, móvil sheets + auto-close) · **ceremonia COMPLETA de 3 cartas** (pregunta→sostener→cortar→abanico→revelar→lectura 2-col con chat visible→guardar) · **flujo manual COMPLETO** (plantilla→cartas→lectura 2-col) · móvil de ambos IDÉNTICO a hoy · capturas.
- [ ] Review integral Fable de la fase + una pasada de conjunto de LA SERIE COMPLETA (los 4 lentes en la rama) → ola → re-review → push + ledger + memoria + reporte final a Gio con estado de merge.
