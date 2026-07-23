# Tiradas de tarot — set completo · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Habilitar las 9 tiradas (4 destacadas + 5 secundarias) en la ceremonia digital y en el modo manual, con un selector agrupado y un renderizador único por coordenadas.

**Architecture:** Los datos de tiradas ya viven en `@aluna/core` (`tarot/spreads.ts`: cada posición con `layout {x,y,rotate?}` y cada tirada con `group`). Falta: (a) etiquetas de posición bilingües en los 2 sistemas de labels, (b) un renderizador que coloca N cartas por sus coordenadas, (c) un selector agrupado, (d) parametrizar ceremonia y manual por `spreadId`. La interpretación NO requiere contenido bespoke: `composeReadingProse` la arma desde (carta, etiqueta, esencia).

**Tech Stack:** Next.js 15, React, next-intl, @aluna/core (datos puros), vitest + @testing-library/react.

## Global Constraints
- **Paridad i18n:** toda clave nueva en el namespace `tarot` debe existir IDÉNTICA en `apps/web/messages/es.json` y `en.json` (`app/__tests__/i18n.test.tsx` lo verifica).
- **Dos sistemas de labels de posición, ambos deben cubrir TODAS las keys nuevas:**
  1. Core `READING_POSITION_LABELS_ES/EN` en `packages/core/src/tarot/content-{es,en}.ts` (para la prosa compuesta).
  2. UI: hoy `POSITION_KEY` (ceremony.tsx) + `positionLabel` (manual-entry.tsx) → claves i18n en `messages`. Unificar en UN mapa compartido `positionLabelKey(key)` y añadir las claves i18n.
- **Contenido bilingüe:** las etiquetas ES/EN las redacta el implementador y **una tarea final de curación con Fable** las pule (voz evolutiva de Aluna, no predictiva).
- **Voz evolutiva:** posiciones de "futuro/resultado/tendencia" se nombran como energía/tendencia, no destino fijo.
- **tsc web+core = 0** y suite verde en cada task.
- **Keys de posición (por tirada)** — usar EXACTAS las de `spreads.ts` (verbatim):
  - celtic-cross: heart·crossing·foundation·past·crown·future·self·environment·hopes-fears·outcome
  - relationship: you·other·connection·your-feelings·their-feelings·challenge·tendency
  - year-wheel: month-1…month-12·theme
  - decision: situation·option-a·brings-a·option-b·brings-b·unseen·advice
  - horseshoe: past·present·hidden·obstacle·environment·advice·tendency
  - simple-cross: situation·cause·past·future·synthesis
  - chakras: crown·third-eye·throat·heart·solar·sacral·root
  - elements: spirit·air·fire·water·earth
  - yes-no: answer
  - básicas ya existentes: day·past·present·future

---

### Task 1: Etiquetas de posición + nombres de tirada (bilingüe, ambos sistemas)

**Files:**
- Modify: `packages/core/src/tarot/content-es.ts` (`READING_POSITION_LABELS_ES`)
- Modify: `packages/core/src/tarot/content-en.ts` (`READING_POSITION_LABELS_EN`)
- Modify: `apps/web/messages/es.json` + `apps/web/messages/en.json` (namespace `tarot`: `position<Key>` + `spread<Id>`/`spread<Id>Desc` + `diarySpread<Id>`)
- Create: `apps/web/app/(app)/tarot/position-labels.ts` (mapa compartido `positionLabelKey`)
- Test: `apps/web/app/(app)/tarot/__tests__/position-labels.test.ts`; `packages/core/src/tarot/__tests__/content.test.ts` (extender)

**Interfaces:**
- Produces: `positionLabelKey(positionKey: string): string` — devuelve la clave i18n del label (ej. `"heart"` → `"positionHeart"`, `"month-1"` → `"positionMonth1"`, `"hopes-fears"` → `"positionHopesFears"`). Cubre TODAS las keys de todas las tiradas + las básicas.
- Consumes (Tasks 4/5): reemplazan sus `POSITION_KEY`/`positionLabel` locales por `positionLabelKey`.

- [ ] **Step 1: Mapa compartido `positionLabelKey` + test (rojo→verde)**

`apps/web/app/(app)/tarot/position-labels.ts`:
```ts
// camelCase de una key de posición a su clave i18n: "hopes-fears" → "positionHopesFears",
// "month-1" → "positionMonth1". Un único origen para ceremony + manual.
export function positionLabelKey(positionKey: string): string {
  const camel = positionKey
    .replace(/-(\w)/g, (_, c: string) => c.toUpperCase())
    .replace(/^(\w)/, (_, c: string) => c.toUpperCase());
  return `position${camel}`;
}
```
Test: `positionLabelKey("heart") === "positionHeart"`, `positionLabelKey("hopes-fears") === "positionHopesFears"`, `positionLabelKey("month-1") === "positionMonth1"`, `positionLabelKey("your-feelings") === "positionYourFeelings"`.

- [ ] **Step 2: Claves i18n de posición en es.json + en.json** — para CADA key de todas las tiradas, añadir `position<Camel>` en ambos catálogos, con etiqueta corta en voz de Aluna. Ejemplos ES: `positionHeart: "El asunto"`, `positionCrossing: "El desafío"`, `positionFoundation: "La base"`, `positionCrown: "La meta"`, `positionSelf: "Tú"`, `positionEnvironment: "El entorno"`, `positionHopesFears: "Esperanzas y temores"`, `positionOutcome: "La síntesis"`, `positionYou: "Tú"`, `positionOther: "La otra persona"`, `positionConnection: "La conexión"`, `positionYourFeelings: "Tus sentimientos"`, `positionTheirFeelings: "Sus sentimientos"`, `positionChallenge: "El desafío"`, `positionTendency: "Hacia dónde tiende"`, `positionMonth1…12: "Enero…Diciembre"`, `positionTheme: "Tema del año"`, `positionSituation: "La situación"`, `positionOptionA/B: "Opción A/B"`, `positionBringsA/B: "Lo que trae A/B"`, `positionUnseen: "Lo que no ves"`, `positionAdvice: "El consejo"`, `positionHidden: "Influencias ocultas"`, `positionObstacle: "El obstáculo"`, `positionCause: "La causa"`, `positionSynthesis: "La síntesis"`, `positionThirdEye: "Tercer ojo"`, `positionThroat: "Garganta"`, `positionSolar: "Plexo solar"`, `positionSacral: "Sacro"`, `positionRoot: "Raíz"`, `positionSpirit: "Espíritu"`, `positionAir/Fire/Water/Earth: "Aire/Fuego/Agua/Tierra"`, `positionAnswer: "La respuesta"`. (EN equivalentes.) Reusar/renombrar las existentes `positionPast/Present/Future/Day` si ya existen.

- [ ] **Step 3: Labels del core** — replicar las MISMAS etiquetas (por key) en `READING_POSITION_LABELS_ES/EN` para la prosa. Añadir un test en `content.test.ts`: para cada tirada de `TAROT_SPREADS`, cada `position.key` tiene entrada en ambos diccionarios de labels del core.

- [ ] **Step 4: Nombres + descripciones de tirada + diario** — en es.json/en.json: `spreadCelticCross`/`spreadCelticCrossDesc`, `spreadRelationship`/…Desc, `spreadYearWheel`, `spreadDecision`, `spreadHorseshoe`, `spreadSimpleCross`, `spreadChakras`, `spreadElements`, `spreadYesNo` (reusar `spreadThree` existente). Y `diarySpread<Id>` para cada uno (extender `DIARY_SPREAD_KEY` en `interpretation-content.tsx` en Task 4/5). Grupos: `spreadsGroupPrimary: "Recomendadas"`, `spreadsGroupSecondary: "Más tiradas"`.

- [ ] **Step 5: Correr** `pnpm --filter @aluna/web exec vitest run app/(app)/tarot/__tests__/position-labels.test.ts app/__tests__/i18n.test.tsx` + `pnpm --filter @aluna/core exec vitest run tarot/__tests__/content.test.ts` + ambos `tsc`. Todo verde.

- [ ] **Step 6: Commit** `feat(tarot): etiquetas de posición y nombres de las 9 tiradas (bilingüe, core+UI)`

---

### Task 2: Renderizador por coordenadas `<SpreadLayout>`

**Files:**
- Create: `apps/web/app/(app)/tarot/spread-layout.tsx` + `spread-layout.module.css`
- Test: `apps/web/app/(app)/tarot/__tests__/spread-layout.test.tsx`

**Interfaces:**
- Consumes: `TarotSpread`/`TarotSpreadPosition` de `@aluna/core`; `positionLabelKey` (Task 1).
- Produces:
  ```ts
  export interface SpreadLayoutSlot { index: number; filled: boolean; content?: React.ReactNode; }
  export function SpreadLayout(props: {
    spread: TarotSpread;
    renderSlot: (position: TarotSpreadPosition, index: number) => React.ReactNode;
    ariaLabel?: string;
  }): JSX.Element;
  ```
  Coloca cada posición en un lienzo `position:relative; aspect-ratio` con cada carta `position:absolute; left:x%; top:y%; transform:translate(-50%,-50%) rotate(rotate)`. Responsivo (el lienzo escala; las cartas en %). El `renderSlot` decide qué se dibuja (dorso vacío / carta revelada / label).

- [ ] **Step 1: Test (rojo)** — renderiza un spread de 3 y de 10; hay N nodos posicionados; cada uno con su `left/top` de las coords; `renderSlot` se llama con la posición correcta. Aserción: para celtic-cross la posición `crossing` lleva `rotate(90…)` en su style.
- [ ] **Step 2: Implementar** el componente + CSS (lienzo `aspect-ratio` acorde a la forma; cartas absolutas por %). Ancho responsivo: el lienzo toma el ancho disponible (max-width por tirada, ej. wheel más cuadrado). Tamaño de carta relativo (clamp) para que N cartas no se solapen feo.
- [ ] **Step 3: Verde** + tsc.
- [ ] **Step 4: Commit** `feat(tarot): renderizador de tiradas por coordenadas (SpreadLayout)`

---

### Task 3: Selector agrupado `<SpreadPicker>`

**Files:**
- Create: `apps/web/app/(app)/tarot/spread-picker.tsx` + `spread-picker.module.css`
- Test: `apps/web/app/(app)/tarot/__tests__/spread-picker.test.tsx`

**Interfaces:**
- Consumes: `spreadsByGroup` de `@aluna/core`; i18n `spread<Id>`, `spreadsGroupPrimary/Secondary`.
- Produces:
  ```ts
  export function SpreadPicker(props: {
    onPick: (id: TarotSpreadId) => void;
    exclude?: TarotSpreadId[];   // ej. ocultar "daily" donde no aplique
  }): JSX.Element;
  ```
  Dos secciones: "Recomendadas" (group primary, tarjetas grandes/destacadas) y "Más tiradas" (secondary, chips/tarjetas chicas). Cada opción muestra `spread<Id>` (+ `…Desc` en las primarias). a11y: botones con nombre accesible.

- [ ] **Step 1: Test (rojo)** — muestra las primarias bajo "Recomendadas" y las secundarias bajo "Más tiradas"; tocar una llama `onPick(id)`; `exclude` oculta las excluidas.
- [ ] **Step 2: Implementar** + CSS (destacadas con tinte de marca `--acc`, secundarias sobrias).
- [ ] **Step 3: Verde** + tsc.
- [ ] **Step 4: Commit** `feat(tarot): selector agrupado de tiradas (Recomendadas / Más tiradas)`

---

### Task 4: Ceremonia parametrizada por spread + layout + labels compartidos

**Files:**
- Modify: `apps/web/app/(app)/tarot/ceremony.tsx` (quitar `SPREAD_ID` hardcoded → prop `spreadId`; usar `SpreadLayout` para slots/reveal; `positionLabelKey` en vez de `POSITION_KEY`)
- Modify: `apps/web/app/(app)/tarot/tarot-view.tsx` (el `spreadsGrid` pasa a `<SpreadPicker onPick={(id)=>setCeremony(id)}>`; `ceremony` state pasa de `"three"|null` a `TarotSpreadId|null`; pasar `spreadId` a `<Ceremony>`)
- Modify: `apps/web/app/(app)/tarot/interpretation-content.tsx` (`DIARY_SPREAD_KEY` con todas las tiradas)
- Test: actualizar `__tests__/ceremony.test.tsx` y `tarot-view.test.tsx`

**Interfaces:**
- Consumes: `SpreadLayout` (Task 2), `SpreadPicker` (Task 3), `positionLabelKey` (Task 1).
- `Ceremony` gana prop `spreadId: TarotSpreadId`; internamente `const spread = spreadById(spreadId)!`.

- [ ] **Step 1:** Reemplazar `POSITION_KEY[...]` por `t(positionLabelKey(pos.key))` (3 usos). Rojo→verde con test de labels.
- [ ] **Step 2:** `Ceremony({ spreadId, ... })`; `const spread = spreadById(spreadId)!`; `spread: spreadId` al guardar. Quitar `SPREAD_ID`.
- [ ] **Step 3:** Slots (paso fan) y reveal usan `<SpreadLayout spread={spread} renderSlot={...}>` en vez del `.slotRow` fijo, para respetar el diagrama de cada tirada. El abanico (fila de 78) queda igual; sólo cambia dónde caen las elegidas/reveladas.
- [ ] **Step 4:** tarot-view: `const [ceremony, setCeremony] = useState<TarotSpreadId | null>(null)`; el `spreadsSection` renderiza `<SpreadPicker onPick={setCeremony} exclude={["daily","yes-no"]?}>` (decidir cuáles aplican a ceremonia digital); `readingResultFull`/deep-link `daily` intactos; `<Ceremony spreadId={ceremony} .../>`.
- [ ] **Step 5:** `DIARY_SPREAD_KEY` cubre todas las tiradas.
- [ ] **Step 6:** Verde (ceremony + tarot-view tests actualizados) + tsc + i18n.
- [ ] **Step 7: Commit** `feat(tarot): ceremonia soporta cualquier tirada (picker + layout + labels)`

---

### Task 5: Modo manual soporta cualquier tirada

**Files:**
- Modify: `apps/web/app/(app)/tarot/manual-entry.tsx` (el paso `template` (three/daily/free) gana el `SpreadPicker`; el reading usa `positionLabelKey`; las cartas del reading pueden usar `SpreadLayout` para el diagrama)
- Test: actualizar `__tests__/manual-entry.test.tsx`

**Interfaces:**
- Consumes: `SpreadPicker`, `SpreadLayout`, `positionLabelKey`, `spreadById`.
- El manual mantiene la opción **"free"** (conteo libre) + añade las tiradas del picker. Al elegir una tirada con posiciones fijas, el paso "select" pide las N cartas de esas posiciones (label por posición).

- [ ] **Step 1:** Reemplazar `positionLabel` local por `t(positionLabelKey(...))`.
- [ ] **Step 2:** En el paso de plantilla, además de free, mostrar `<SpreadPicker onPick=...>`; setear el spread elegido; `positions` = `spreadById(id).positions` (o la libre). El resto del flujo (elegir cartas por posición, jumpers, reading) ya es genérico por `positions`.
- [ ] **Step 3:** (opcional) el reading del manual dibuja las cartas con `SpreadLayout` para mostrar el diagrama de la tirada.
- [ ] **Step 4:** Verde (manual tests) + tsc + i18n.
- [ ] **Step 5: Commit** `feat(tarot): modo manual soporta cualquier tirada`

---

### Task 6: Curación bilingüe (Fable) de etiquetas + nombres

**Files:** los mismos de Task 1 (es.json/en.json, content-es/en.ts).

- [ ] **Step 1:** Pasada de curación con **Fable 5** sobre TODAS las etiquetas ES/EN nuevas: voz evolutiva de Aluna, EN natural (no calco del ES), consistencia. Ajustar textos donde haga falta.
- [ ] **Step 2:** Verde (i18n parity + tests) + tsc.
- [ ] **Step 3: Commit** `content(tarot): curación bilingüe de etiquetas de tiradas (Fable)`

---

## Self-Review
- Cobertura del spec: 9 tiradas (datos ya en core) → labels (T1) + curación (T6); renderer (T2); selector agrupado (T3); ceremonia (T4); manual (T5). ✓
- Interpretación: genérica vía `composeReadingProse` — sólo requiere labels (T1). ✓
- Tipos consistentes: `positionLabelKey`, `SpreadLayout`, `SpreadPicker`, `Ceremony({spreadId})` usados igual en T4/T5. ✓
- Sin placeholders de proceso: los textos concretos de etiquetas se listan en T1; el renderer/selector llevan interfaces exactas.
