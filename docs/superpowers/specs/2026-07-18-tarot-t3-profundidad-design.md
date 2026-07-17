# Tarot T3 — Profundidad: lecturas de sesión real, chat IA y modo manual

**Fecha:** 2026-07-18 · **Estado:** aprobado por Gio (feedback en vivo + 1 decisión)
**Origen:** feedback de Gio tras probar T1+T2: (1) "las respuestas están muy secas —
que las descripciones sean más detalladas y puntuales, como las verdaderas sesiones";
(2) "abrir un chat de IA que a partir de los resultados haga preguntas puntuales y
vaya desarrollando junto a la persona"; (3) "dos modos: digital y manual — alguien
con mazo físico baraja y escoge él mismo (las cartas pueden saltar incluso), te dice
qué le dio y tú le das la interpretación".

## Decisiones

- **Modo manual = plantillas + tirada libre** (decisión de Gio): las tiradas de la
  app (daily/three; celta sigue Pronto·Plus) Y "tirada libre" de 1-10 cartas en el
  orden en que salieron, sin posiciones fijas. **Jumpers** (cartas que saltan del
  mazo) se registran aparte en cualquier modo manual — el canon del oficio las lee
  como mensaje enfático; reciben su propio párrafo.
- **El chat es la "IA cruzada" del spec original**: el hilo recibe la tirada + la
  pregunta + el contenido canónico de las cartas + el cielo del usuario (carta natal
  resumida si hay perfil, patrón exacto de /api/chat). Latente sin llaves (como
  Preguntar): sin proveedor responde available:false y la UI muestra el estado
  dormido. Efímero como el chat existente (sin persistencia de hilos en T3).
- **La prosa rica es la base SIN IA** (siempre disponible): el composer v2 usa lo
  que ya está escrito (essence + ámbito + bridge por carta) tejido con la posición
  y la pregunta — no se reescriben las 78, se compone con más profundidad.

## 1. Prosa rica (composer v2, en @aluna/core)

`composeReadingProse` v2 (misma firma pública + param opcional `opts?: {jumpers?}`):
- Apertura: pregunta (si hay) + el "clima" de la tirada (mayorías: palo dominante,
  cuántas invertidas, mayores vs menores — 1 párrafo que orienta).
- POR CARTA (2-3 párrafos, no 1 frase): (a) la escena — essence anclada al rol de
  la posición ("En tu pasado, el Rey de Espadas gobernó…"); (b) el ámbito
  (upright/reversed) desarrollado y conectado con la pregunta si existe; (c) el
  puente astrológico (bridge) como cierre de la carta.
- Jumpers (si vienen): sección propia — "Estas cartas saltaron del mazo: escúchalas
  aparte" + essence+ámbito de cada una en 1-2 párrafos.
- Cierre: relaciones reales de la tirada (mismo palo repetido, oposiciones
  temáticas, la señal de invertidas ya existente) — determinista, sin inventar.
- Tirada libre: posiciones "free-1..n" sin rol — la prosa las presenta como
  "Primera carta / Segunda carta…" y el cierre pesa el conjunto.
- ES motor + dicts EN (patrón intacto). EN con arquitectura propia (lección T1).

## 2. Chat IA de la tirada

- **API** `POST /api/tarot/reading-chat` — clon del patrón `/api/chat` (runtime
  nodejs, authenticateRoute, resolveReadingProvider, latente sin llaves, streaming
  si el chat existente lo hace — espejo exacto). Body: `{locale, spreadId, cards
  [{cardId,reversed,position,jumper?}], question?, messages: ChatMessage[]}`.
- **System prompt** (ES/EN, voz Aluna del SYSTEM_INTRO existente + capa tarotista):
  recibe el contexto completo (tirada con posiciones y jumpers, contenido canónico
  de cada carta — essence/ámbitos/bridge del idioma, resumen del cielo natal si hay
  perfil como en /api/chat). Comportamiento pedido por Gio: **en el primer turno
  abre con 1-2 preguntas puntuales sobre lo que salió** ("¿ese cierre del pasado ya
  lo reconoces en algo concreto?") y desarrolla la lectura CON la persona turno a
  turno; nunca inventa significados fuera del canon entregado; nunca predice
  fatalidades; las invertidas y jumpers pesan en su lectura.
- **UI** (web y móvil): al final de toda lectura (digital o manual), sección
  "Conversa esta tirada" — chat inline con el patrón visual del Preguntar de cada
  plataforma; dormido sin llaves con su nota.

## 3. Modo manual (mazo físico)

- Entrada en el umbral junto a las tiradas: "Con tu mazo físico".
- Flujo: elegir plantilla (three; daily también válido) o **libre** (definir cuántas
  salieron, 1-10) → **selector de cartas**: buscador por nombre + navegación por
  palo/arcanos, por cada carta elegida toggle INVERTIDA; al final "¿saltó alguna
  carta del mazo?" → jumpers (mismo selector, marcadas aparte) → lectura (prosa
  rica v2 con jumpers) → chat → guardar.
- El selector impide duplicados (una carta física solo sale una vez, jumpers
  incluidos) y muestra miniatura al elegir.
- **BD**: migración 0014 — el check de `spread` acepta `'free'`; `cards` jsonb
  admite `{cardId, reversed, position, jumper?: true}` (positions `free-1..n`;
  jumpers con position `jumper-1..n`). Validación server: free = 1-10 cartas +
  hasta 3 jumpers, sin cardId repetido en el conjunto total.
- Diario: las lecturas manuales se listan igual (spread `free` con su etiqueta).

## 4. Móvil

Espejo completo de 1-3: composer v2 llega gratis (core compartido), la API es la
misma, y la UI móvil replica selector manual + chat (patrón visual del chat móvil
existente si lo hay; si no, pantalla de conversación simple con el patrón de
burbujas de la web adaptado a RN).

## 5. Fuera de alcance (sigue pendiente de fases previas)

Cruz celta + gate Plus real, índice único parcial del daily, notas en el diario,
mazo `aluna`. El 403-siempre-free_limit del móvil se corrige de paso en la task de
API (leer el body).

## 6. Testing

Composer v2: por carta 2+ párrafos, jumpers presentes cuando vienen, libre sin
roles, clima de apertura correcto (mayorías calculadas), EN arquitectura propia.
Chat: la route valida shape, sin llaves → available:false (test); el system prompt
contiene el canon de las cartas de la tirada (test de construcción de contexto).
Manual: validación free/jumpers (duplicados, límites); UI con RTL en web (selector
impide duplicados, toggle invertida) y máquina/lógica pura testeada en móvil.
Verificación real en navegador de AMBOS modos + chat dormido, y Expo web del móvil.
