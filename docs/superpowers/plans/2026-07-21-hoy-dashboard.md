# Hoy dashboard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/hoy` se vuelve un dashboard maestro-detalle: izquierda = 8 secciones apiladas (Aluna te recuerda → barras multi-disciplina → carta resumida → clima → horóscopo occ → oriental → pilares → abanico de tarot); derecha = chat de Aluna embebido sticky. Fuera el "Hola" y los lentes redundantes.

**Spec:** `docs/superpowers/specs/2026-07-21-hoy-dashboard-design.md`
**Molde:** la serie lentes-detalle (deskCols/interpCol/sticky en `perfil.module.css`, chat en `perfil-chat-panel.tsx`, abanico/dorsos en `tarot/ceremony.tsx` con `cardBackUrl`/`cardImageUrl`/`useDeckAssets`).

## Global Constraints
- Rama `hoy-dashboard` (desde origin/main `43f25ab` — ya trae chat palancas + memoria fase 2 + tarjeta proactiva en Hoy). Alcance: `apps/web/app/(app)/hoy/`, `apps/web/app/api/` (scores nuevo), `packages/core/src/{numerology,bazi}/life-areas.ts` (nuevos) + `packages/core/src/index.ts` (re-export), `messages/*.json`. NO tocar otros lentes, perfil, tarot/ (solo LEER deck/content), preguntar/ (solo montar ChatView).
- Serie: comillas dobles/2 espacios/comentarios ES; tokens CSS; bp 1080; TDD RED→GREEN→commit con trailer `Co-Authored-By: Claude <noreply@anthropic.com>`; NO next build hasta el gate (16GB).
- Las 6 áreas y el shape `LifeAreaScore` ({area, score 0-100, tone, drivers}) ya existen en `@aluna/core` (`astrology/life-areas.ts`) — los motores nuevos REUSAN ese tipo, no lo redefinen.
- Regresión-cero móvil salvo las secciones nuevas; la tarjeta "Aluna te recuerda" (memoria) se conserva.

---

### Task 1: Motor Números → áreas (`@aluna/core`)
**Files:** Create `packages/core/src/numerology/life-areas.ts` · Modify `packages/core/src/index.ts` · Test `packages/core/src/numerology/__tests__/life-areas.test.ts`
**Interfaces — Produces:** `scoreLifeAreasNumerology(cycles: PersonalCycles): LifeAreaScore[]` (reusa `LifeArea`/`LifeAreaScore`/`ScoreTone` de `../astrology/life-areas`).

Correspondencia número→áreas fuertes (spec §5b, pitagórica):
```ts
const NUM_AFFINITY: Record<number, LifeArea[]> = {
  1: ["work", "mood"], 2: ["love", "mood"], 3: ["mood", "love"],
  4: ["work", "health"], 5: ["luck", "mood"], 6: ["love", "health"],
  7: ["mood", "health"], 8: ["money", "work"], 9: ["luck", "love"],
};
```
Algoritmo: base 50 por área. El `personalDay.value` (reducido a 1-9: `((v-1)%9)+1` para maestros) aporta **+18** a sus 2 áreas afines y **-6** a las 2 menos afines (las que NO están en su lista ni en la del complemento — simplificar: +18 a afines, el resto queda en 50, clamp 0-100). `personalMonth` aporta **+8** a sus afines; `personalYear` **+4**. Números maestros (`isMaster`) del día: +6 extra a sus afines (pico). `tone` vía `scoreTone(score)` (exportado del core). `drivers`: `[{label:"Día personal N"}, {label:"Mes personal M"}]` — **NOTA:** `AreaDriver` actual es astro-específico (transit/natal/aspect); para no romperlo, el motor numerológico emite `drivers: []` y la razón se muestra aparte, O se generaliza `AreaDriver` a `{label: string; favorable: boolean}` — DECISIÓN: mantener `drivers: []` en los motores no-astro (YAGNI; el "por qué" numerológico se teje en el texto de la sección, no en la barra). El shape `LifeAreaScore` se cumple con `drivers: []`.

- [ ] **Step 1 (RED):**
```ts
// packages/core/src/numerology/__tests__/life-areas.test.ts
import { describe, it, expect } from "vitest";
import { scoreLifeAreasNumerology } from "../life-areas";
import { personalCycles } from "../cycles";

describe("scoreLifeAreasNumerology", () => {
  it("produce las 6 áreas con score 0-100 y es determinista", () => {
    const cycles = personalCycles({ year: 1990, month: 2, day: 4 }, { year: 2026, month: 7, day: 21 });
    const scores = scoreLifeAreasNumerology(cycles);
    expect(scores).toHaveLength(6);
    for (const s of scores) { expect(s.score).toBeGreaterThanOrEqual(0); expect(s.score).toBeLessThanOrEqual(100); expect(["love","money","work","health","mood","luck"]).toContain(s.area); }
    expect(scoreLifeAreasNumerology(cycles)).toEqual(scores); // determinista
  });
  it("un día personal 8 sube dinero y trabajo por encima de neutral", () => {
    // construir cycles cuyo personalDay reduzca a 8 (elegir fecha; o mock del shape)
    const cycles = { personalYear: { value: 8 } as never, personalMonth: { value: 8 } as never, personalDay: { value: 8, isMaster: false } as never };
    const scores = scoreLifeAreasNumerology(cycles as never);
    const money = scores.find((s) => s.area === "money")!;
    const love = scores.find((s) => s.area === "love")!;
    expect(money.score).toBeGreaterThan(50);
    expect(money.score).toBeGreaterThan(love.score);
  });
});
```
Run: `cd packages/core && pnpm vitest run src/numerology/__tests__/life-areas.test.ts` → FAIL.
- [ ] **Step 2:** implementar `life-areas.ts` + re-export en `index.ts` (`export { scoreLifeAreasNumerology } from "./numerology/life-areas";`). GREEN + `pnpm --filter @aluna/core test` + typecheck.
- [ ] **Step 3:** Commit `feat(core): scoreLifeAreasNumerology — energía por área desde la numerología del día`.

---

### Task 2: Motor Pilares → áreas + combinador (`@aluna/core`)
**Files:** Create `packages/core/src/bazi/life-areas.ts` · Modify `index.ts` · Test `packages/core/src/bazi/__tests__/life-areas.test.ts`
**Interfaces — Produces:**
- `scoreLifeAreasBazi(natal: PillarSet, dayPillar: Pillar): LifeAreaScore[]`
- `combineLifeAreas(sets: LifeAreaScore[][]): LifeAreaScore[]` (promedio por área).

Correspondencia elemento→áreas (spec §5c, Wu Xing):
```ts
const ELEMENT_AFFINITY: Record<Element, LifeArea[]> = {
  wood: ["health", "mood"], fire: ["love", "mood"], earth: ["work", "health"],
  metal: ["money", "work"], water: ["luck", "love"],
};
```
Algoritmo `scoreLifeAreasBazi`: computa `favorableElements` del natal (usa `dayMasterStrength(natal)` + `favorableElements(verdict, dayStem)` de core). El elemento del `dayPillar` (tomar el del tronco; opcional combinar rama) → si ∈ favor: **+16** a sus áreas; si ∈ avoid: **-14**; si neutro: **+6**. Base 50, clamp, `scoreTone`, `drivers: []`.
`combineLifeAreas`: por cada área, promedio simple de los scores de todos los sets presentes (redondeado); `tone` recomputado; `drivers: []`. (Astros pesa igual de arranque — el spec permite ajustar, empezar simple.)

- [ ] **Step 1 (RED):** test — `scoreLifeAreasBazi` 6 áreas 0-100 determinista; un `dayPillar` de elemento favorable sube sus áreas; `combineLifeAreas([a,b])` promedia (dos sets con 40 y 60 en un área → 50). Fixture: `PillarSet` del día 甲子 (2000-01-07) documentado.
- [ ] **Step 2:** implementar + re-export. GREEN + core test + typecheck.
- [ ] **Step 3:** Commit `feat(core): scoreLifeAreasBazi (Wu Xing→áreas) + combineLifeAreas (modo General)`.

---

### Task 3: Backend `/api/scores` devuelve los 4 sets
**Files:** Modify `apps/web/app/api/scores/route.ts` · Test `apps/web/app/api/scores/__tests__/*` (si existe; si no, testear el ensamblador extraído a `lib/hoy/scores.ts`)
**Cambios:** el endpoint (o un nuevo `lib/hoy/scores.ts` testeable) devuelve, además del `astros` actual (por periodo), los sets `numeros` (de `personalCycles`+`scoreLifeAreasNumerology`), `pilares` (de `computeBaziNatal`+`dayPillar de hoy`+`scoreLifeAreasBazi`) y `general` (`combineLifeAreas`). Respuesta: `{ periods?, general: LifeAreaScore[], astros: [...], numeros: [...], pilares: [...] }` (los 4 para "hoy"; el periodo sigue aplicando SOLO a astros como hoy — decisión: general/numeros/pilares son del día). El `dayPillar` de hoy: computar de la fecha civil (buscar helper en bazi o computar tronco/rama del día juliano — reusar lo que `/api/bazi` o timeline use para "pilar del día"; si no existe, computarlo con la lib de sexagenario del core).
- [ ] RED: test del ensamblador (mock profile) → los 4 sets presentes, cada uno 6 áreas; sin hora → pilares no rompe (fallback). → implementar → GREEN + suite web + typecheck + eslint.
- [ ] Commit `feat(hoy): /api/scores devuelve general/astros/numeros/pilares — energía por disciplina`.

---

### Task 4: EnergyPanel con toggle de disciplina
**Files:** Modify `apps/web/app/(app)/hoy/energy-panel.tsx`, `energy.module.css` · Test `hoy/__tests__/energy-panel.test.tsx`
**Cambios:** fetch al `/api/scores` nuevo (trae los 4 sets). Fila de botones **General/Astros/Números/Pilares** (default General). El toggle cambia qué set muestran las barras SIN refetch (los 4 ya vienen). `AreaBars` se reusa tal cual. El toggle de periodo actual (today/week/month/year): decidir — el periodo solo tiene sentido para astros; mantenerlo visible solo en modo Astros, o quitarlo del dashboard (el dashboard es "hoy"). DECISIÓN: en el dashboard el periodo se oculta (siempre "hoy"); si el usuario quiere periodos va a /horoscopo. Header de la sección: "¿Cómo estás hoy?".
- [ ] RED: default General; click Números → barras cambian a numeros sin nueva llamada a fetch (mock, contar llamadas=1); las 4 disciplinas presentes. → implementar → GREEN + carpeta hoy + typecheck + eslint.
- [ ] Commit `feat(hoy): panel de energía con palancas de disciplina (general/astros/números/pilares)`.

---

### Task 5: Secciones-resumen (carta, horóscopos, pilares)
**Files:** Create `hoy/summary-chart.tsx`, `hoy/summary-horoscope.tsx` (occ+or, parametrizado), `hoy/summary-pillars.tsx` + su CSS · Test correspondientes
**Contrato:** componentes compactos, cada uno con título + resumen breve + CTA a su lente.
- `summary-chart.tsx`: Sol/Luna/Asc chips + `composeCoreReading` (1 párrafo). Datos de `/api/chart` (reusar el fetch que ya hace hub-view para el clima, o uno propio). CTA "Ver tu carta"→/carta.
- `summary-horoscope.tsx` (`trad: "occidental"|"oriental"`): 1-2 párrafos de `composeWesternProse`/`composeEasternProse` del periodo "today". Payloads de `/api/horoscope/western|eastern`. CTA→/horoscopo(?trad).
- `summary-pillars.tsx`: esencia de `composeBaziReading` (client-safe) sobre los pilares (server los pasa, o `/api/bazi`). CTA→/pilares.
- Reusar labels/glifos existentes; NO reescribir prosa.
- [ ] RED por componente (monta con datos mock, muestra resumen + CTA) → implementar → GREEN + typecheck + eslint.
- [ ] Commit `feat(hoy): secciones-resumen — carta, horóscopo occidental/oriental y pilares`.

---

### Task 6: Abanico de tarot
**Files:** Create `hoy/tarot-fan.tsx` + CSS · Test `hoy/__tests__/tarot-fan.test.tsx`
**Contrato:** `TarotFan()` — abanico/arco de ~9 dorsos (`cardBackUrl(deckCtx)`, `useDeckAssets`) barajado determinista por día (semilla = fecha civil + userId, `drawCards` o un shuffle sembrado). Tocás uno → flip 3D (reusa `.flipCard`/`.face` de `tarot.module.css` o CSS propio análogo) revelando `cardImageUrl(id)` + su nombre + 1 línea (`composeReadingProse` 1 carta o essence del content core). CTA "Tirada completa"→/tarot. NO la ceremonia táctil; flip simple. El abanico debe verse bonito en el carril (arco con solape cómodo, hover-lift — lección §E del tarot chat).
- [ ] RED: monta N dorsos; click en uno lo voltea y muestra nombre; determinismo por día. → implementar → GREEN + carpeta hoy + typecheck + eslint.
- [ ] Commit `feat(hoy): abanico de tarot — dorsos del día para elegir, flip con lectura`.

---

### Task 7: Ensamblaje `dashboard-view` + CSS + limpieza + chat
**Files:** Modify `hoy/hub-view.tsx` (reescritura a dashboard) + `hub.module.css` + `hoy/page.tsx` (pasar datos server si hace falta) · Test `hoy/__tests__/dashboard.test.tsx`
**Cambios:**
1. `deskCols` 1fr/1fr; izquierda `leftCol` = [tarjeta proactiva (conservada) → EnergyPanel(disciplinas) → summary-chart → clima(conservado) → summary-horoscope occ → summary-horoscope or → summary-pillars → tarot-fan]; derecha `interpCol` sticky = `<div panel><cardH2>Pregúntale a Aluna</cardH2><ChatView embedded/></div>` (patrón perfil-chat-panel).
2. QUITAR: `.hello`/`hoy.greeting` (el "Hola"), la fila `.lenses` + array `LENSES` + su grid.
3. Encabezado compacto: nombre + `DayHeader`, sin el Hola.
4. CSS: re-escopar `hub.module.css` a maestro-detalle; secciones apiladas gap; chat sticky; móvil sin chat, secciones apiladas.
- [ ] RED: dashboard monta las 8 secciones en orden; chat a la derecha (matchMedia desktop); sin "Hola" ni lentes; móvil (matchMedia) sin chat. → implementar → GREEN + suite completa + typecheck + eslint.
- [ ] Commit `feat(hoy): dashboard maestro-detalle — 8 secciones a la izquierda, chat de Aluna a la derecha; fuera el saludo y los lentes redundantes`.

---

### Task 8: Gate final + review Fable + merge
- [ ] Suite completa + typecheck + eslint + build 16GB EXIT 0 → dev :3011.
- [ ] Controlador en navegador propio: `/hoy` desktop → las 8 secciones bonitas en orden; **el toggle de disciplina cambia las barras de verdad** (General/Astros/Números/Pilares — mirar que Números y Pilares den barras distintas y coherentes); carta/clima/horóscopos/pilares con su resumen; **abanico de tarot: elegir una y que se voltee con su lectura**; chat a la derecha responde (Ollama); sin "Hola" ni lentes; móvil apilado sin chat. Capturas a `.dev-shots/`. Calibrar 50/50 vs 12/10 si el chat queda vacío.
- [ ] Review integral **Fable 5** de la rama → ola de fixes → re-review → merge a main vía worktree efímero (fast-forward si se puede) + smoke + ledger + memoria + reporte.
