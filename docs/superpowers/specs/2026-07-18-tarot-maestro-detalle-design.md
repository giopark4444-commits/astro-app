# Tarot maestro-detalle — técnico a la izquierda, interpretación a la derecha

**Fecha:** 2026-07-18 · **Rama:** `lentes-detalle` (Fase 4, la última; post-merge origin/main `1003aec` —
tarot fresco con modo manual, chat y capa de memoria server-side).
**Autorización:** Gio pidió "Tarot completo igual" en la serie. Interpretación fiel: TODO el lente adopta
el patrón donde hay lectura; el RITUAL táctil (sostener/cortar/abanico/voltear, RNG del gesto) queda
INTACTO — no es negociable romper la ceremonia para forzar columnas (obstáculos duros documentados en
la exploración).

## Diseño

### A. Umbral (`tarot-view.tsx`) — maestro-detalle real
- **Izquierda (técnico/tocable):** carta del día (flip 3D intacto) + grid de tiradas + diario.
- **Derecha (interpretación sticky, desktop):** `TarotSelection`:

```
type TarotSelection =
  | { kind: "daily" }                       // default: carta del día (prosa si revelada; invitación si no)
  | { kind: "saved"; reading: SavedReading } // ítem del diario → cartas + prosa de esa lectura
  | { kind: "card"; id: CardId; reversed: boolean } // una carta suelta → essence + camino recto/invertido
```

- Router por viewport (patrón serie): desktop → panel; móvil → los sheets ACTUALES (regresión-cero;
  los dos BottomSheet existentes se conservan como marco móvil) + `useSheetAutoClose`.
- El diario en desktop escribe al panel (adiós sheet ahí); las cartas dentro de una lectura del panel
  son tocables → kind `card` (con "volver a la lectura").

### B. Paso "reading" de la ceremonia y del modo manual — split de layout (sin estado)
- SOLO cuando `step === "reading"` y ≥1080: clase nueva `.readingPane` (NO tocar `.stepPane`
  compartida): cartas a la izquierda (grid 3-across se conserva dentro del carril), prosa +
  `ReadingChat` + guardar/volver a la derecha sticky. Mismo tratamiento espejo en `manual-entry`
  (su paso reading es calco). Los pasos question/shuffle/cut/fan/reveal y el wizard del manual
  NO cambian ni un pixel.
- Sin estado de selección dentro del paso (es UNA lectura; el chat es la interacción). YAGNI.

### C. Modo Pro — decisión explícita: NO existe en tarot
Tarot no tiene capa técnica gateada: su profundidad ES el chat (IA conversacional) y la prosa es de
profundidad única. Inventar un toggle sin contenido que gatear violaría YAGNI y el contrato de la
serie ("Pro profundiza AMBAS columnas" exige tener qué profundizar). Documentado como decisión, no
como omisión. Si algún día hay "lectura profunda IA" del tarot, el toggle entra con ella.

### D. Chores
- `isMobileViewport`/`useSheetAutoClose` entran a tarot (hoy no importa `lib/viewport`).
- Time-to-first-token del chat (fetchMemories en ruta crítica): NO se toca (server-side, fuera de
  alcance de UI) — anotado como observación para la fase de performance.

### Fuera de alcance
Ritual/gestos/RNG; cruz celta; chat en el diario (hoy no existe — no se inventa); ruta del chat;
prosa nueva; móvil más allá del router.

### E. Requisito de Gio (2026-07-18, en vivo): despliegue de cartas CÓMODO
"Asegurate de diagramar bien para que cuando estén todas las cartas desplegadas se pueda escoger de
manera cómoda, sin entorpecer la funcionalidad." Aplica a:
1. **Abanico de la ceremonia (78 cartas, paso fan):** en desktop el abanico debe ofrecer blancos de
   toque cómodos — revisar solapamiento/tamaño a ≥1080 y dar hover/focus feedback claro de qué carta
   se va a elegir; SIN cambiar la mecánica (tocar 3, índices, RNG ya sellado).
2. **Picker del modo manual (grid de 78):** grid con blancos cómodos, buscador/tabs visibles sin
   scroll excesivo en desktop.
Verificación OBLIGATORIA en el gate: elegir 3 cartas del abanico y 3 del picker en vivo, a 1440px y
en móvil, confirmando que ninguna carta queda imposible o incómoda de tocar.
