# Pilares maestro-detalle — técnico a la izquierda, interpretación a la derecha

**Fecha:** 2026-07-17 · **Rama:** `lentes-detalle` (desde `origin/main` `6350a3a`)
**Aprobado por:** Gio (enfoque A, conversación 2026-07-17)
**Serie:** Fase 1 de 4 — replicar el patrón maestro-detalle de `/carta` en los demás lentes.
Orden acordado: **Pilares → Números → Horóscopo → Tarot** (cada fase con su propio spec+plan;
⚠️ Tarot al final y coordinando con la sesión paralela `tarot-t4`).

## Contexto

`/carta` estrenó el patrón (spec `2026-07-17-carta-maestro-detalle-design.md`, rama `carta-detalle`):
izquierda = todo lo técnico tocable; derecha = panel sticky de interpretación pura con estado
`Selection` discriminado + renderizador único compartido con el bottom-sheet móvil; Modo Pro
profundiza AMBAS columnas **con efecto inmediato en el estado de aterrizaje** (lección post-entrega).
Gio quiere "eso tal cual" en Pilares.

`/pilares` hoy: 2 columnas con el MISMO esqueleto CSS (`deskCols` 8fr/12fr, sticky, `data-pro`)
pero semántica "técnico compacto | técnico denso": izquierda = grilla de 4 pilares; derecha =
balance de elementos + tabs verticales + `ProLamina` (8 secciones técnicas). La prosa nueva
("Lectura de tus pilares", `composeBaziReading` de `@aluna/core` + tiers Esencia/Profunda/Completa
vía `/api/bazi-reading`) quedó insertada en esa misma columna derecha, mezclada con lo técnico.
En desktop el toggle Pro desaparece (todo visible siempre).

## Diseño aprobado (enfoque A — re-split completo)

### 1. Columnas (desktop ≥1080)
- **Izquierda (todo lo técnico, scrollea):** grilla de 4 pilares arriba + tabs con la lámina
  técnica completa (Na Yin, fuerza del Día-Maestro, favorables, 大運/流年, 12 etapas,
  interacciones, estrellas) + balance de elementos. Todo elemento significativo es **tocable**.
- **Derecha (interpretación pura, sticky):** panel nuevo que arranca con la **Lectura de tus
  pilares** (`composeBaziReading` + tiers) y cambia a la interpretación de lo que toques.
  Nunca vacío. La rueda→acá es la grilla de pilares: no se mueve de columna, solo se re-reparte
  el resto.
- Móvil (<1080): sin cambio de paradigma — tocar abre el bottom-sheet con el MISMO renderizador;
  la lámina sigue detrás del toggle Pro como hoy (`data-pro`).

### 2. Estado unificado de selección (espejo de carta)
`selection.ts` propio de pilares:

```
type PilarSelection =
  | { kind: "reading" }                                  // default: lectura tejida
  | { kind: "pillar"; which: "year"|"month"|"day"|"hour" }  // un pilar completo
  | { kind: "stem" | "branch"; key: string; pillar: which } // tronco / rama sueltos
  | { kind: "god"; key: string }                          // Diez Dioses
  | { kind: "element"; key: string }                      // madera/fuego/tierra/metal/agua
  | { kind: "decade"; index: number }                     // 大運 (pilar de suerte)
  | { kind: "term"; glossaryKey: string }                 // resto de la lámina (Na Yin, etapa,
                                                          //  interacción, estrella…) → glosario
```

Router `select()` idéntico a carta (`isMobileViewport()` → sheet | panel). Reset al cambiar de
perfil o de opciones (lección de carta: el panel no puede sostener datos viejos).

### 3. Fuentes de interpretación (existe todo — no se escribe prosa nueva)
| Selección | Contenido |
|---|---|
| `reading` (default) | `composeBaziReading` esencia + `BaziReadingView` con tiers (ya construido) |
| `pillar` | Composición de sus partes: entrada de glosario del tronco + de la rama + del dios de ese pilar, con cabecera técnica (hanzi/hangul, elemento, dios) |
| `stem`/`branch`/`god`/`element` | Entrada de glosario `bazi.*`/`element.*` correspondiente (las mismas que hoy abren los `<Meaning>`) |
| `decade` | Glosario del tronco+rama de esa década + rango de años (dato técnico) |
| `term` | Entrada de glosario por clave (passthrough) |

Los `<Meaning>` de las celdas de la lámina/pilares se REEMPLAZAN por selección (como en las
tablas de carta); `Meaning` sigue para términos sueltos fuera de las zonas seleccionables.

### 4. Modo Pro — vuelve a desktop, mismo contrato que carta
- El toggle reaparece en desktop (hoy `display:none` ≥1080).
- **Izquierda OFF:** esencial — pilares (tronco+rama+glifos), dios principal, balance, Na Yin.
  **ON:** lámina completa (12 etapas, interacciones, estrellas, tabla densa de 大運/流年,
  troncos ocultos con pesos).
- **Derecha OFF:** esencia breve de la selección. **ON:** profundidad completa (tiers de la
  lectura; en selecciones de glosario añade la línea técnica: pinyin/hangul, elemento, fase).
- **Efecto inmediato en el aterrizaje** (regla dura, test dedicado): al togglear en el estado
  inicial cambian ambas columnas a la vista (izquierda revela secciones; derecha muestra el
  desglose técnico de los 4 pilares bajo la lectura — análogo a "El núcleo, en datos").

### 5. Estructura de código (espejo de carta, archivos propios de pilares)
- `apps/web/app/(app)/pilares/selection.ts` — tipo + `isMobileViewport` (reusar helper si se
  extrae; si no, duplicación mínima consciente).
- `apps/web/app/(app)/pilares/interpretation-content.tsx` — renderizador por `kind`; reusa
  `BaziReadingView` (bazi-reading.tsx), `composeBaziReading`, glosario `@aluna/core`.
- `pilares-view.tsx` (200 líneas) orquesta: `selected` + `select()` + layout; `pillar-column.tsx`
  y `pro-lamina.tsx` ganan `onSelect` (prop drilling directo, sin contexto).
- CSS: `pilares.module.css` ya tiene `deskCols`/sticky/`data-pro` — se re-reparte (derecha pasa
  a `interpCol` sticky; la lámina y balance se mudan a la izquierda bajo tabs). Proporción pasa
  de 8fr/12fr a **11fr/9fr** (como carta: técnico más ancho que interpretación).
- Tests: renderizador por `kind`, Pro inmediato en aterrizaje, selección→panel, sheet móvil
  unificado, reset de selección al cambiar de perfil.

### 6. Fuera de alcance (fases siguientes)
- Números, Horóscopo, Tarot (specs propios).
- Móvil más allá del sheet unificado.
- Prosa/glosario nuevos; tiers IA para el móvil.
- Tocar `bottom-nav`/`top-nav`/`lib/admin` o carpetas de otros lentes.
