# Tiradas de tarot — set completo (destacadas + secundarias)

**Fecha:** 2026-07-22 · **Rama:** `tarot-spreads` (desde origin/main `19dca6c`)
**Aprobado por:** Gio (set + posiciones + destacadas/secundarias; construir por fases).

## Objetivo
Ampliar las tiradas de 3 (del día / tres / libre) al set profesional completo, con un
selector agrupado **Recomendadas** (4 primarias) + **Más tiradas** (secundarias), en la
ceremonia digital Y en el modo manual. Cada tirada = datos puros + diagrama por
coordenadas + contenido bilingüe (voz evolutiva de Aluna, no predictiva).

## Set (posiciones confirmadas)
### Destacadas (primarias)
- **Cruz Celta** (10) — asunto · desafío · base · pasado · meta · futuro · tú · entorno · esperanzas-y-temores · síntesis. *(YA definida en `core/tarot/spreads.ts`, gateada "pronto".)*
- **Relación / Vínculo** (7) — tú · la otra persona · la conexión · tus sentimientos · sus sentimientos · el desafío · hacia dónde tiende.
- **Rueda del año** (13) — 12 meses (enero…diciembre) + tema del año (centro).
- **Decisión / Dos caminos** (7) — situación · opción A · lo que trae A · opción B · lo que trae B · lo que no ves · consejo.

### Secundarias
- **Herradura** (7) — pasado · presente · influencias ocultas · obstáculo · entorno · consejo · tendencia.
- **Cruz simple** (5) — situación · causa · pasado · futuro · síntesis.
- **Chakras** (7) — raíz · sacro · plexo · corazón · garganta · tercer ojo · corona.
- **Elementos** (5) — tierra · agua · aire · fuego · espíritu.
- **Sí / No** (1) — respuesta + matiz.

## Arquitectura (puntos de integración detectados)
- **Datos puros**: `packages/core/src/tarot/spreads.ts` — extender el union `TarotSpread["id"]`
  y `TAROT_SPREADS[]`. Añadir a cada `TarotSpreadPosition` un **`layout: {x, y}`** (coordenadas
  relativas 0..1 dentro del lienzo de la tirada) + opcional `rotate`/`size`, para que UN
  renderizador dibuje cualquier forma (cruz, herradura, rueda, columna, fila). `cardCount`
  variable ya soportado.
- **Labels de posición**: hoy `POSITION_KEY` (ceremony.tsx) mapea `position.key` → clave i18n;
  `positionLabel` (manual-entry) idem. Unificar en un mapa compartido y añadir las claves nuevas
  en `messages/es.json`+`en.json` (namespace tarot). Paridad i18n obligatoria.
- **Diario**: `DIARY_SPREAD_KEY` (interpretation-content.tsx) mapea spread id → label; añadir las nuevas.
- **Interpretación**: `packages/core/src/tarot/content-{es,en}.ts` (`READING_POSITION_LABELS`,
  plantillas) — extender con las posiciones nuevas. Bilingüe: **Sonnet escribe + Fable cura**.
- **Selector UI**: hoy la ceremonia elige spread arriba y el manual tiene `template` (three/daily/free).
  Nuevo: selector agrupado (Recomendadas grande + Más tiradas) que setea el spread; reusar en ambos.
- **Layout renderer**: reemplazar el `.slotRow` fijo por un lienzo posicionado por `layout {x,y}`
  (absolute %), responsivo; el abanico/reveal existentes se adaptan al nuevo cardCount.
- **Límite free / guardado**: respeta el gate actual (freeLimit); las tiradas grandes cuentan igual.

## Fases
- **Fase 1 — las 4 destacadas**, arrancando por **Cruz Celta** (bandera): datos+layout+labels+
  interpretación+selector "Recomendadas"+diagrama de cruz; luego Relación, Rueda del año, Decisión.
- **Fase 2 — secundarias** (Herradura, Cruz simple, Chakras, Elementos, Sí/No) en "Más tiradas".

## Fuera de alcance (por ahora)
Tiradas personalizadas por el usuario; guardar spreads propios; animaciones únicas por tirada
(usan la coreografía de ceremonia existente).

## Tests
- core: cada spread tiene cardCount == positions.length, keys únicas, layout en [0,1].
- UI: el selector agrupa bien; el renderer coloca N cartas por sus coordenadas; ceremonia y manual
  soportan cualquier spread; i18n parity con todas las claves nuevas.
- Cerrar el loop en navegador (regla Aluna): cada diagrama se ve bien y la lectura fluye.
