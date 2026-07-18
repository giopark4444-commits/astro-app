# Perfil maestro-detalle — todo a la izquierda, chat con Aluna a la derecha

**Fecha:** 2026-07-18 · **Rama:** `perfil-detalle` (desde origin/main `f667a9d`)
**Aprobado por:** Gio ("en el lado derecho dejemos solo una ventana de chat, en la que se podrá
hablar con Aluna sobre cualquier cosa, todo lo demás en el lado izquierdo… dale").

## Diseño

### 1. Columnas (desktop ≥1080; patrón de la serie lentes-detalle)
- **Izquierda (todo lo demás, scrollea):** el Perfil actual completo — `PerfilHero`,
  `LifetimePreview` (Camino de vida), `Personas`, `Manifestations`, `Journal` — re-apilado en
  el carril 11fr. Las grillas internas (`manifGrid`, `diarioGrid`) se conservan dentro del carril.
- **Derecha (SOLO el chat, sticky):** panel "Pregúntale a Aluna" con el chat GENERAL existente
  (`preguntar/chat-view.tsx` → `/api/chat`: carta + numerología + intención + memorias; latente
  sin llave con estado "dormant"). Ventana de mensajes con scroll propio + input abajo, alto
  `calc(100vh - offset)` (receta interpPanel de la serie adaptada a chat).
- **Móvil (<1080):** Perfil EXACTAMENTE como hoy (regresión-cero); el panel no se monta visible.
  El chat móvil sigue en `/preguntar` (y el buscador del Hoy). Sin sheet nuevo (YAGNI — el chat
  ya tiene su página).

### 2. Reuso del chat (cero clon nuevo, cero endpoint nuevo)
- `ChatView` se parametriza mínimamente: prop opcional `embedded?: boolean` (o extraer el cuerpo
  a `ChatBody` si el acoplamiento a `useSearchParams` lo exige — decisión del plan). En modo
  embebido: no lee `?q=` de la URL, layout compacto (title chico o sin title), conserva
  streaming/dormant/error/SpeakButton intactos.
- `/preguntar` sigue funcionando idéntico (misma vista, modo página).
- El 4º clon queda PROHIBIDO: si `ChatView` no se puede parametrizar limpio, se extrae el
  esqueleto compartido — pero NO se copia por cuarta vez.

### 3. Layout técnico
- `perfil/page.tsx` (server component) envuelve en `deskCols` 11fr/9fr (receta serie);
  `interpCol` sticky top 84px; el panel es un client component nuevo delgado
  (`perfil-chat-panel.tsx`) que monta el chat embebido con cabecera `cardH2` "Pregúntale a Aluna".
- El grid 12-col desktop existente del Perfil se re-escopa al carril izquierdo (hero fila
  completa DEL CARRIL, etc.). Móvil: cero cambios de CSS efectivo.
- Sin Modo Pro (Perfil no tiene capa técnica que gatear — misma decisión documentada que tarot §C).
- Sin selección/kinds: el panel es UNA cosa (el chat). No hay router de viewport ni sheet.

### 4. Tests
- ChatView modo página sigue igual (suite existente de preguntar si la hay).
- Modo embebido: monta sin leer `?q=`, streaming mock funciona, dormant sin llave.
- Perfil desktop: panel presente con el chat; móvil: panel none y DOM del perfil intacto.

### Fuera de alcance
Cambios a `/api/chat` o memorias; chat móvil en perfil; tocar `/ajustes`, lifetime/, otros
lentes; Modo Pro.
