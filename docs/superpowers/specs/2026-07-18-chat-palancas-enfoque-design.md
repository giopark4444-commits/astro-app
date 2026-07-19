# Chat con palancas de enfoque — Aluna aconseja desde las disciplinas activas

**Fecha:** 2026-07-18 · **Rama:** `perfil-detalle`
**Aprobado por:** Gio ("palancas Astros/Números/Pilares/Tarot; el consejo se enfoca en lo activo;
todas ON menos Tarot; Tarot al activarse pide sacar una carta (digital o mazo físico/manual)… sí").

## Diseño

### 1. Las palancas (UI)
Fila de 4 chips-toggle arriba del hilo del chat (en `ChatView`, ambos modos: página `/preguntar`
y panel de Perfil):
- **Astros · Números · Pilares** → ON por defecto (se derivan del perfil, siempre disponibles).
- **Tarot** → OFF por defecto (requiere una carta antes de poder activarse).
- Multi-select. El consejo se enfoca SOLO en las palancas encendidas (ej.: solo Números →
  consejo puramente numerológico; las 3 primeras → cruce astros+números+pilares).
- Al menos una debe quedar encendida (no se pueden apagar las 4).

### 2. Flujo de Tarot (al encender la palanca)
- Aparece un mini-selector: **"Sacar carta"** (una al azar, `drawCards`/RNG) o **"Tengo mi carta"**
  (elegís del mazo de 78 la que sacaste con tu baraja física — reusa el `renderPicker` de
  `manual-entry.tsx`, límite 1).
- Con carta → queda fijada bajo las palancas (nombre + reversa + botón "otra carta"); la palanca
  Tarot pasa a ON. El consejo la incorpora.
- Sin carta, activar Tarot dispara el selector; si se cancela, la palanca vuelve a OFF.
- UNA sola carta (decisión de alcance: consejo puntual, como la carta del día pero de la consulta).

### 3. Enfoque del consejo (backend `/api/chat`)
- El body de `ChatView` gana: `lenses: string[]` (subconjunto de `["astros","numeros","pilares","tarot"]`)
  y `tarotCard?: { id: string; reversed: boolean }`.
- `buildContext` se trocea en bloques independientes por lente; el system prompt incluye SOLO los
  bloques de los lentes activos:
  - `astros` → carta natal (ya existe en buildContext).
  - `numeros` → numerología (ya existe).
  - `pilares` → Ba Zi/Saju vía `computeBaziNatal` (server-side, ya en `/api/bazi`) + esencia de
    `composeBaziReading`.
  - `tarot` → la carta recibida (nombre, derecha/invertida, palabras clave y significado del
    contenido core `TAROT_CARDS_*`).
- El `SYSTEM_INTRO` gana una línea de enfoque construida dinámicamente: *"Aconseja apoyándote
  ÚNICAMENTE en: <disciplinas activas>. No introduzcas las demás."* — y la voz/tono intactos.
- Validación: si `lenses` viene vacío → default a las 3 base (astros/numeros/pilares). `tarot` en
  `lenses` sin `tarotCard` → se ignora el lente tarot (no rompe).
- Sin llave IA: sigue latente (`available:false`) igual que hoy.

### 4. Estructura de código
- `chat-lenses.tsx` (nuevo, client): la fila de palancas + el mini-flujo de tarot (sacar/manual/
  carta fijada). Estado propio; expone al padre `{ lenses, tarotCard }` vía callback/props
  controladas. Reusa `renderPicker` de tarot (extraerlo si está acoplado a `manual-entry` — o
  duplicar el mínimo; decisión del plan).
- `chat-view.tsx`: monta `<ChatLenses>` sobre el hilo; incluye `lenses`+`tarotCard` en el POST.
- `/api/chat/route.ts`: `buildContext` → funciones por bloque; intro de enfoque; parse de
  `lenses`/`tarotCard` del body; import de bazi + tarot content.
- i18n namespace `ask` (o el del chat): `lensAstros`/`lensNumeros`/`lensPilares`/`lensTarot`,
  `tarotDraw`/`tarotManual`/`tarotAnother`, `lensFocusHint`.

### 5. Tests
- Backend: `buildContext` por subconjunto de lentes emite solo esos bloques; tarot sin carta se
  omite; enfoque en el intro. Body parse robusto.
- `ChatLenses`: default 3-ON/tarot-OFF; no se apagan las 4; activar tarot abre el flujo; carta
  fijada → tarot ON.
- ChatView: el POST incluye lenses+tarotCard; `/preguntar` y panel de perfil montan las palancas.

### Fuera de alcance
Tirada de 3 en el chat (solo 1 carta); memoria/proveedor; el ritual táctil completo (el chat usa
draw directo o picker, no la ceremonia); móvil del chat más allá de heredar las palancas.
