# Horóscopo (Occidental + Oriental) — Diseño

**Fecha:** 2026-07-13 · **Estado:** aprobado por Gio (brainstorming) · **Rama:** worktree-horoscopo

## 1. Objetivo y posicionamiento

Activar la sección **Horóscopo** (hoy `soon: true` en el nav) como la tercera lente viva de
Aluna: lecturas por periodo (hoy/semana/mes/año) del zodiaco **occidental** (12 signos) y
**oriental** (12 animales chinos), calculadas con el motor real de efemérides — no texto
enlatado. El listón es el mismo del resto de la app: **que un profesional la use y quede
impresionado de lo completa que es**. Eso significa técnica profesional de verdad (casas
solares, eventos astronómicos del periodo, estándar Tong Shu con Tai Sui y choque del día),
Modo Pro con la lámina técnica, y cero afirmaciones astronómicamente incorrectas (regla
anti-funa del proyecto).

Principio rector intacto: **un motor de efemérides, varias capas de interpretación.** No se
construye ningún motor nuevo — se generaliza lo que ya calculan `@aluna/core`,
`@aluna/ephemeris` y el módulo Ba Zi.

**Futuro compartido con Carta:** ambas tradiciones del horóscopo derivan del mismo motor que
la Carta Astral, y es posible que más adelante compartan segmento de la app. Por eso este
diseño **reusa los mismos tipos de datos** (`Aspect`, `LifeAreaScore`, `Pillar`,
`Interaction`) y los mismos componentes presentacionales, para que una fusión futura sea
recableado de UI, no reescritura.

## 2. Decisiones de producto (cerradas con Gio)

1. **Ambos modos:** abre con el signo/animal del perfil activo preseleccionado (personal),
   con selector libre para explorar cualquier otro signo/animal sin salir de la pantalla.
2. **Contenido vivo + híbrido:** lecturas calculadas desde tránsitos/pilares reales del
   periodo (opción 2) **y** el patrón de tiers de la app (opción 3): prosa base "Esencia"
   escrita a mano + tiers Profunda/Completa vía el proveedor IA intercambiable, dormidos
   hasta que haya llave (idéntico a Carta/Numerología).
3. **UI:** `/horoscopo` con **dos tabs de nivel superior** — Occidental / Oriental — cada
   una con su propio selector y contenido.
4. **Modo Pro en ambas tabs** (decisión histórica "Modo Pro en los 4 pilares" se extiende
   aquí): el practicante ve la hoja de trabajo técnica de su tradición.

## 3. Arquitectura

```
@aluna/core (puro, RN-safe)
├─ astrology/solar-houses.ts      [NUEVO] casas solares whole-sign por signo +
│                                  aspectos signo-a-signo + scoreLifeAreasBySolarHouse()
├─ astrology/life-areas.ts        [existente] tipos LifeAreaScore/AreaDriver (se reusan)
└─ bazi/horoscope.ts              [NUEVO] interacciones periodo-vs-animal (usa
                                   branchPairInteractions), Tai Sui, categorías orientales

@aluna/ephemeris (server-only)
├─ events.ts                      [NUEVO] escáner genérico de eventos del periodo:
│                                  lunaciones (+bandera eclipse), estaciones ℞/D,
│                                  ingresos de signo, exactitud de aspectos
└─ jie.ts                         [extender] exponer fechas exactas de 節 en un rango
                                   (la maquinaria Newton ya existe)

apps/web
├─ app/api/horoscope/western/route.ts   [NUEVO]
├─ app/api/horoscope/eastern/route.ts   [NUEVO]
├─ app/(app)/horoscopo/…                [NUEVO] page + tabs + vistas + css
├─ app/(app)/hoy/energy-panel.tsx       [refactor mínimo] extraer capa presentacional
├─ lib/content/horoscope-es.ts / -en.ts [NUEVO] 24 bloques Esencia + composición
└─ components/top-nav.tsx               [flip] soon: false + tile en hub

apps/mobile
└─ app/(tabs)/horoscopo.tsx             [NUEVO, Plan 3] espejo nativo de ambas tabs
```

## 4. Motor occidental — técnica profesional

### 4.1 Casas solares (whole-sign)

La técnica estándar de horóscopo por signo (Astrodienst, Susan Miller): el signo elegido ES
la casa 1; cada signo siguiente, la casa siguiente. La casa solar de un tránsito es
aritmética pura de signos:

```
casaSolar = ((signoIndex(tránsito) − signoIndex(signoElegido) + 12) % 12) + 1
```

`solar-houses.ts` expone `solarHouseOf(sign, longitude)` y el mapeo casa→áreas de vida
(2→dinero, 5/7→amor, 6/10→trabajo, 1/6→salud, 3/11→ánimo/social, 9→suerte…, tabla completa
y defendible en el código). `scoreLifeAreasBySolarHouse(placements)` devuelve el MISMO
`LifeAreaScore[]` que `scoreLifeAreas` (reusa `scoreTone`, pesos por planeta
`TRANSIT_WEIGHT`, valencia benéfico/maléfico) → el panel de barras se reusa sin tocar.

### 4.2 Aspectos honestos (anti-funa)

- **Modo exploratorio (cualquier signo, sin carta):** aspectos **signo-a-signo** (técnica
  whole-sign clásica): "Marte en Virgo, cuadratura por signo con tu Géminis". Nunca se
  inventa un grado natal que no existe.
- **Modo personal (perfil activo):** además, aspectos a grado exacto contra los planetas
  natales reales (`detectAspectsBetween`, ya existente) — los tránsitos que tocan TU carta
  se marcan en línea: "…y además toca tu Venus natal".

### 4.3 Eventos del cielo del periodo (`events.ts`)

Una sola utilidad genérica: escanear `f(t)` en el rango del periodo buscando cruces por
cero y refinar con Newton (misma técnica ya validada en revolución solar y
`jieBoundaries`). Sobre ella, cuatro wrappers:

| Evento | f(t) | Salida |
|---|---|---|
| Lunaciones | elongación Luna−Sol = 0° / 180° | fecha exacta, signo, casa solar, bandera eclipse |
| Estaciones | velocidad del planeta = 0 | fecha, planeta, ℞ o directo, signo |
| Ingresos | longitud cruza múltiplo de 30° | fecha, planeta, signo nuevo |
| Exactitud | separación − ángulo del aspecto = 0 | fecha en que el tránsito perfecciona |

**Eclipses:** preferir las funciones nativas de eclipse de sweph si el binding las expone;
si no, heurística conservadora por cercanía al Nodo (umbral estricto; ante la duda NO se
etiqueta eclipse). Validación canónica en tests: eclipses publicados de 2026 (solar
17-feb y 12-ago; lunar 3-mar y 28-ago).

### 4.4 Periodos (anclados a calendario, no rolling)

hoy = fecha local · semana = lun–dom que contiene hoy · mes = mes calendario ·
año occidental = año calendario. Muestreo de barras como `/api/scores` (1/7/6/12
muestras) pero desde el inicio del periodo. **"Hoy" se calcula en la zona horaria del
usuario** (el cliente manda su IANA tz) y el pie del Modo Pro la declara.

## 5. Motor oriental — estándar Tong Shu

Los pilares del periodo salen de `yearPillar/monthPillar/dayPillar` (ya exportados; el mes
cambia en el término solar exacto vía la maquinaria de `jie.ts`). Contra el animal elegido
(su rama terrestre) — y contra los 4 pilares natales completos si hay perfil — se calcula
con `branchPairInteractions` (ya existente, 刑沖合害·六合·三合·破):

- **Choque del día (冲):** "hoy choca con Conejo" — el dato central de todo horóscopo
  chino diario serio.
- **Armonías del día:** 六合 / 三合 con la rama del día = animales favorecidos.
- **Tai Sui (太歲) en la vista año:** interacción de tu rama con la rama del año
  (2026 desde Lichun = 丙午 Caballo de Fuego): 值太歲 (mismo animal), 冲太歲 (Rata),
  害 (Buey), 自刑 (Caballo), 破 (Conejo). Test canónico contra la tabla tradicional.
- **Mes con término solar exacto:** "el mes 戊申 comienza el 7 de agosto a las HH:MM"
  (fechas de 節 en el rango, extensión de `jie.ts`).
- **Wu Xing del periodo:** ciclo de generación/control entre el elemento del pilar del
  periodo y el elemento de tu rama.
- **Año oriental = año solar** (Lichun a Lichun), no año calendario — con nota visible.

`bazi/horoscope.ts` puntúa las **categorías clásicas chinas** — carrera(work),
dinero(money), amor(love), salud(health), suerte(luck) — determinísticamente desde las
interacciones (合 suma, 冲 mueve/inestabiliza, 刑 fricción-lección, 害 cautela, ponderado
por pilar: día>mes>año), devolviendo `LifeAreaScore[]` (subconjunto de 5 áreas) → mismas
barras, mismos drivers explicables.

**Notas anti-funa orientales:** (a) el animal auto-detectado del perfil usa el pilar de año
por **Lichun** (como `computeBaZi`), con nota explícita para nacidos entre ~20-ene y 4-feb
("los calendarios populares pueden decir otro animal; el cálculo solar dice X"); (b) nota
del 子時 tardío (23:00–24:00) en el pie Pro; (c) hanzi siempre presentes + toggle Saju
(hangul) reusando `bazi-labels.ts` y `STEM_LABELS/BRANCH_LABELS`.

## 6. APIs

Dos rutas nuevas, patrón idéntico a `/api/chart` (runtime nodejs, `setEphePath`, auth
Bearer+cookie vía `authenticateRoute`, sesión requerida):

```
POST /api/horoscope/western
  { sign: "aries"…, period: "today|week|month|year", tz: "America/Bogota",
    profileId?: string }           // profileId opcional → cruces natales (RLS-validado)
→ { period, range: {fromIso, toIso},
    houses: Array<{ body, sign, house, retrograde }>,        // tránsitos por casa solar
    signAspects: Array<{ body, sign, aspect }>,              // aspectos signo-a-signo
    events: Array<{ kind: "lunation"|"station"|"ingress"|"exact",
                    atIso, body?, sign?, house?, detail }>,  // bandera eclipse en detail
    areas: LifeAreaScore[],
    natalHits?: Aspect[] }                                   // solo con profileId

POST /api/horoscope/eastern
  { animal: "rat"…, period, tz, profileId? }
→ { period, range,
    pillars: { year: Pillar, month: Pillar, day: Pillar },   // día solo en period=today
    interactions: Interaction[],                             // rama elegida vs pilares
    taiSui: { relation: InteractionType|"zhi"|null },        // solo en period=year
    jieDates: Array<{ atIso, monthPillar }>,                 // fronteras 節 del rango
    wuXing: { periodElement, animalElement, cycle },         // genera/controla/neutral
    areas: LifeAreaScore[],
    natalInteractions?: Interaction[] }                      // solo con profileId
```

- `sign`/`animal` son parámetros libres (no dependen de perfil). `profileId`, si viene, se
  valida contra `birth_profiles` con RLS como siempre.
- **Caché universal:** el payload NO es por usuario — clave
  `(trad, signo|animal, period, fechaLocal, offsetRedondeado)`; LRU en memoria en v1
  (~12×4×pocos offsets al día). La prosa IA va al `reading_cache` durable existente con
  kind `horoscope` (universal por clave+locale+tier, mismo patrón de dormancia).

## 7. UI web `/horoscopo`

- **Tabs Occidental / Oriental** (nivel superior, estado en query param `?trad=` para que
  sea compartible; default occidental). Mismo lenguaje visual de tabs que Carta.
- Cada tab: **selector de 12** (chips con glifo ♈…/animal 子鼠…, preselección desde el
  perfil activo cuando existe), **selector de periodo** (hoy/semana/mes/año, como Tu
  Energía), y debajo:
  1. **"El cielo del periodo"** — cabecera con los eventos mayores (lunaciones con casa
     solar, estaciones, ingresos / pilares del periodo, choque del día, Tai Sui).
  2. **Barras de áreas** — capa presentacional extraída de `energy-panel.tsx`
     (refactor mínimo: el fetch queda en cada contenedor; las barras+drivers+"por qué"
     se comparten). Tap → drivers reales (el porqué astronómico/sexagenario).
  3. **Lectura en prosa** — Esencia compuesta desde los drivers calculados (§8) +
     selector Profunda/Completa (IA latente).
  4. **Cruce personal** (si hay perfil): "esto toca tu carta" con los hits natales.
  5. **Modo Pro** (toggle): occidental = tabla de tránsitos por casa solar con
     orbe/fecha de exactitud + timeline de eventos + metodología (whole-sign, orbes,
     tz declarada); oriental = lámina de pilares del periodo en hanzi + tabla de
     interacciones 刑沖合害 + fronteras de 節 al minuto + notas Lichun/子時.
- **Desktop (R4):** split sticky tipo Carta (izquierda: selector+barras; derecha:
  eventos+prosa+Pro), móvil apilado. Antes de maquetar: skills de diseño +
  biblioteca-visual (regla del proyecto, sí o sí).
- **Nav:** `top-nav.tsx` flip `soon: false` (+test actualizado) + tile Horóscopo en el
  hub de Hoy.

## 8. Contenido (voz Aluna)

- **24 bloques Esencia** escritos a mano (12 signos + 12 animales), es/en, voz
  evolutiva-yóguica (don/sombra, sin fatalismo — retrógrado ≠ miedo). El bloque da el
  ADN del signo/animal; la lectura del periodo se **compone**: bloque + drivers
  calculados + eventos del periodo → la prosa NUNCA contradice la tabla Pro (el
  profesional va a cotejar).
- Tiers **Profunda/Completa** vía `lib/reading/provider.ts` (Claude/OpenAI/Gemini,
  el que Gio encienda), prompt nuevo de horóscopo (recibe los datos calculados como
  contexto — la IA interpreta, jamás inventa posiciones), caché durable universal,
  dormido sin llave con la Esencia + nota cálida (patrón idéntico a Carta).

## 9. Testing (anclas canónicas anti-funa)

- **Eventos:** lunaciones de jul-2026 contra efemérides publicadas (minuto), eclipses
  2026 (17-feb, 3-mar, 12-ago, 28-ago), estación de Mercurio ℞ más próxima, un ingreso
  conocido. Tolerancias documentadas.
- **Casas solares:** tabla completa de un caso (p.ej. tránsitos de hoy para Acuario) +
  propiedad: casa 1 = signo elegido siempre.
- **Oriental:** tabla Tai Sui 丙午 completa (值/冲/害/自刑/破), choque del día para una
  fecha ancla, frontera de mes = 節 exacto (ya validado a segundos), nota Lichun para
  fecha límite (2-feb vs 5-feb).
- **APIs:** auth (401 sin sesión), RLS del profileId opcional, payload shape.
- **UI:** render de ambas tabs, flip del nav, i18n es/en.
- Gates de siempre: typecheck + tests + `next build` (lección registrada) +
  verificación en navegador real.

## 10. Diferido explícitamente (NO v1)

Oficiales del día 建除 / horas auspiciosas / 28 mansiones · Luna vacía de curso ·
página pública sin login (teaser SEO) · zodiaco sideral en horóscopo · heatmap mensual ·
compatibilidad de animales del día (más allá de choque/armonía básicos).

## 11. Fasing (3 planes de implementación)

1. **Plan H1 — Motor de eventos + tab Occidental completa** (core solar-houses,
   ephemeris events, API western, UI tabs+occidental, contenido 12 signos, Pro,
   refactor EnergyPanel, flip nav). Valida el patrón end-to-end.
2. **Plan H2 — Tab Oriental completa** (core bazi/horoscope, extensión jie, API
   eastern, UI oriental, contenido 12 animales, Pro lámina).
3. **Plan H3 — Espejo móvil** (pantalla `horoscopo.tsx` con ambas tradiciones, 6ª tab;
   render final lo verifica Gio en Expo Go como siempre).

## 12. Riesgos y notas

- **Rendimiento:** el escaneo anual (estaciones/ingresos/lunaciones) corre una vez por
  clave universal y queda en caché — costo marginal ~0 por usuario.
- **Licencia Swiss Ephemeris:** sin cambio (misma dependencia dual AGPL/pro ya
  documentada).
- **Sin dependencias nuevas.** Todo sale de sweph/luxon/next-intl ya presentes.
- La otra sesión (R4b1 perfil) no toca ninguno de estos archivos; el único punto de
  contacto futuro es el merge del nav (trivial).
