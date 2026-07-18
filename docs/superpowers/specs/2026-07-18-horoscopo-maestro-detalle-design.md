# Horóscopo maestro-detalle — técnico a la izquierda, interpretación a la derecha

**Fecha:** 2026-07-18 · **Rama:** `lentes-detalle` (Fase 3; Pilares y Números READY TO MERGE)
**Autorización:** serie delegada por Gio ("misma lógica"); sin decisiones nuevas de producto.

## Estado actual (el más enredado de los lentes)

- `horoscopo-view.tsx` (509 líneas): DOS ramas casi duplicadas (occidental ~250 líneas / oriental
  ~250) en un solo componente. Ya hay 2 columnas PERO con semántica "controles|contenido":
  `.side` sticky = picker signo/animal + AreaBars; `.mainCol` = TODO mezclado (cielo/pilares
  técnicos → prosa → hits → toggle Pro → tablas técnicas).
- DOS sistemas de profundidad independientes: `pro` boolean (tablas) y `Tier` de
  `HoroscopeReading` (esencia/profunda/completa vía `/api/horoscope-reading`).
- `<Meaning>` en 18+ sitios (mini-sheet propio, sin router).

## Diseño (patrón de la serie)

### 1. Partir el monolito (necesidad técnica, no refactor gratuito)
`western-view.tsx` y `eastern-view.tsx` extraídos de la rama duplicada correspondiente;
`horoscopo-view.tsx` queda como orquestador (tab occidental/oriental + estados compartidos).
Cada vista extraída recibe props explícitas (periodo, pro, onSelect, datos).

### 2. Columnas (desktop ≥1080) — re-split semántico
- **Izquierda (técnico, scrollea):** picker de signo/animal + selector de periodo + AreaBars
  (cada barra tocable) + cielo técnico (`EasternSky`/`SkyEvents`) + tablas Pro (posiciones /
  interacciones / armonías / cambio de mes). El picker y el periodo son CONTROLES y quedan
  arriba de la columna (como controlsGlobal de pilares).
- **Derecha (interpretación sticky):** default = **la lectura del periodo** (prosa compuesta;
  con Pro, `HoroscopeReading` completo con tiers — LA UNIFICACIÓN de los dos sistemas: `pro`
  gobierna si el panel muestra esencia compuesta o el lector con tiers, igual que la serie).
  Al tocar: la interpretación de lo tocado.
- **Móvil:** apilado actual intacto; tocar abre el sheet unificado (router por viewport).

### 3. Selección — `HoroscopoSelection` (`horoscopo/selection.ts`)

```
type HoroscopoSelection =
  | { kind: "reading" }                                   // default: prosa del periodo (tab activa)
  | { kind: "area"; area: string; drivers: DriverInfo[] } // barra de energía + sus drivers
  | { kind: "term"; key: string }                         // glosario passthrough: signo, planeta,
                                                          //  casa, aspecto, bazi.* (animal/tronco/
                                                          //  rama/interacción) — cubre el resto
```

(3 kinds — YAGNI: las filas técnicas de posiciones/interacciones/hits seleccionan el término de
glosario de su símbolo principal, como en pilares; `area` lleva payload porque su cabecera
necesita los drivers.)

### 4. Renderizador — `HoroscopoInterpretation`
- `reading`: sin Pro → párrafos de `composeWesternProse`/`composeEasternProse` (según tab) +
  `interpHint`; con Pro → `<HoroscopeReading>` completo (tiers IA) — componente existente.
- `area`: cabecera (nombre del área + nivel) + drivers (glifo planeta/casa u origen oriental)
  con sus entradas de glosario breves.
- `term`: `glossaryEntry(key, locale)` title+glyph+body (patrón pilares).
- Sheet móvil: mismo renderizador; título por kind.

### 5. Pro — contrato de la serie
- Izquierda OFF→ON: tablas técnicas (hoy ya `{pro &&}`) — sin cambio de fondo.
- Derecha OFF→ON: prosa compuesta ↔ HoroscopeReading tiers (efecto inmediato en aterrizaje,
  test dedicado).
- Reset de selección: `[active, sign/animal elegido, periodo, tab]` (cambiar cualquier contexto
  vuelve al reading — spec §2 de la serie).

### 6. Chores de fase (deuda re-agendada de Fases 1-2 — OBLIGATORIOS)
- `lib/viewport.ts`: hook `useSheetAutoClose(open, onClose)` — cierra el sheet si el viewport
  cruza a desktop (listener matchMedia). Adoptarlo en los sheets de carta, pilares, numeros y
  horoscopo (4 diffs quirúrgicos).
- Endurecer el flaky `eastern-view.test.tsx` ("abre el glosario"): waitFor/timeout robusto bajo
  carga de suite completa.
- Gate visual: checklist serie completo + recaptura Pro ON desktop (deuda de N4).

### 7. Fuera de alcance
Tarot (Fase 4); prosa nueva; móvil más allá del sheet; rediseño del picker.
