# Horóscopo H2 — Tab Oriental completa: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development o superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** reemplazar el placeholder `easternSoon` de `/horoscopo?trad=oriental` por la
lectura oriental completa del spec `docs/superpowers/specs/2026-07-13-horoscopo-design.md`
(§5 motor Tong Shu, §6 API, §7 UI): choque del día, armonías, Tai Sui en vista año, mes por
término solar exacto, Wu Xing del periodo, 5 categorías clásicas con barras explicables,
prosa compuesta de los 12 animales, y lámina Pro con hanzi/hangul.

**Architecture:** espejo del pipeline occidental H1 ya en main — motor puro y testeable en
`apps/web/lib/horoscope/eastern.ts` (compone primitivas de `@aluna/core` bazi), API
`/api/horoscope/eastern` clonando el patrón de `western/route.ts`, UI reemplazando SOLO el
branch oriental de `horoscopo-view.tsx` (la occidental no se toca). La UI reusa `AreaBars`
tal cual; el "cielo del periodo" oriental es un componente nuevo local (sky-events.tsx es
occidental-acoplado, no se reusa). Contenido de los 12 animales sigue el patrón exacto de
`horoscope-es.ts`/`horoscope-en.ts` (es.ts es el motor de composición, en.ts solo dicts).

**Tech Stack:** Next.js 15 App Router, `@aluna/core` (bazi) + `@aluna/ephemeris` (sweph),
Luxon, CSS Modules + tokens R3, next-intl, Vitest.

## Global Constraints

- Gate por tarea (desde `apps/web/`, o el paquete que toque):
  `npx tsc --noEmit && npx vitest run && rm -rf .next && npx next build`
  (en `packages/*`: `pnpm test` del paquete + tsc).
- i18n: toda clave nueva en `messages/es.json` **y** `en.json` (vigila `app/__tests__/i18n.test.tsx`).
- Glifos unicode de texto llevan `U+FE0E` donde aplique (patrón `TEXT_VS`).
- Hanzi SIEMPRE presentes; toggle hangul reusa `STEM_LABELS`/`BRANCH_LABELS` de
  `packages/core/src/bazi/labels.ts` y el patrón de `pillar-column.tsx:50,69-79`.
- Sin dependencias nuevas. Commits en español, prefijo `feat(h2):`.
- Anti-funa (spec §5): año oriental = Lichun a Lichun con nota visible; animal
  auto-detectado usa pilar de año por Lichun con nota para nacidos ~20-ene–4-feb;
  nota 子時 tardío (23:00–24:00) en el pie Pro; los drivers de las barras NUNCA
  contradicen la tabla Pro (test obligatorio, mismo patrón que western.test.ts:67-75).
- Desktop: mismo grid/breakpoint que la vista occidental ya usa en horoscopo.module.css
  (`@media (min-width: 1080px) /* bp desktop R4a */`).

## Hechos del código (verificados 2026-07-16, para no redescubrir)

- `packages/core/src/bazi/bazi.ts`: `yearPillar(solarYear):Pillar` (L116),
  `monthPillar(yearStem, sunLongitude)` (L125), `dayPillar(y,m,d)` (L135),
  `hourPillar(dayStem, hour)` (L144). `Pillar = {stem:0-9, branch:0-11}` (L60-63).
  `EARTHLY_BRANCHES[i].animal` mapea rama→animal `rat…pig` (L45-58).
- `packages/core/src/bazi/interactions.ts`: `branchPairInteractions(a,b)` (L71) cubre
  六合/冲/害/刑(子卯 y grupos)/自刑 — **NO cubre 三合 a nivel de par** (el trino necesita
  3 ramas; `detectInteractions(PillarSet)` L92 sí lo detecta sobre el set completo).
  Para el cruce personal (rama del periodo vs 4 pilares natales): iterar
  `branchPairInteractions` por pilar Y detectar半 three-harmony por separado si se quiere
  (decisión: par a par basta para H2; 三合 de 3 puntos queda como mejora — documentar).
- `packages/ephemeris/src/jie.ts`: `jieBoundaries(input)` (L34) da días al 節 previo/
  siguiente vía Newton. **No existe** `jieDatesInRange` — es la Task 1. Patrón a reusar:
  `findCrossings` de `packages/ephemeris/src/events.ts:45-70`.
- `apps/web/lib/horoscope/western.ts`: `resolvePeriodRange` (L43) es año CALENDARIO —
  el oriental necesita su propia variante para `year` (Lichun→Lichun). `HOROSCOPE_PERIODS`,
  `isValidTz`, cache FIFO (`CACHE_MAX=512`) — replicar patrón.
- Área/score: shape exterior `{area, score:0-100, tone, drivers}` para reusar `AreaBars`
  (`components/area-bars.tsx`: `BarArea = {key,label,score,tone,toneLabel,drivers:{glyphs,text,favorable}[]}`
  — el mapeo a BarArea se hace en la vista, así que el driver oriental puede tener su
  propia forma cruda `{interaction, pillar, favorable}`).
- API patrón: `apps/web/app/api/horoscope/western/route.ts` — `runtime="nodejs"`,
  `setEphePath(...)` top-level, `authenticateRoute`, validación body → 400, profileId
  opcional con `birth_profiles` RLS → 404, catch → 500 `{error:"compute"}`.
  Plantilla para pilares desde perfil: `apps/web/app/api/bazi/route.ts`.
- UI: branch oriental actual = `horoscopo-view.tsx:123-124` (placeholder). Tabs con
  `?trad=` ya funcionan. Claves i18n existentes del namespace `horoscopo` incluyen
  `tabEastern`, `easternSoon` (esta última se elimina al reemplazar el placeholder).
- Contenido: `apps/web/lib/content/horoscope-es.ts` — `HOROSCOPE_SIGNS_ES` con
  `{essence,flow,shadow}`, `composeWesternProse(locale,payload)` (L95) →
  `composeWith(locale,payload,dicts)` (L125). `en.ts` solo dicts; import runtime SOLO
  es.ts→en.ts.
- Tests canónicos a espejar: `apps/web/lib/horoscope/__tests__/western.test.ts` y
  `packages/core/src/bazi/__tests__/interactions.test.ts` (tabla exhaustiva por par).

---

### Task 1: `jieDatesInRange` en `@aluna/ephemeris`

Extensión de jie.ts: fechas exactas de los 節 (términos solares que abren mes, múltiplos
de 30° desde 315°/Lichun) dentro de un rango [fromIso, toIso].

**Files:**
- Modify: `packages/ephemeris/src/jie.ts`
- Modify: `packages/ephemeris/src/index.ts` (export)
- Test: `packages/ephemeris/src/__tests__/jie.test.ts` (extender)

**Interfaz:** `jieDatesInRange(fromIso: string, toIso: string): Array<{ atIso: string; solarLongitude: number }>`
— sin tz (el llamador convierte); usa la técnica muestreo+bisección de `findCrossings`
(events.ts) sobre la longitud solar buscando cruces de múltiplos de 30° en fase Lichun
(315°, 345°, 15°, 45°, …).

- [ ] **Step 1: Test que falla** — anclas canónicas verificables: Lichun 2026 (~4-feb),
  節 de agosto 2026 (立秋 ~7-ago), rango de un año devuelve 12 fechas, rango de una
  semana sin 節 devuelve []. Precisión: coherente con `jieBoundaries` (mismo día y hora
  al minuto para el mismo cruce).
- [ ] **Step 2: Implementar** con `findCrossings` (o técnica equivalente reusada).
- [ ] **Step 3: Gate del paquete + commit** — `feat(h2): jieDatesInRange — fechas exactas de 節 en un rango`

### Task 2: Motor oriental `apps/web/lib/horoscope/eastern.ts` (core Tong Shu)

El corazón. Función pura `computeEasternHoroscope(animal, period, tz, natalPillars?)` +
`cachedEasternHoroscope` (patrón FIFO de western).

**Payload (forma espejo de `WesternPayload`, spec §6):**
periodo + rango (año = Lichun→Lichun para `year`, con `resolveEasternPeriodRange` propia;
today/week/month = mismas anclas de calendario que western) + pilares del periodo
(año/mes/día en hanzi con stem/branch índices) + `jieDates` del rango (Task 1) +
interacciones del animal vs rama del día/mes/año (choque 冲, armonías 六合, y en vista año
la fila Tai Sui completa 值/冲/害/自刑/破) + Wu Xing del periodo (ciclo generación/control
elemento del pilar vs elemento de la rama del animal) + `areas: 5 categorías`
(work/money/love/health/luck) puntuadas determinísticamente: 合 suma, 冲 inestabiliza,
刑 fricción, 害 cautela, ponderado día>mes>año + `natalHits` opcional (perfil: 4 pilares
natales vs pilares del periodo, par a par).

**Files:**
- Create: `apps/web/lib/horoscope/eastern.ts`
- Test: `apps/web/lib/horoscope/__tests__/eastern.test.ts`

- [ ] **Step 1: Tests que fallan** (anclas anti-funa, espejo de western.test.ts):
  - Tabla Tai Sui 丙午 (2026 desde Lichun): Caballo=值+自刑, Rata=冲, Buey=害,
    Conejo=破 — contra los 12 animales (tabla exhaustiva estilo interactions.test.ts).
  - Choque del día para fecha ancla fija (calcular el pilar del día con `dayPillar` y
    verificar que el animal en 冲 con esa rama aparece como choque).
  - `year` = Lichun→Lichun: para una fecha de enero-2026, el "año" oriental es 乙巳
    (2025) no 丙午 — frontera exacta.
  - Los drivers de cada área SIEMPRE coinciden con las interacciones de la tabla Pro
    (mismo Map-check que western.test.ts:67-75).
  - 5 áreas exactas (sin mood), scores 0-100, determinismo (mismo input → mismo objeto
    vía cache).
- [ ] **Step 2: Implementar** el motor. Nada de aleatoriedad; todo derivado de pilares +
  interacciones. Documentar en comentario la decisión "par a par, 三合 de 3 puntos fuera
  de H2".
- [ ] **Step 3: Gate + commit** — `feat(h2): motor oriental Tong Shu — pilares, Tai Sui, choque del día, 5 categorías`

### Task 3: API `POST /api/horoscope/eastern`

**Files:**
- Create: `apps/web/app/api/horoscope/eastern/route.ts`
- Test: el patrón del repo no testea routes con server (verificar si western tiene test de
  route; si no, la validación se cubre en el test del motor y la verificación real de Fase 5)

Clonar `western/route.ts`: runtime nodejs, setEphePath, authenticateRoute, body
`{animal: "rat"…"pig", period, tz, profileId?}` validado (animal contra el set de 12,
period contra HOROSCOPE_PERIODS, tz con isValidTz), profileId → birth_profiles RLS →
animal por defecto desde el pilar de año por Lichun del perfil + natalPillars para cruces.
Respuesta = payload del motor. 400/401/404/500 idénticos a western.

- [ ] **Step 1:** Implementar la route (el motor ya está testeado; la route es plomería).
- [ ] **Step 2: Gate + commit** — `feat(h2): API /api/horoscope/eastern (patrón western)`

### Task 4: Contenido de los 12 animales + `composeEasternProse`

**Files:**
- Modify: `apps/web/lib/content/horoscope-es.ts` (añadir `HOROSCOPE_ANIMALS_ES` +
  `composeEasternProse`; misma dirección de import es→en)
- Modify: `apps/web/lib/content/horoscope-en.ts` (`HOROSCOPE_ANIMALS_EN` dicts)
- Test: `apps/web/lib/content/__tests__/horoscope.test.ts` (extender)

12 animales con `{essence, flow, shadow}` en la MISMA voz evolutiva-yóguica de los signos
(leer 3-4 entradas existentes antes de escribir; ES y EN paralelos, EN no es traducción
literal sino la misma voz en inglés). `composeEasternProse(locale, payload)`: ADN del
animal → interacciones del periodo (favorable 合 / tenso 冲刑害) → Tai Sui si vista año /
節 si cambia el mes en el periodo → cierre flow/shadow según balance — espejo de
`composeWith`.

- [ ] **Step 1: Test que falla** — 12 animales en ambos idiomas, campos no vacíos, la
  prosa menciona el choque cuando el payload trae 冲 y no lo menciona cuando no.
- [ ] **Step 2: Escribir contenido + composer.**
- [ ] **Step 3: Gate + commit** — `feat(h2): esencias de los 12 animales + prosa oriental compuesta (ES+EN)`

### Task 5: UI — reemplazar el placeholder oriental en `/horoscopo`

**Files:**
- Modify: `apps/web/app/(app)/horoscopo/horoscopo-view.tsx` (branch oriental completo)
- Create: `apps/web/app/(app)/horoscopo/eastern-sky.tsx` (lámina del periodo: pilares en
  hanzi, choque/armonías del día, Tai Sui en año, fechas 節 — el análogo oriental de
  sky-events, componente local propio)
- Modify: `apps/web/app/(app)/horoscopo/horoscopo.module.css` (estilos nuevos mínimos;
  reusar .grid/.side/.mainCol/.section existentes)
- Modify: `apps/web/messages/es.json` + `en.json` (claves nuevas: animalAria,
  pillarsTitle, taiSuiTitle, clashDay, harmonyDay, jieNote, lichunNote, lateZiNote,
  animales 12×nombre; ELIMINAR easternSoon)
- Test: `apps/web/app/(app)/horoscopo/__tests__/eastern-view.test.tsx` (nuevo)

Estructura espejo de la occidental: selector de 12 animales (chips `chip--control`, glifo
hanzi de la rama + nombre), periodos (mismo seg), fetch a `/api/horoscope/eastern` con
estados loading/error/ready, `AreaBars` reusado con drivers mapeados
(`glyphs: hanzi del par`, `text: interacción — bazi-labels`), prosa de
`composeEasternProse`, `eastern-sky` en la columna principal, lámina Pro (toggle) con:
tabla de interacciones completa, pilares del periodo con toggle hanzi/hangul (patrón
pillar-column), notas anti-funa (Lichun frontera, 子時, tz declarada). Animal por defecto:
del perfil si hay (payload lo trae), si no Rata. Nota visible "año oriental = Lichun a
Lichun" en vista año.

- [ ] **Step 1: Test que falla** — con mock del fetch: renderiza 12 animales, cambia de
  animal → refetch, barras presentes con 5 áreas, nota Lichun visible en period=year,
  toggle Pro muestra la tabla.
- [ ] **Step 2: Implementar** (desktop: mismo grid two-col que la occidental ya tiene en
  el media query — verificar que las clases existentes aplican al branch nuevo).
- [ ] **Step 3: Gate + commit** — `feat(h2): tab Oriental viva — animales, barras, prosa, lámina Pro`

### Task 6 (controlador): Verificación real end-to-end

Navegador con cuenta de prueba: `/horoscopo?trad=oriental` a 1440px y 390px — cambiar
animal, periodo, abrir drivers, Pro ON/OFF, hanzi↔hangul, i18n EN. Confirmar contra el
spec §7 y las notas anti-funa. Occidental intacta. Es Fase 5 del skill, no subagente.
