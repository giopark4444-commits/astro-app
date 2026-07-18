# Horóscopo maestro-detalle — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/horoscopo` adopta el maestro-detalle: izquierda = controles + barras + cielo técnico + tablas Pro (todo tocable), derecha = panel sticky con la lectura del periodo por defecto (Pro alterna prosa compuesta ↔ HoroscopeReading con tiers — unifica los dos sistemas de profundidad); el monolito de 509 líneas se parte en western/eastern; chores de serie: `useSheetAutoClose` transversal + flaky endurecido.

**Architecture:** El orquestador (`horoscopo-view.tsx`) conserva la tab occidental/oriental, `pro`, y el estado maestro-detalle (`selected`/`sheetSel`/router/panel/sheet); cada subvista extraída es dueña de su fetch y sus controles y recibe `onSelect`. `HoroscopoSelection` con 3 kinds (reading/area/term). Renderizador único `HoroscopoInterpretation` (prosa según tab activa + glosario + áreas).

**Molde de la serie EN ESTA RAMA:** `pilares/` y `numeros/` (selection, interpretation-content, view, CSS module, tests con harness). **Spec:** `docs/superpowers/specs/2026-07-18-horoscopo-maestro-detalle-design.md`

## Global Constraints

- Rama `lentes-detalle`. Alcance: `apps/web/app/(app)/horoscopo/`, `apps/web/lib/viewport.ts`, los 3 sheets hermanos (carta/pilares/numeros — SOLO adoptar el hook), `messages/*.json` (namespace `horoscopo`, al final). Core solo LEER; nav/admin/tarot/hoy intactos.
- Convenciones de la serie: comillas dobles, 2 espacios, comentarios ES; tokens CSS; bp 1080; TDD RED→GREEN→commit con `Co-Authored-By: Claude <noreply@anthropic.com>`; NO `next build` hasta el gate (con `NODE_OPTIONS=--max-old-space-size=16384`).
- Cablear selección SOLO donde `glossaryEntry` resuelva; si no, conservar `<Meaning>`.
- Regresión-cero móvil: apilado y contenidos actuales; sheet nuevo solo AGREGA el detalle tocado.
- Checklist visual del gate: clickear CADA tocable y CADA estado (Pro OFF/ON × occidental/oriental × desktop/móvil) + recaptura Pro ON (deuda N4).

---

### Task 1: `HoroscopoSelection` + hook `useSheetAutoClose` transversal + i18n

**Files:**
- Create: `apps/web/app/(app)/horoscopo/selection.ts`
- Modify: `apps/web/lib/viewport.ts` (añadir hook)
- Modify: `apps/web/app/(app)/carta/carta-view.tsx`, `pilares/pilares-view.tsx`, `numeros/numerology-view.tsx` (SOLO añadir el hook a sus sheets)
- Modify: `messages/es.json`+`en.json`
- Test: `apps/web/lib/__tests__/viewport.test.ts` + `horoscopo/__tests__/selection.test.ts`

**Produces (contratos exactos):**

```ts
// selection.ts
export type AreaDriver = { label: string; glossKey: string | null; glyph: string | null };
export type HoroscopoSelection =
  | { kind: "reading" }
  | { kind: "area"; area: string; level: string; drivers: AreaDriver[] }
  | { kind: "term"; key: string };
export { isMobileViewport } from "@/lib/viewport";

// lib/viewport.ts — nuevo hook
/** Cierra el sheet móvil si el viewport cruza al desktop (deuda de serie:
 *  antes quedaba un BottomSheet colgado encima del panel al rotar/agrandar). */
export function useSheetAutoClose(open: boolean, onClose: () => void): void;
// implementación: useEffect que con open=true registra un listener en
// matchMedia("(min-width: 1080px)") y llama onClose() cuando matches pasa a true;
// cleanup al cerrar/desmontar. SSR-safe.
```

Adopción en los 3 hermanos: una línea por vista junto a sus estados — `useSheetAutoClose(!!sheetSel, () => setSheetSel(null));` (en numeros el nombre es igual; en carta igual). i18n: `horoscopo.interpTitle` = "Interpretación"/"Interpretation"; `horoscopo.interpHint` = "Toca una barra de energía o cualquier símbolo para leer qué significa." / EN natural no calcado.

- [ ] **RED:** `viewport.test.ts` — stub matchMedia con listeners capturados: open=true + cruce a matches:true → onClose llamado una vez; open=false → sin listener. `selection.test.ts` — molde de numeros (import runtime de isMobileViewport + type NumSelection→HoroscopoSelection).
- [ ] Implementar → **GREEN** (+ suites carta/pilares/numeros COMPLETAS verdes — la adopción no puede romper nada) + typecheck + eslint.
- [ ] Commit `feat(horoscopo): HoroscopoSelection + useSheetAutoClose transversal — el sheet ya no queda colgado al cruzar a desktop`

---

### Task 2: Partir el monolito — `western-view.tsx` + `eastern-view.tsx` (MOVE puro)

**Files:**
- Create: `apps/web/app/(app)/horoscopo/western-view.tsx` (desde la rama occidental: JSX líneas ~367-505 + sus estados/fetch/consts: sign/prevSignRef/period/state/openArea + useEffect occidental + prose/fmt*)
- Create: `apps/web/app/(app)/horoscopo/eastern-view.tsx` (rama oriental: JSX ~206-364 + animal/prevAnimalRef/easternState/openAreaEastern/script + useEffect oriental + proseEastern/interactionLabel/animalHanzi)
- Modify: `horoscopo-view.tsx` → orquestador: header + tab trad (router/searchParams) + `pro` compartido (se pasa como prop) + `<WesternView pro={pro} …/>` / `<EasternView pro={pro} …/>`
- Modify: `__tests__/eastern-view.test.tsx` (endurecer flaky)

**Reglas del MOVE:**
- CERO cambios de comportamiento: mismo DOM, mismas clases, mismos fetch/parámetros. Los helpers module-level compartidos (SIGN_GLYPH/PLANET_GLYPH/PERIODS/PERIOD_KEY/AREA_KEY/TONE_KEY/EASTERN_ANIMALS/INTERACTION_GLYPH/cap) van a un `horoscopo-shared.ts` local importado por ambas (o se duplican los de una sola rama — decidir por consumo real, documentar).
- `pro` y su toggle: el estado vive en el ORQUESTADOR (prop down) — preparación para H4 donde gobierna el panel; el botón se queda donde está visualmente en cada subvista (recibe `pro`/`onProToggle`).
- Los tests existentes de horoscopo (incluido `eastern-view.test.tsx`) deben pasar SIN cambios de aserciones (solo endurecimiento flaky): renderizan `HoroscopoView` completo.
- Flaky: en el test "abre el glosario", reemplazar el patrón frágil por `await screen.findByRole("dialog", {}, { timeout: 4000 })` (o el waitFor equivalente con timeout explícito) — verificar el patrón exacto del fallo bajo carga antes de elegir el fix.

- [ ] **Paso previo obligatorio:** correr la suite horoscopo 3 veces seguidas para line-base del flaky.
- [ ] MOVE → suites horoscopo verdes ×3 corridas + typecheck + eslint + suite completa web verde.
- [ ] Commit `refactor(horoscopo): western-view y eastern-view extraídas del monolito — move puro, pro izado al orquestador`

---

### Task 3: `HoroscopoInterpretation` — renderizador

**Files:**
- Create: `apps/web/app/(app)/horoscopo/interpretation-content.tsx`
- Test: `__tests__/interpretation-content.test.tsx`

**Produces:** `HoroscopoInterpretation({ selected, pro, trad, western, eastern, profileName })` — `trad: "occidental"|"oriental"`; `western: Payload|null`, `eastern: EasternPayload|null` (los payloads ready de cada rama; el que aplique según trad).

**Contrato:**
- `reading` + trad occidental: sin Pro → párrafos de `composeWesternProse(locale, western)` + interpHint; con Pro → `<HoroscopeReading …/>` con las props que HOY recibe en la rama occidental (leer su callsite actual). Ídem oriental con `composeEasternProse`/su HoroscopeReading. Si el payload correspondiente es null → interpHint sola (estado loading del panel).
- `area`: cabecera (label del área + `TONE_KEY[level]` traducido) + lista de drivers: cada uno con glifo + label y, si `glossKey` existe, el body del glosario en colapsado breve (primeras ~2 frases NO — mostrar completo, YAGNI de truncados).
- `term`: patrón pilares exacto (title+glyph+body de `glossaryEntry`).
- `horoscopoSelectionTitle(selected, t, locale)` para el sheet.

- [ ] **RED** (fixtures de payload mínimos copiados de los mocks de los tests existentes de horoscopo) → implementación → **GREEN** + typecheck + eslint.
- [ ] Commit `feat(horoscopo): HoroscopoInterpretation — lectura del periodo, áreas con drivers y glosario según Pro`

---

### Task 4: Recableado maestro-detalle — orquestador + ambas subvistas + CSS

**Files:**
- Modify: `horoscopo-view.tsx` (selected/sheetSel/select/reset/panel/sheet/useSheetAutoClose)
- Modify: `western-view.tsx` + `eastern-view.tsx` (onSelect en barras/tablas/prosa-fuera)
- Modify: `horoscopo.module.css` (re-split)
- Test: `__tests__/horoscopo-selection.test.tsx`

**Cambios:**
1. Orquestador: `selected: HoroscopoSelection|null` + `sheetSel` + `select()` por viewport + `useSheetAutoClose` + reset `useEffect(..., [active, trad])` y las subvistas notifican cambios de contexto propio (sign/animal/period) vía prop `onContextChange` → también resetea (spec §5).
2. La PROSA sale de `.mainCol` de ambas subvistas → el panel la rinde como `reading` (los `<HoroscopeReading>` de las subvistas se retiran con ella; los payloads suben al orquestador vía prop `onReady(payload)` o el orquestador recibe los datos por render-prop — elegir lo más simple y documentar; mirar cómo pilares pasa `set`).
3. `AreaBars`: cada fila gana onSelect → `{kind:"area", area, level, drivers}` construyendo `AreaDriver[]` desde el payload (driver planeta: glyph=PLANET_GLYPH, glossKey=planetMeaningKey; casa: `house.N`; oriental: glossKey de `interactionKey`/branch según origen — SOLO claves que resuelvan).
4. Tablas Pro (posiciones/interacciones/armonías): filas → `{kind:"term", key: planetMeaningKey(...)|`sign.X`|interactionKey(...)}` (celda del símbolo principal, patrón pilares); `<Meaning>` fuera de esas celdas se conserva.
5. CSS: `.grid` se re-semantiza → `deskCols` 11fr/9fr (leftCol = side actual + mainCol técnico SIN prosa; interpCol sticky = receta serie). `.side` deja de ser sticky (lo sticky es el panel). Móvil: apilado intacto; `interpCol` display:none base.
6. Panel y sheet: receta exacta de numeros (cardH2 interpTitle + renderizador; sheet con título por kind). Sheet en móvil muestra `pro` REAL (no fijo: acá el sheet nuevo es contenido nuevo, no reemplaza uno existente — regresión-cero es sobre el apilado, no sobre el sheet).

- [ ] **RED:** tests (harness de los tests de horoscopo existentes — mocks fetch western/eastern): aterrizaje occidental → panel con prosa del periodo · clic en barra de área → panel con drivers · Pro inmediato → panel gana tiers (`role tab Esencia`) · cambio de tab a oriental → reset a reading oriental · móvil: clic área → dialog. 
- [ ] Implementar → **GREEN** carpeta horoscopo + suite completa + typecheck + eslint.
- [ ] Commit `feat(horoscopo): maestro-detalle cableado — panel con la lectura del periodo, áreas y términos tocables, Pro unificado con tiers`

---

### Task 5: Gate final de fase

- [ ] Suite completa ×2 corridas (vigilar el flaky endurecido) + typecheck + eslint + build 16GB EXIT 0 → reiniciar :3008.
- [ ] Controlador en navegador propio — checklist serie COMPLETO: occidental y oriental × Pro OFF/ON × desktop/móvil; clickear picker de signo/animal, periodo, cada barra, filas de tablas, hits; verificar reset al cambiar tab/signo/periodo; sheet auto-close al cruzar breakpoint (¡probar el hook de H1 de verdad!); recaptura Pro ON desktop (deuda N4, en numeros y horoscopo). Capturas a `.dev-shots/`.
- [ ] Review integral de fase (Fable) → ola de fixes → re-review → push + ledger + memoria → **Fase 4 Tarot** (⚠️ chequear estado de tarot-t4 ANTES: `git worktree list` + `git log origin/main` — coordinar base).
