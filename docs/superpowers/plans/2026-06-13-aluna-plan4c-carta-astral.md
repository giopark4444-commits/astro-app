# Plan 4c — Carta Astral (web) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: usar superpowers:subagent-driven-development para lo mecánico; la RUEDA SVG y el shell visual los construye el controlador con el skill frontend-design (la estética es el corazón). Steps con checkbox `- [ ]`.

**Goal:** Mostrar en la web la Carta Astral natal del perfil activo: rueda interactiva + núcleo (Sol/Luna/Asc + balance) + Modo Pro técnico (lámina de credibilidad) + toggles de casas/zodiaco. Datos + glosas; la prosa interpretativa profunda se difiere a un pase de contenido posterior.

**Architecture:** El cómputo es server-only (`@aluna/ephemeris` vía `computeChart`, motor nativo sweph). Ruta `POST /api/chart` (runtime nodejs) que: (1) verifica que el `profileId` es del usuario autenticado (Supabase SSR + RLS), (2) mapea `BirthProfile`→`ChartInput`, (3) `computeChart(input)` → `ChartResult`. La página cliente `/carta` pide la carta y la dibuja (SVG). Caché Supabase (`getOrComputeChart`) se suma cuando llegue la service-role key; por ahora se computa fresco (determinista, barato). NO meter `@aluna/ephemeris` en el bundle cliente (App Store rule): solo en la ruta.

**Tech Stack:** Next.js 15 App Router (route handler Node), React 19, CSS Modules + vars (3 temas), next-intl (es/en), `@aluna/core` (tipos + constantes glifadas), `@aluna/ephemeris` (server). Vitest.

**Contrato de entrada (`@aluna/core`):** `ChartResult = { bodies: BodyPosition[14], houses: {system, cusps[12], ascendant, midheaven}, aspects: Aspect[], distribution: {elements, modalities, polarities, dominantElement, dominantModality}, patterns: Pattern[], meta: {julianDayUt, julianDayEt, utcHour, zodiac} }`. Glifos en `ZODIAC_SIGNS`/`PLANETS`/`ASPECTS` de `@aluna/core`.

**BirthProfile (web):** `{ id, name, birth_date "YYYY-MM-DD", birth_time "HH:MM"|null, time_known, place_name, latitude, longitude, time_zone, gender }`.

---

## Decisiones

- **Hora desconocida** (`time_known=false` o `birth_time=null`): computar a **mediodía local (12:00)** y marcar `solar: true` → la UI avisa "carta solar" y atenúa/oculta casas+AC/MC (no fiables sin hora). Cuerpos por signo sí son fiables.
- **Seguridad:** el `profileId` se valida contra `birth_profiles` del usuario autenticado (cliente SSR con RLS) ANTES de computar. Nunca confiar en lat/lng del body.
- **Prosa interpretativa DIFERIDA:** este corte = datos + glosa breve (i18n). La prosa evolutiva (planeta-en-signo/casa, ~336 piezas) y los niveles IA = pase posterior (mismo patrón que numerología).
- **Toggles Fase 1:** sistema de casas (placidus default + koch/equal/whole/regiomontanus/porphyry) y zodiaco (tropical/sidereal + ayanamsha lahiri default). Nodo/Lilith: dato visible; toggles diferibles si aprietan.
- **Rueda = SVG** (no canvas): accesible, theme-able por vars, animable. Construida por el controlador con frontend-design.

---

## File map

- Create `apps/web/lib/chart.ts` — `profileToChartInput(profile, opts)` + `isSolarChart(profile)`.
- Create `apps/web/lib/__tests__/chart.test.ts` — TDD del mapper.
- Create `apps/web/app/api/chart/route.ts` — POST, runtime nodejs, verifica perfil + computa.
- Create `apps/web/lib/content/astrology-labels-es.ts` / `-en.ts` — nombres de signos/planetas/aspectos/casas/dignidades/elementos/modalidades.
- Create `apps/web/app/(app)/carta/page.tsx` — guard + carga perfiles (server) → `<CartaView/>`.
- Create `apps/web/app/(app)/carta/carta-view.tsx` — cliente: pide `/api/chart`, estados, render.
- Create `apps/web/app/(app)/carta/chart-wheel.tsx` — la RUEDA SVG (design).
- Create `apps/web/app/(app)/carta/carta.module.css` — estilos (rueda + paneles + lámina pro), solo vars.
- Modify `apps/web/components/bottom-nav.tsx` (o donde viva) — activar pestaña "Carta".
- Modify `apps/web/messages/{es,en}.json` — sección `carta.*` (UI) con mismas claves.

---

## Tasks

### Task 1 — Mapper BirthProfile→ChartInput (TDD) [mecánico → subagente]
**Files:** Create `apps/web/lib/chart.ts`, `apps/web/lib/__tests__/chart.test.ts`.
- [ ] Test: perfil con hora `"14:00"` → `{year,month,day,hour:14,minute:0,timeZone,latitude,longitude}`; opts `{houseSystem,zodiac,ayanamsha}` pasan; sin hora → `hour:12,minute:0` y `isSolarChart` true.
- [ ] Implementar `profileToChartInput(p, opts?)` (split de `birth_date`/`birth_time`) + `isSolarChart(p)` (`!p.time_known || !p.birth_time`).
- [ ] Verde + commit.

### Task 2 — Ruta de cómputo `/api/chart` [mecánico → subagente]
**Files:** Create `apps/web/app/api/chart/route.ts`.
- [ ] `export const runtime = "nodejs"`. POST body `{ profileId, houseSystem?, zodiac?, ayanamsha?, nodeType?, lilithType? }`.
- [ ] Cliente SSR (`@supabase/ssr` getUser); si no auth → 401. Seleccionar `birth_profiles` por `id=profileId` (RLS limita al dueño); si no existe → 404.
- [ ] `profileToChartInput` + `computeChart(input)`; responder `{ chart, solar }`. try/catch → 500 `{ error }`.
- [ ] Validar enums de houseSystem/zodiac (whitelist) antes de pasar.

### Task 3 — Catálogo de etiquetas i18n astro [mecánico → subagente]
**Files:** Create `astrology-labels-es.ts` / `-en.ts`; Modify `messages/{es,en}.json` (`carta.*`).
- [ ] Mapas por clave → nombre: 12 signos, 14 cuerpos, 10 aspectos, 12 casas (ordinales), 4 dignidades, 4 elementos, 3 modalidades, 2 polaridades. ES + EN (mismas claves).
- [ ] `carta.*` UI: title/subtitle, bigThree, balance, pro toggle, headers de lámina (posiciones/distribución/aspectario/patrones), solarNotice, controls (casas/zodiaco), tapHint. Paridad es/en.

### Task 4 — Página + pestaña + estados [mecánico → subagente]
**Files:** Create `carta/page.tsx`, `carta/carta-view.tsx` (sin la rueda aún: placeholder), `carta.module.css`; Modify bottom-nav.
- [ ] `page.tsx`: server, guard auth + ≥1 perfil (redirige onboarding si 0), render `<CartaView/>`.
- [ ] `carta-view.tsx`: cliente, `useProfiles()` activo, `useEffect` → POST `/api/chart`, estados loading/error/ready; al cambiar perfil o toggles, re-fetch (cache cliente por `profileId:opts`).
- [ ] Activar pestaña "Carta" en la nav (quitar disabled, link a `/carta`).

### Task 5 — LA RUEDA SVG [design → controlador, frontend-design]
**Files:** Create `carta/chart-wheel.tsx`; estilos en `carta.module.css`.
- [ ] Geometría: `lonToAngle(lon, ascendant)` = colocar Ascendente a la izquierda (9 en punto), sentido antihorario; anillos: signos (exterior, 12 sectores 30° con glifo+color de elemento), casas (cúspides + números, AC/MC/DC/IC marcados), cuerpos (glifo en su grado con etiqueta de grado + ℞), centro = líneas de aspecto coloreadas por harmony (hard/soft/neutral).
- [ ] Anti-colisión: separar cuerpos a <~6° para que no se encimen.
- [ ] Interacción: tap a cuerpo → BottomSheet centrado (signo+casa+dignidad+grado/min/seg+velocidad/℞ + glosa breve i18n). Reveal animado, prefers-reduced-motion.
- [ ] Estética Observatory/mockup (oro/noche), theme-able por vars; carta solar → casas atenuadas + aviso.

### Task 6 — Núcleo (Sol/Luna/Asc + balance) [controlador]
**Files:** `carta-view.tsx` + css.
- [ ] Tres tarjetas grandes Sol/Luna/Ascendente (glifo+signo+casa). Barras de balance de **elementos** (fuego/tierra/aire/agua) y **modalidades** (cardinal/fijo/mutable) desde `distribution`, con dominante resaltado.

### Task 7 — Modo Pro: lámina técnica [controlador]
**Files:** `carta-view.tsx` + css.
- [ ] Toggle "Modo Pro" (como numerología). Despliega: (a) **tabla de posiciones** (cuerpo · signo grado°min′seg″ · casa · dignidad · ℞/velocidad); (b) **cuadro de distribución** (elementos × modalidades + polaridad + dominantes); (c) **aspectario** (lista/grid: par, aspecto glifo, orbe, aplicativo/separativo, color harmony); (d) **patrones** (chips: stellium/T-cuadrada/gran trígono con cuerpos); (e) **cabecera técnica** (TU/utcHour, día juliano, zodiaco, sistema de casas).

### Task 8 — Controles (casas/zodiaco) [controlador]
**Files:** `carta-view.tsx` + css.
- [ ] Selector segmentado de sistema de casas (6) y zodiaco (tropical/sideral + ayanamsha si sideral) → re-fetch `/api/chart` en vivo. Defaults placidus/tropical.

### Task 9 — Revisión final [controlador]
- [ ] typecheck 0 · lint · tests (mapper + paridad i18n) · build OK. Verificar en navegador (perfil de Gio: Sol 15°57′Acu casa 11 exilio, Asc 26°06′Piscis, stellium Escorpio) en los 3 temas + es/en. Carta solar (perfil sin hora) se comporta.

---

## Verificación de Gio (carta real)
Sol 15°57′ Acuario casa 11 (exilio), Asc 26°06′ Piscis, MC Sagitario, stellium Escorpio+Capricornio, Plutón ℞, TU 14:00. La rueda y la lámina deben reproducirlo (el motor ya lo valida al arcominuto; aquí solo lo mostramos bien).
