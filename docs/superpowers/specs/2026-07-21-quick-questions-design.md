# Accesos rápidos de preguntas — 2 páginas de 6, editables y sincronizadas

**Fecha:** 2026-07-21 · **Rama:** `quick-questions` (desde origin/main `d2362e3`)
**Aprobado por:** Gio (2 páginas de 6 preguntas; tocar→enviar; editables inline con lápiz;
sincronizadas en la cuenta; defaults investigados).

## Diseño

### 1. Qué es
En el chat de Aluna (componente `ChatView`, que vive en `/preguntar`, el panel de Perfil y el
panel de Hoy) aparece un carrusel de **2 páginas de 6 chips** cada una con preguntas frecuentes.
Tocás un chip → se envía esa pregunta directo. Navegás entre página 1 y 2 con controles (flechas/
puntos). Un lápiz activa la edición inline de la página visible. Todo sincronizado en la cuenta.

### 2. Las 12 preguntas por defecto
**Página 1** (generales, reflexivas):
1. ¿Cómo está mi energía hoy?
2. ¿En qué me conviene enfocarme?
3. ¿Qué necesito soltar?
4. ¿Cómo están mis vínculos ahora?
5. ¿Qué me está pidiendo mi carta?
6. ¿Qué lección me trae este momento?

**Página 2** (temas más consultados del mundo — amor/dinero/propósito/día/soltar/autoconocimiento —
en voz evolutiva de Aluna):
1. ¿Qué necesito entender sobre mis vínculos ahora?
2. ¿Qué me está frenando con el dinero?
3. ¿Hacia dónde me llama mi propósito?
4. ¿Qué energía trae mi día hoy?
5. ¿Qué necesito soltar para crecer?
6. ¿Qué me revela mi carta sobre quién soy?

Los defaults tienen versión EN paralela (12 en inglés) — se sirven según el `locale`.

### 3. Persistencia (sincronizada en la cuenta)
- Nueva migración `0021_quick_questions.sql`: `alter table public.settings add column if not exists
  quick_questions jsonb;` (por-usuario, junto a theme/intent/etc.).
- Forma en DB: `{ pages: [ [6 strings], [6 strings] ] }` (o `string[12]` plano — decisión del plan;
  jsonb validado en app). `null`/ausente → la app usa los DEFAULTS del locale.
- Server action `saveQuickQuestions(pages)` (patrón de `actions.ts` con el shim de builder por el
  bug de exactOptionalPropertyTypes). Validación: exactamente 2 páginas × 6, cada string recortado a
  un máximo razonable (p.ej. 120 chars), no vacío (vacío → cae al default de esa posición).
- Lectura: el server (page/layout que monta el chat, o un fetch) trae `quick_questions` del settings
  del usuario y lo pasa a `ChatView`; si null → defaults.

### 4. UI (dentro de ChatView, arriba del composer)
- Fila de 6 chips (la página activa) + control de paginación (‹ 1/2 › o dos puntos) + botón lápiz.
- **Tocar chip (modo normal):** envía esa pregunta — reusa el `send()` existente (setInput(texto)
  + send, o un `sendText(texto)` extraído). No abre edición.
- **Lápiz → modo edición:** los 6 chips de la página visible se vuelven `<input>` con su texto; se
  puede pasar a la otra página y editar sus 6 también; botones "Guardar" (persiste las 2 páginas) y
  "Restaurar por defecto" (vuelve a los 12 del locale). Cancelar descarta.
- Responsivo: en panel angosto (Perfil/Hoy ~550px) los 6 chips hacen wrap a 2-3 filas; en /preguntar
  (ancho) 1-2 filas. Los controles de página + lápiz en una fila compacta.
- Estado dormido/sin llave: los chips igual se muestran (enviar cae al estado dormant como cualquier
  pregunta) — no se ocultan.
- a11y: chips son `<button>`; paginación con aria; inputs con label; foco visible.

### 5. Estructura de código
- `@aluna/core` o `lib`: `DEFAULT_QUICK_QUESTIONS_ES`/`_EN` (2×6) + `parseQuickQuestions(raw, locale)`
  (valida/normaliza a 2×6, rellena huecos con defaults) — puro, testeable.
- `apps/web/app/(app)/preguntar/quick-questions.tsx` (nuevo, client): el carrusel + edición inline;
  props `{ value: string[][], onSend: (q:string)=>void, onSave: (pages:string[][])=>void }` —
  controlado o con su propio estado + callback de guardado.
- `chat-view.tsx`: monta `<QuickQuestions>` sobre el composer; extrae `sendText(text)` de `send()`
  para reusar; recibe las preguntas iniciales por prop (del server) o las pide.
- `actions.ts`: `saveQuickQuestions` server action.
- `lib/settings.ts` (o donde se lea el settings): incluir `quick_questions` en el select.
- i18n: labels de UI (editar/guardar/restaurar/cancelar/página) — los textos de las preguntas NO
  son i18n keys (son datos del usuario / defaults por locale).

### 6. Tests
- `parseQuickQuestions`: null→defaults; 2×6 válido pasa; formas raras (1 página, 7 items, vacíos)
  se normalizan a 2×6 rellenando con defaults; recorte de largo.
- `QuickQuestions`: 6 chips de la página activa; paginar cambia a los otros 6; tocar chip llama
  onSend con el texto; lápiz → inputs; guardar → onSave con 2×6; restaurar → defaults.
- ChatView: monta las quick questions; tocar un chip dispara el envío (mock, el body del POST lleva
  el texto). Server action valida 2×6.

### Fuera de alcance
Reordenar preguntas (drag); más de 2 páginas; por-perfil (es por-usuario, como el resto de settings);
compartir sets entre usuarios.
