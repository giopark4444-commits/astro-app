# Modo Pro de Cuatro Pilares (Ba Zi 八字 / Saju 사주) — Diseño

**Fecha:** 2026-07-08 · **Estado:** aprobado por Gio (brainstorming en sesión)
**Alcance:** completar la lámina técnica profesional del lente Pilares descrita en la
sección "4. Cuatro Pilares Orientales" del spec de Fase 1
(`2026-06-12-astro-app-fase1-design.md`), en **web Y móvil**, con **toggle Ba Zi ↔ Saju**.

## 1. Punto de partida (ya construido, no se rehace)

- Motor sexagenario en `packages/core/src/bazi/bazi.ts`: 4 pilares (año por Lichun,
  mes por término solar + Cinco Tigres, día por JDN anclado, hora por Cinco Ratas),
  troncos ocultos 藏干, Diez Dioses 十神. 10 tests.
- `/api/bazi`: resuelve longitud solar con `@aluna/ephemeris`, valida perfil vía RLS
  (HOY cookie-only).
- UI web `/pilares`: rejilla 4 pilares en hanzi, Maestro del Día resaltado, balance
  五行, toggle Modo Pro que ya muestra Diez Dioses + ocultos. El texto `proSoon`
  promete los 大運 "pronto".
- Móvil: NO tiene pestaña Pilares.

## 2. Decisiones de producto (tomadas en este brainstorming)

| Tema | Decisión |
|---|---|
| Fuerza del DM + 喜用神 | **Puntaje transparente con desglose de drivers** y método declarado en la UI; casos limítrofes = veredicto "equilibrado", nunca forzar. Rechazado: veredicto opaco; posponer. |
| Género Neutro en 大運 | **Mostrar ambas direcciones** (adelante y atrás) con nota honesta de que la tradición deriva la dirección del sexo de nacimiento. Rechazado: pedir dato extra; default silencioso. |
| Saju | **Toggle Ba Zi ↔ Saju en esta tanda** — misma matemática, capa de etiquetas (hanzi↔hangul, pinyin↔romanización coreana, 十神↔십신). |
| Plataformas | **Web + móvil de una vez** (el móvil estrena pestaña Pilares). |
| Enfoque técnico | **A: motor puro en `@aluna/core`**, servidor solo aporta lo astronómico (términos solares). Rechazado: todo server-side (B); por etapas (C). |

## 3. Motor de dominio — `packages/core/src/bazi/` (puro, RN-safe)

Módulos nuevos; cada tabla canónica se testea contra ejemplos publicados.

### 3.1 `nayin.ts` — 納音 (elementos melódicos)
Tabla de los 30 pares del ciclo de 60 (甲子·乙丑 = 海中金 "Oro en el Mar", …).
`nayin(pillar): { key, element }`. El nombre localizado vive en i18n/catálogo, no en core.

### 3.2 `stages.ts` — 十二長生 (12 etapas de vida)
Etapa del Maestro del Día en la rama de cada pilar (長生 nacimiento, 沐浴 baño, 冠帶,
臨官, 帝旺 cumbre, 衰, 病, 死, 墓 tumba, 絕 corte, 胎, 養). Tabla estándar: cada tronco
tiene su rama de 長生; los yang avanzan por las ramas, los yin retroceden.
`lifeStage(dayStem, branch): StageKey`.

### 3.3 `interactions.ts` — 刑沖合害 + 天干五合
Detecta entre los pilares NATALES presentes (3 o 4):
- Ramas: combinaciones 六合 (6 pares → elemento resultante), trinos 三合 (completos y
  medios-trinos con la rama pivote), choques 六沖, castigos 刑 (los 3 grupos + los
  auto-castigos 辰辰/午午/酉酉/亥亥), daños 六害.
- Troncos: las 5 combinaciones 天干五合 (甲己→土, …) — se reporta la combinación; la
  "transformación" real (化) NO se evalúa en esta tanda (depende de condiciones de
  escuela; nota honesta en spec para futuro).
`detectInteractions(pillars): Interaction[]` con `{ type, positions[], element? }`.

### 3.4 `stars.ts` — 神煞 núcleo + 空亡
Set canónico consensuado (nada de escuelas marginales):
天乙貴人 (Noble, por tronco de día → ramas), 桃花 (Flor de Durazno, por trino de la
rama de día/año), 驛馬 (Caballo Viajero, por trino), 文昌 (Académica, por tronco de
día), 華蓋 (Dosel, por trino), 羊刃 (Filo de Cabra, por tronco de día).
空亡 (Vacíos): el par de ramas vacías de la decena del pilar de DÍA; se marca en qué
pilares natales caen. `symbolicStars(pillars): StarHit[]` con `{ star, pillar }`.

### 3.5 `strength.ts` — fuerza del DM + 喜用神/忌神 (puntaje transparente)
`dayMasterStrength(pillars): { score 0..100, verdict, drivers[] }`
- **Mando del mes 月令 (~40 % del peso):** relación estacional del elemento del DM con
  la rama de mes (旺 pleno / 相 apoyado / 休 en reposo / 囚 preso / 死 muerto).
- **Raíces:** troncos ocultos de las ramas que son par o recurso del DM (raíz en mes >
  día > año ≈ hora; tronco principal pesa más que residuales).
- **Apoyos visibles:** troncos par/recurso en los otros pilares.
- Verdicto: `fuerte` / `débil` / `equilibrado` (banda central honesta, p.ej. 45–55).
- Favorables: débil → recurso + par; fuerte → drenaje (食傷) + control (官殺) + riqueza
  (財); equilibrado → nota de matiz. `favorableElements(strength): { favor[], avoid[] }`.
- Cada driver lleva `{ label-key, points }` para pintar el desglose en la UI.
- **Método declarado**: una línea en la UI ("método: mando del mes + raíces y apoyos
  ponderados"); los umbrales viven en UNA constante exportada (fuente única).
- Escuelas 從格 (seguir la corriente) quedan explícitamente FUERA de esta tanda.

### 3.6 `luck.ts` — 大運 (Pilares de Suerte) + 流年 (años de flujo)
- Dirección: (tronco de año yang × masculino) o (yin × femenino) → ADELANTE desde el
  pilar de mes; los cruces → ATRÁS. Género `neutral` → devuelve AMBAS secuencias.
- Edad de inicio: `daysToJie / 3` años (adelante usa días al término siguiente; atrás
  al anterior). Fracción → años y meses. Sin hora conocida: se calcula igual (mediodía)
  con nota de imprecisión ≈ ±2 meses.
- Secuencia: 9 décadas (edad inicio + 10n). Cada 大運: pilar, Dios del tronco vs DM,
  Na Yin. `luckPillars(input): LuckSequence | { forward, backward }`.
- 流年: `annualPillars(fromYear, count)` — pilar del año (por Lichun civil aproximado:
  el pilar de flujo del año N es simplemente `yearPillar(N)`; la ambigüedad ene-feb se
  anota en la UI, no se resuelve por persona), Dios vs DM, y marcas de interacción
  (沖/合/害/刑) de su rama contra las ramas natales.

## 4. Efemérides — `packages/ephemeris`

`jieBoundaries(input): { daysToPrevJie, daysToNextJie }` — distancia en días (con
fracción) del instante de nacimiento al cruce de longitud solar múltiplo de 30°
partiendo de 315° (los 節 que abren mes). Iteración Newton sobre la longitud solar,
mismo patrón ya probado en `solar_return`. Tests: nacimiento un día después de Lichun
→ prevJie ≈ 1; simetría prev+next ≈ duración del mes solar (29–31 días).

## 5. API — `/api/bazi` (mismo endpoint, extendido)

- **Bearer auth**: migra de `createClient` a `authenticateRoute` (paridad con
  `/api/chart`) — requisito del móvil.
- Selecciona además `gender` del perfil.
- Respuesta nueva: `{ year, month, day, hour, solarYear, timeKnown, gender,
  birthYear, daysToPrevJie, daysToNextJie }`.
- Web y móvil componen TODO lo demás client-side desde `@aluna/core`.

## 6. UI web — `/pilares` (extiende el Modo Pro existente)

Orden de tarjetas bajo lo ya existente (mismo lenguaje visual del Modo Pro de Carta):
1. **Toggle Ba Zi ↔ Saju** junto al toggle Pro (persistencia: estado local; no requiere
   settings nuevos). Cambia glifos, romanización y términos vía catálogo.
2. **Na Yin** por pilar.
3. **Fuerza del Maestro del Día**: medidor + veredicto + drivers desglosados + línea de
   método.
4. **Favorables 喜用神 / a moderar 忌神**: chips de elemento con los colores del balance.
5. **大運**: carrusel horizontal de décadas (edad, pilar, Dios, Na Yin), década actual
   resaltada; Neutro → dos filas con nota. Tap en década → sus 10 流年 (año civil,
   pilar, Dios, marcas vs natal). Nota de imprecisión si `!timeKnown`.
6. **十二長生**: etapa del DM en cada rama natal.
7. **刑沖合害**: lista de interacciones detectadas; estado vacío honesto.
8. **神煞 + 空亡**: chips por pilar.
- Sin hora: las secciones excluyen la rama/tronco de hora con nota "cálculo sobre 3
  pilares"; 大運 sí se muestran.
- Se elimina el texto `proSoon` (la promesa se cumple).

## 7. Móvil — nueva pestaña Pilares (Expo)

- `app/(tabs)/pilares.tsx` (glifo 八 en la tab bar), patrón de la Carta móvil:
  `lib/bazi-api.ts` (fetch con Bearer), `content/bazi.ts` (labels ES/EN + hanzi/hangul,
  espejo del catálogo web), tarjetas nativas con las mismas secciones 1–8.
- Ajustes móvil: "Ba Zi / Saju" pasa de "pronto" a disponible.
- Hoy (móvil): tarjeta de navegación a Pilares, mismo patrón que la tarjeta de Carta
  (Pressable con título + descripción, sin badge "pronto").

## 8. Contenido / i18n

- Catálogo `bazi-labels` compartido conceptualmente (web: `lib/content/bazi-labels.ts`;
  móvil: `content/bazi.ts`): nombres ES/EN de dioses, etapas, estrellas, Na Yin,
  interacciones + glifos hanzi Y hangul + romanizaciones (pinyin / coreana revisada).
- Los glifos/romanizaciones son DATOS del dominio → viven en `@aluna/core` junto a las
  tablas (una sola fuente); ES/EN viven en i18n de cada app.
- Términos coreanos curados con cuidado (십신, 대운, 세운, 신살, 공망, 지장간,
  신강/신약, 용신/기신) — revisión específica en el plan.

## 9. Testing y validación (anti-"funada")

- Tabla por tabla contra ejemplos publicados: Na Yin (甲子=海中金, 庚辰=白鑞金…),
  etapas (甲 長生 en 亥; 乙 en 午…), choques (子↔午…), castigos (寅巳申…), estrellas
  (天乙 de 甲 en 丑/未…), 空亡 (甲子旬 → 戌亥…).
- `luck.ts`: 4 cuadrantes de dirección; regla 3 días = 1 año con ejemplo trabajado;
  borde "nacer el día de un término".
- `strength.ts`: ejemplos publicados con veredicto conocido + carta de Gio; el driver
  breakdown suma exactamente el score.
- `jieBoundaries`: contra fechas de términos solares publicadas de años concretos.
- Verificación en vivo (browser MCP): perfil real de Gio, ES y EN, con/sin hora,
  Ba Zi y Saju, web y (bundle) móvil. Móvil visual = Gio en Expo Go.
- Pendiente externo que SIGUE en pie: Gio coteja su lámina completa contra una fuente
  Saju/Ba Zi autorizada.

## 10. Fuera de alcance (explícito)

- Transformaciones reales 化 de las combinaciones (condiciones de escuela).
- Escuelas 從格 / estructuras especiales en la fuerza del DM.
- 神煞 más allá del set núcleo listado.
- Prosa interpretativa de la lámina (corpus aparte, como en Carta).
- 세운/流月 (flujo mensual) — solo 流年 anual en esta tanda.
- Rueda/gráficos; la lámina es tabular como el Modo Pro de Carta.

## 11. Proceso de construcción

- Diseño hecho en Fable 5 (esta sesión, ultracode). Construcción: subagentes
  (tablas canónicas con implementador + verificación adversarial contra fuentes);
  **avisar a Gio antes de lanzar cualquier Workflow multi-agente** (regla vigente).
- Siguiente paso: writing-plans → plan de implementación por tareas TDD.
