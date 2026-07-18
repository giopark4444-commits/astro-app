# Carta maestro-detalle — técnico a la izquierda, interpretación a la derecha

**Fecha:** 2026-07-17 · **Rama:** `carta-detalle` (desde `195d434`, línea `diseno-2col`)
**Aprobado por:** Gio (conversación 2026-07-17)

## Problema

1. En desktop, la columna derecha de Carta mezcla tablas técnicas con lecturas; no hay
   separación clara dato→significado.
2. **Modo Pro no hace nada visible en desktop:** tras R4a la lámina `.pro` quedó siempre
   visible (`carta.module.css:238`) y solo dos secciones menores (Distribución, cabecera
   técnica) quedaron detrás de `{pro && …}` — ambas viven en tabs que no son la inicial,
   así que activar el toggle no cambia nada de lo que se está viendo. No es un handler
   roto: el rediseño desktop le vació el propósito.

## Diseño aprobado

Patrón **maestro-detalle** en desktop (≥1080), variante "tabs a la izquierda":

### 1. Columnas
- **Izquierda (todo lo técnico):** rueda + controles + tabs
  `Núcleo / Posiciones / Aspectos / Balance` con su contenido técnico. Todo elemento
  (planeta, aspecto, casa, signo, patrón) es tappable.
- **Derecha (interpretación pura, sticky):** panel nuevo que interpreta lo tocado.
  **Default: el Núcleo tejido** (Sol+Luna+Asc, `composeCoreReading`). Nunca vacío.

### 2. Estado unificado de selección
- Un solo estado `selected`:
  `{kind: 'core'|'body'|'aspect'|'house'|'sign'|'pattern', …payload}`.
- Todo lo interactivo de la izquierda llama `onSelect(...)`; el panel derecho renderiza
  según `kind`. La rueda re-apunta su `onSelect` a este estado (en desktop; en móvil
  sigue abriendo el bottom-sheet).

### 3. Fuentes de interpretación (todo existe ya — no se inventa prosa)
| Selección | Contenido |
|---|---|
| `core` (default) | `composeCoreReading` (Sol+Luna+Asc tejidos) |
| `body` | `composeBodyReading` → essence/flow/shadow + nota de dignidad (`BodyReadingView`) |
| `aspect` | Glosario `aspect.*` + los 2 planetas; Pro añade orbe exacto + aplicativo/separativo |
| `house` | Glosario `house.1–12` |
| `sign` | Glosario `sign.*` |
| `pattern` | Glosario `pattern.*` + cuerpos involucrados |

Punto Ascendente = glosario `point.ascendant` + su signo.

### 4. Modo Pro — un toggle, ambas columnas
- **Izquierda OFF→ON:** tablas pasan de esencial (glifo · signo · grado · casa) a
  revelar dignidades, ℞, velocidad °/día, Distribución numérica y cabecera técnica
  (UT, día juliano, sistema de casas, zodíaco). Efecto inmediato y visible.
- **Derecha OFF→ON:** lectura pasa de esencia breve a essence+flow+shadow+dignidad;
  en aspectos añade orbe exacto y aplicativo/separativo.

### 5. Móvil (<1080) — sin cambio de paradigma
- Tocar sigue abriendo el bottom-sheet, pero con el **mismo renderizador unificado**
  (aspectos y casas ganan interpretación; hoy solo planetas la tienen).
- El toggle Pro sigue revelando la lámina como hoy.

### 6. Estructura de código
- **Nuevo `interpretation-panel.tsx`:** recibe `selected + pro + locale`; renderiza por
  `kind`. Reutiliza `BodyReadingView`, `composeCoreReading`, glosario de `@aluna/core`.
- `carta-view.tsx` (526 líneas) adelgaza: orquesta `selected`; la tab Núcleo se parte
  (técnico ← izquierda; narrativa → panel derecho como default).
- CSS: `deskCols` conserva 55/45; `readCol` pasa a ser el panel de interpretación
  sticky; las tabs y sus tablas se mueven a `wheelCol` (columna izquierda).

### 7. Tests
- Renderizador de interpretación: una prueba por `kind` (contenido correcto).
- Pro alterna profundidad en ambos lados (izq: columnas extra; der: bloques extra).
- Tocar elemento en la izquierda actualiza `selected` y el panel derecho.
- Móvil: bottom-sheet usa el renderizador unificado (aspecto ⇒ muestra glosario).

## Fuera de alcance
- Cambios al móvil más allá del renderizador compartido en el sheet.
- Nueva prosa/contenido de glosario (solo se consume el existente).
- Tocar los archivos sin commitear de la sesión paralela (nav/admin en `diseno-2col`).
