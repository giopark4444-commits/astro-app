# Hoy dashboard — la pantalla de bienvenida en maestro-detalle

**Fecha:** 2026-07-21 · **Rama:** `hoy-dashboard` (desde origin/main `43f25ab`)
**Aprobado por:** Gio (orden de secciones, barras por disciplina, abanico de dorsos, quitar Hola+lentes).
**Modelos:** diseño/motor/integración = Opus; piezas mecánicas = Sonnet; review final = Fable 5.

## Visión
`/hoy` es la pantalla que recibe al usuario: un DASHBOARD que resume TODOS los lentes de un vistazo.
Patrón maestro-detalle de la serie: izquierda = todo el contenido en secciones apiladas; derecha =
solo el chat de Aluna (embebido, con palancas), sticky. Debe verse **bonita** — es la cara de la app.

## 1. Layout (desktop ≥1080)
- `deskCols` grid: izquierda 1fr (contenido), derecha 1fr sticky (chat) — **50/50** por consistencia
  con Perfil (a calibrar en el gate: si el chat queda muy vacío frente al contenido denso, evaluar
  12/10). Receta de la serie: `interpCol`/panel `position:sticky; top:84px; height:calc(100vh-100px)`.
- Móvil (<1080): todo apilado; el chat NO se monta visible (vive en `/preguntar`); regresión-cero del
  Hoy salvo las secciones nuevas.

## 2. Columna izquierda — secciones en orden
1. **"Aluna te recuerda"** — la tarjeta proactiva de compromisos que YA existe en Hoy (memoria fase 2,
   `hub-view` la monta como primer hijo). Se conserva arriba de todo.
2. **Cuadro principal de barras** — las 6 áreas (amor/dinero/trabajo/salud/ánimo/suerte) con una fila
   de botones **General · Astros · Números · Pilares**. El botón activo recalcula las barras desde esa
   disciplina (motor §5). Header "¿Cómo estás hoy?" o similar. Es el cuadro protagonista.
3. **Carta astral resumida** — Sol/Luna/Asc (chips) + el párrafo tejido de `composeCoreReading`
   (reusa lo de `/carta`). CTA "Ver tu carta" → `/carta`.
4. **Tu clima de hoy** — los tránsitos del día (ya existe en `hub-view`: `/api/chart` kind transits,
   top 3 aspectos). Se conserva/reubica aquí (después de carta, como pidió Gio).
5. **Horóscopo occidental** — resumen: 1-2 párrafos de `composeWesternProse` del periodo "today".
   CTA → `/horoscopo`.
6. **Horóscopo oriental** — resumen: `composeEasternProse` today. CTA → `/horoscopo?trad=oriental`.
7. **Pilares** — esencia de `composeBaziReading` (client-safe) sobre los pilares del perfil. Requiere
   los pilares natales (server, `computeBaziNatal`) → se piden vía `/api/bazi` o se pasan por props del
   server component. CTA → `/pilares`.
8. **Tarot** — abanico de dorsos boca abajo (arte real del mazo, `useDeckAssets`). Tocás una → se
   voltea (flip 3D) y da su lectura del día (`composeReadingProse` 1 carta / o essence del contenido
   core). CTA → `/tarot` para la ceremonia completa. Diseño: fila/arco de ~7-13 dorsos representativos
   (no las 78 — un abanico bonito), barajado determinista por día para que sea "la baraja de hoy".

## 3. Columna derecha — chat
`<ChatView embedded />` (trae `ChatLenses` incluido) dentro de un panel con título "Pregúntale a Aluna",
exactamente como `perfil-chat-panel.tsx`. Cero clon.

## 4. Limpieza
- QUITAR el "Hola" (`styles.hello` / `hoy.greeting`) sobre el nombre.
- QUITAR la fila de lentes de abajo (`.lenses` / array `LENSES`, `hub.module.css` grid de 5) —
  redundante con el TopNav.
- El nombre + `DayHeader` (fase lunar/signo) se conservan compactos como encabezado del dashboard.

## 5. Motor de barras por disciplina (NUEVO — la parte de dominio)
Meta: cada disciplina produce las MISMAS 6 áreas con el mismo shape `LifeAreaScore[]`
(`{area, score 0-100, tone, drivers}`) para que las barras las rendericen igual.

### 5a. Astros (ya existe)
`scoreLifeAreas(transitAspects)` de `@aluna/core` — tránsitos vs natal, `AREA_RULERS`. Sin cambios.

### 5b. Números → áreas (nuevo, `packages/core/src/numerology/life-areas.ts`)
`scoreLifeAreasNumerology(cycles: PersonalCycles): LifeAreaScore[]`.
Base: el **día personal** (1-9/maestros) marca la energía del día; mes y año personal dan contexto.
Correspondencia número→afinidad de área (numerología pitagórica tradicional, documentada):

| Nº | Áreas fuertes | Rationale |
|---|---|---|
| 1 | trabajo, ánimo | iniciativa, liderazgo, empuje |
| 2 | amor, ánimo | vínculo, cooperación, sensibilidad |
| 3 | ánimo, amor | expresión, alegría, creatividad |
| 4 | trabajo, salud | estructura, disciplina, cuerpo |
| 5 | suerte, ánimo | cambio, libertad, aventura |
| 6 | amor, salud | hogar, cuidado, responsabilidad |
| 7 | ánimo, salud | introspección, mente, espíritu |
| 8 | dinero, trabajo | logro material, poder, ambición |
| 9 | suerte, amor | compasión, cierre, generosidad |

Algoritmo: score base 50 (neutral); el día personal aporta +N a sus áreas fuertes y −(menor) a las
opuestas; mes/año personal modulan con menor peso. `tone` derivado del score. `drivers` = "Día personal
N", "Mes personal M". Números maestros (11/22/33) = pico de intensidad en sus áreas. Determinista.

### 5c. Pilares → áreas (nuevo, `packages/core/src/bazi/life-areas.ts`)
`scoreLifeAreasBazi(natal: PillarSet, dayPillar: Pillar, favorable: FavorableElements): LifeAreaScore[]`.
Base: el **elemento del pilar del día actual** interactúa con los elementos favorables/desfavorables
del natal. Correspondencia elemento→área (Wu Xing, documentada):

| Elemento | Áreas | Rationale |
|---|---|---|
| Madera (wood) | salud, ánimo | crecimiento, vitalidad, expansión |
| Fuego (fire) | amor, ánimo | pasión, expresión, calor |
| Tierra (earth) | trabajo, salud | estabilidad, nutrición, cuerpo |
| Metal (metal) | dinero, trabajo | valor, corte, disciplina |
| Agua (water) | suerte, amor | flujo, sabiduría, vínculo |

Algoritmo: el elemento del día (tronco+rama del `dayPillar`) es favorable → sube sus áreas; desfavorable
→ baja. Modulado por la fuerza del Maestro del Día. `drivers` = elemento del día + favorable/desfavorable.
Requiere el `dayPillar` de HOY (server, `computeBaziNatal` da los natales; el pilar del día se computa
de la fecha civil — verificar helper o computarlo).

### 5d. General
`combineLifeAreas([astros, numeros, pilares]): LifeAreaScore[]` — promedio ponderado por área (pesos
iguales de arranque; astros pesa un poco más por ser el más granular). `drivers` = top de cada
disciplina. Es el modo por defecto al abrir el dashboard.

**Datos server-side:** el motor necesita transitAspects (astros), cycles (client-safe), y pilares
(server). Se resuelven en `hoy/page.tsx` (server) o vía un `/api/hoy-scores` que devuelva los 4 sets
(general+astros+numeros+pilares) — DECISIÓN DEL PLAN (probablemente extender `/api/scores` a aceptar
`discipline` o devolver los 4). El toggle de disciplina en el cliente cambia cuál se muestra (los 4 ya
vienen calculados, sin refetch — como el periodo hoy).

## 6. Estructura de código
- `hoy/hub-view.tsx` → `hoy/dashboard-view.tsx` (o reescribir hub-view): orquesta las secciones + el
  panel de chat + `deskCols`. Cada sección un componente enfocado (varios ya existen: EnergyPanel,
  clima, DayNumberCard; nuevos: mini-carta, horóscopo-resumen occ/or, pilares-resumen, tarot-abanico).
- `EnergyPanel` gana el toggle de disciplina (además del periodo, o reemplazándolo — decidir en el plan).
- Motores nuevos en `@aluna/core` (numerology/life-areas, bazi/life-areas, combine).
- CSS: `hub.module.css` re-escopado a maestro-detalle (deskCols 1fr/1fr, secciones apiladas izq, chat
  sticky der). Quitar `.hello`, `.lenses`.

## 7. Tests
- Motores: cada `scoreLifeAreas*` produce 6 áreas, scores 0-100, determinista; combine promedia; casos
  borde (sin hora para pilares, números maestros).
- Dashboard: secciones presentes en orden; el toggle de disciplina cambia las barras sin refetch;
  chat montado a la derecha; móvil sin chat; sin "Hola" ni lentes.
- Verificación en navegador (gate): las 8 secciones bonitas; toggle real cambia barras; abanico de
  tarot se voltea; chat responde.

## Fuera de alcance
Móvil del chat en Hoy; reescribir los lentes individuales; la ceremonia táctil completa en el abanico
(es un flip simple); tirada de 3 en el dashboard (1 carta).
