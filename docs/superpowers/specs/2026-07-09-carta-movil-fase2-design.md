# Carta Astral móvil — Fase 2 (rueda SVG + selectores + tap-to-detail) — Diseño

**Fecha:** 2026-07-09 · **Estado:** aprobado por Gio (brainstorming en sesión)
**Alcance:** paridad de la Carta móvil con la web: rueda SVG interactiva, selectores de
casas/zodiaco, y hoja de lectura interpretativa al tocar un planeta (corpus + tiers IA).

## 1. Punto de partida

- Web: rueda en `apps/web/app/(app)/carta/chart-wheel.tsx` (158 líneas; geometría pura:
  `pointAt`, `annularSector`, `spread` + constantes de radios; validada al arcominuto).
  Colores por elemento/armonía en `wheel-colors.ts`. Tap → `BottomSheet` con
  `composeBodyReading` (corpus `astrology-readings-es/en.ts`, ~38 bloques) + tiers IA vía
  `/api/chart-reading` (dormidos sin llave).
- Móvil: pestaña Carta en formato tabla (sin rueda), `fetchChart` YA acepta
  `houseSystem`/`zodiac` opcionales (sin cablear en UI), `BottomSheet` nativo ya existe,
  corpus de numerología ya está ESPEJADO en `apps/mobile/content/` (precedente).
- `react-native-svg` 15.15.4 es la versión oficial del SDK 56 (bundledNativeModules) y
  está incluida en Expo Go — verificable sin build nativo.
- GUSTO.md (biblioteca visual): multi-tema, i18n, iconografía de línea — el móvil ya cumple;
  la rueda debe colorearse vía tokens del tema activo, no hex fijos.

## 2. Decisiones

| Tema | Decisión |
|---|---|
| Alcance | **Completo**: rueda + selectores + tap-to-detail con corpus y tiers IA. |
| Render | **A: `react-native-svg`** + geometría compartida en core. Rechazados: WebView (B), Views sin SVG (C). |
| Fuente de geometría | **Extraer a `packages/core/src/astrology/wheel-geometry.ts`** (puro, RN-safe); web refactorizada a consumirla (cero cambio visual); móvil la consume. Una sola fuente = ruedas idénticas. |
| Corpus de lecturas | **Espejo a `apps/mobile/content/`** (mismo patrón que numerología). No va a core (regla: prosa ES/EN vive por app). |
| Colores de rueda | Por tokens del tema activo (`useTheme()`), paridad conceptual con `wheel-colors.ts`. |

## 3. Componentes

### 3.1 `@aluna/core` — `wheel-geometry.ts`
Extraído VERBATIM de la web: constantes de radios (CX/CY/R_*), `pointAt(r, lon, asc)`,
`annularSector(rOut, rIn, lonA, lonB, asc)` (devuelve string de path SVG),
`spread(bodies, gap)`. Tests: puntos conocidos (asc a la izquierda: lon=asc → x<CX,
y=CY), paths bien formados, spread no encima glifos. Web refactorizada a importar de
core (mismo render, cero cambio visual — verificar con captura).

### 3.2 Móvil — `components/ChartWheel.tsx`
`react-native-svg` (dependencia nueva: `npx expo install react-native-svg`). Misma
composición que la web: anillo de signos (relleno tenue por elemento), anillo de casas
con números, glifos de planetas en `spread`, líneas de aspectos con color por armonía
(hard/soft/neutral), marcas AC/MC, opacidad reducida si `solar`. Colores derivados de
`ThemeTokens` (acc/panel/text + un mapa elemento→tinte por tema). Tap en glifo (área
táctil ≥32px) → `onSelect(body)`.

### 3.3 Móvil — selectores en Carta
Dos filas de chips bajo el selector de tipo existente: casas (6 sistemas) y zodiaco
(Tropical/Sideral). Se pasan a `fetchChart`; la clave de caché pasa de `kind` a
`${kind}:${houseSystem}:${zodiac}`. Labels en `content/astrology.ts` + strings.

### 3.4 Móvil — tap-to-detail
`components/BodyReading.tsx` en el `BottomSheet` existente: lectura compuesta
esencia/don/sombra desde `content/astrology-readings-es.ts` / `-en.ts` (espejo fiel del
corpus web, incluida `composeBodyReading`) + selector Esencia/Profunda/Completa que llama
`POST /api/chart-reading` con `Authorization: Bearer` (patrón bazi-api); sin llave el API
responde `{available:false}` → mostrar Esencia con la nota cálida (paridad web). El
streaming de la web se simplifica a respuesta acumulada (RN sin ReadableStream estable) —
leer el texto completo y parsear, con estado "tejiendo…".

### 3.5 Integración en `app/(tabs)/carta.tsx`
La rueda va ARRIBA de las tarjetas núcleo (orden web); tabla Modo Pro intacta debajo.
Estado `sheet: BodyPosition | null`.

## 4. Fuera de alcance
Animaciones de la rueda; rueda en Pilares; streaming token-a-token en móvil; cambios a la
web más allá del refactor de geometría (import de core).

## 5. Testing
Core: tests de geometría (nuevos). Web: suite existente + captura visual de /carta idéntica
tras el refactor. Móvil: typecheck + vitest (lógica pura si aplica) + `expo export`.
Visual final: Gio en Expo Go (rueda, tap, selectores, temas).

## 6. Proceso
Construcción por subagentes (Sonnet) con review por tarea; verificación web en navegador
(la rueda web NO debe cambiar ni un píxel); móvil visual = Gio.
