# Tarot — Diseño del mundo completo

**Fecha:** 2026-07-17 · **Estado:** aprobado por Gio (brainstorm en vivo)
**Alcance de este spec:** la visión completa del rubro tarot dentro de Aluna y el diseño
detallado de sus tres primeras fases de construcción (T1 motor+contenido, T2 ceremonia,
T3 profundidad). Las fases posteriores (móvil, leer-para-otros, herramientas de lector)
quedan descritas a nivel de dirección, no de diseño.

## 1. Decisiones de producto (tomadas con Gio, 2026-07-17)

- **Dónde vive:** DENTRO de Aluna, como séptimo mundo (`/tarot`, tab propia en TopNav).
  Preocupación explícita de Gio: que no quede como versión limitada — la completitud se
  garantiza en el diseño (mundo entero, ceremonia a pantalla llena), no separándolo.
  El motor vive en `@aluna/core` con límites limpios: extraíble a producto propio si un
  día se quiere spinoff, sin reescribir.
- **Público / visión en tres etapas:** (1) autoconocimiento personal con profundidad
  PROFESIONAL — contenido serio, correspondencias, sin diluir; (2) leer para otros
  (los multi-perfiles de Aluna ya existen); (3) herramienta de lector profesional
  (spreads propios, notas por consultante, exportar). Este spec diseña (1) y deja
  los ganchos de datos para (2) y (3).
- **Arte:** DOS mazos seleccionables desde el día uno a nivel de arquitectura:
  `rws` (Rider-Waite-Smith 1909, dominio público, restaurado y entonado a los temas)
  activo en v1, y `aluna` (mazo propio ilustrado en la estética dorado/índigo)
  **registrado pero desactivado por flag** — solo se activa cuando el arte esté
  terminado y verificado carta por carta. El selector de mazo aparece en ajustes
  únicamente cuando hay >1 mazo activo.
- **Monetización (patrón "carta del día gratis, profundidad Plus"):**
  - Gratis: carta del día, tirada de 3, significados completos de las 78, diario
    con las últimas 7 lecturas.
  - Aluna Plus (gate existente de informes): cruz celta, lectura IA cruzada con el
    cielo, diario ilimitado; leer-para-otros cuando llegue la fase 2.

## 2. Aval y dinámica digital (contexto de la decisión)

El tarot digital está masivamente validado: Labyrinthos/Golden Thread (millones de
usuarios, solo tarot), y las referencias directas de Aluna — Nebula lo integra,
Sanctuary vive de lecturas. La postura mayoritaria de la comunidad moderna es que la
lectura depende de la intención del consultante, no del cartón físico. La mecánica es
trivial (shuffle); lo que separa una app buena de una mala es EL RITUAL: pregunta →
barajado con gesto → corte → elección con agencia del usuario → revelado. Ese ritual
es el corazón de este diseño, y el sistema de animaciones de Aluna (merge 7434640)
existe exactamente para esto.

## 3. Arquitectura

### 3.1 Motor — `packages/core/src/tarot/` (puro, testeable, extraíble)

- `deck.ts` — las 78 cartas como datos: `{ id, arcana: "major"|"minor", suit?: "wands"|"cups"|"swords"|"pentacles", number, nameKey }` + correspondencias
  (astrológica Golden Dawn: planeta o signo; elemento; eco numerológico para el
  puente con el mundo Números). El REGISTRO de mazos: `TAROT_DECKS = [{ id: "rws", enabled: true }, { id: "aluna", enabled: false }]` — la carta es el dato, el mazo
  es solo la piel (assets).
- `shuffle.ts` — Fisher-Yates con fuente inyectable. En producción:
  `crypto.getRandomValues` sembrado además con el timestamp exacto del gesto del
  usuario (el instante de soltar el mazo participa en el orden — la "intención").
  En tests: semilla determinista.
- `reversals.ts` — 50% por carta al repartir; desactivable (ajuste de usuario:
  hay lectores profesionales que no leen invertidas).
- `spreads.ts` — tiradas como plantillas de datos: `{ id, cardCount, positions: [{ key, i18nKey, role }] }`. v1: `daily` (1), `three` (pasado/presente/futuro),
  `celtic-cross` (10, con sus posiciones canónicas). El diseño de datos admite
  spreads custom (fase 3) sin cambiar el motor.
- `daily.ts` — la carta del día es DETERMINISTA por (usuario, fecha local): semilla
  `hash(userId + localDate)` → siempre la misma carta ese día, regenerable sin BD;
  se persiste solo cuando el usuario la revela (para el diario).

### 3.2 Contenido — `apps/web/lib/content/tarot-es.ts` / `tarot-en.ts`

Patrón exacto de `horoscope-es/en.ts` (es.ts motor de composición, en.ts solo dicts,
import runtime solo es→en). Por carta:

- `keywords` (3–5), `essence` (párrafo de esencia, voz Aluna: evolutiva, segunda
  persona, sin fatalismo — calibrar contra los 12 animales y los 12 signos).
- `upright` y `reversed`, cada uno con `love` / `work` / `path`.
- La correspondencia astrológica vive en el motor (dato); el contenido la NARRA
  ("El Emperador lleva el fuego de Aries…") y es el puente del diferenciador:
  la lectura puede cruzar carta ↔ carta natal ("tu Sol está en Aries: esta carta
  te habla directo").
- `composeReadingProse(locale, spread, cards[], question?)` — prosa base SIN IA
  (siempre disponible, como el horóscopo); la capa IA es un escalón encima, no
  un requisito.

Es el grueso de T1: ~78 cartas × 2 idiomas × (esencia + 6 ámbitos) de escritura
artesanal con curaduría. EN con la misma voz, no traducción literal.

### 3.3 Assets

`apps/web/public/tarot/rws/{id}.webp` — 78 imágenes RWS de dominio público,
restauradas (limpieza + entonado suave que respete los 6 temas; las cartas se
muestran sobre `--surface` con marco propio). Nombre de archivo = id de carta.
El mazo `aluna` usará la misma convención en `tarot/aluna/` cuando exista.

### 3.4 Datos — Supabase

Tabla `tarot_readings` (migración nueva):
`id uuid pk · user_id (RLS igual a birth_profiles) · profile_id nullable
(NULL = para mí; en fase 2 apunta al perfil de la persona leída) · spread text ·
question text nullable · cards jsonb [{cardId, reversed, position}] ·
notes text nullable (el usuario anota su lectura) · deck text default 'rws' ·
created_at`. RLS: solo el dueño. El gate de 7 lecturas gratis se aplica en la
API (count por user), no en el cliente.

### 3.5 API — patrón del repo

- `POST /api/tarot/readings` — guarda una lectura (authenticateRoute, validación
  de spread/cards contra el motor, gate Plus para celtic-cross y para >7 guardadas).
- `GET /api/tarot/readings` — el diario (paginado).
- `POST /api/tarot/reading-ai` — lectura IA cruzada (Plus): patrón EXACTO de
  `/api/horoscope-reading` (Hermes default + Claude fallback, latente sin llaves);
  el prompt recibe tirada + pregunta + resumen del cielo natal/día personal, y el
  contenido base de las cartas — nunca inventa significados.
- La carta del día NO necesita API para calcularse (determinista en cliente/SSR);
  solo toca BD al guardarse.

## 4. La ceremonia (UX del mundo `/tarot`)

Séptima tab del TopNav web (móvil llega en su fase). Pantallas:

1. **Umbral** — carta del día arriba (boca abajo, esperándote; tap = ritual corto
   de volteo, ligada al día personal del mundo Hoy) + las tiradas disponibles como
   tarjetas (3 cartas · cruz celta con sello Plus) + acceso al diario.
2. **Pregunta** — opcional, escrita o "en silencio" (botón explícito); se guarda
   con la lectura si se escribió.
3. **Barajado** — el mazo a pantalla llena; MANTENER PRESIONADO baraja (las cartas
   danzan mientras sostienes, el starfield reacciona); al SOLTAR, ese timestamp
   siembra el shuffle. Accesible: alternativa de tap simple ("barajar por mí").
4. **Corte** — el mazo se divide en 3 montones; tocas uno.
5. **Abanico** — las cartas se despliegan en arco boca abajo; ELIGES con tap las
   N de la tirada; cada elegida vuela a su posición en la plantilla (stagger).
6. **Revelado** — volteo 3D una a una (en tu orden), nombre + palabras clave al
   voltear (ignite en el título).
7. **Lectura** — scrolleable: cada posición con su carta, significado del ámbito
   según la posición, prosa compuesta de la tirada completa; si Plus y llaves:
   lectura IA cruzada con el cielo (streaming como el chat). Botón guardar con
   nota propia.

Animaciones sobre los fundamentos existentes (`aluna-ignite`, `reveal`, flip 3D
nuevo local del mundo tarot). `prefers-reduced-motion`: cada paso ofrece su
resultado inmediato (barajar = un tap, sin danza; revelado sin flip).

## 5. Testing

- Motor (core): 78 ids únicos y completos; shuffle con semilla fija = orden
  reproducible; distribución de invertidas; spreads válidos; carta del día
  determinista por (user, fecha) y distinta entre fechas/usuarios.
- Contenido: paridad ES/EN de las 78 × todos los campos (test tipo i18n);
  composeReadingProse menciona la carta y el ámbito de cada posición.
- API: gates (celtic-cross sin Plus → 403; 8ª lectura gratis → gate), RLS.
- UI: RTL con reduced-motion stubeado (patrón use-count-up.test): flujo completo
  hasta lectura, carta del día voltea y persiste.
- **Verificación real en navegador** de la ceremonia entera (gate del proyecto).

## 6. Fases de construcción

- **T1 — Motor + contenido + assets** (sin UI): core tarot completo con tests,
  las 78 × 2 idiomas escritas, RWS restaurado, migración BD. El merge más gordo
  en contenido; nada visible aún.
- **T2 — La ceremonia**: mundo `/tarot` web con umbral, carta del día y tirada
  de 3 (ceremonia completa), diario básico (guardar/ver). Primera versión visible
  — y ya es la experiencia completa, no un recorte.
- **T3 — La profundidad**: cruz celta, lectura IA cruzada, notas en el diario,
  gates Plus finos, selector de mazo (aparece cuando `aluna` se active).
- **T4+ (dirección, se especifican a su tiempo):** móvil espejo (tab en Astros o
  sexta posición — decisión de su fase); leer para otros (profile_id + selector de
  consultante + historial por persona); herramientas de lector (spreads custom,
  exportar, notas por consultante). El mazo `aluna` (78 ilustraciones propias) es
  un proyecto de arte paralelo, no bloquea ninguna fase.

## 7. Riesgos y notas

- **El contenido es el camino crítico** de T1: 78×2 idiomas con calidad profesional
  es mucho texto artesanal; presupuestar revisión de voz contra signos/animales.
- **TopNav a 7 tabs**: verificar que el shell R4a aguanta la séptima en 1080–1280px
  (spike de 10 min en T2 antes de fijar).
- **RWS "restaurado"**: partir de escaneos PD verificados (Pamela Colman Smith,
  1909) — documentar la fuente exacta de los archivos en el commit de assets.
- **jsonb `cards` validado en API contra el motor** (ids/posiciones del spread) —
  nunca confiar el contenido de la lectura al cliente.
- La sesión paralela de Gio trabaja en el mismo repo: T1 vive en `packages/core`
  y `lib/content` — coordinar merges como esta noche (⚠️ vigilar sesiones paralelas).

## 8. Fuera de alcance (explícito, por ahora)

- Compartir lecturas públicamente / exportar (fase pro).
- Push notifications de carta del día (no hay infra de push).
- Lenormand, oráculos u otros sistemas de cartas (el registro de mazos NO los
  contempla: son sistemas distintos, no pieles).
- Editor visual de spreads custom (fase pro; el motor ya lo admite como datos).

## 9. Proceso

Brainstorm en vivo con Gio (2026-07-17): dónde vive (dentro, extraíble), público
(las 3 etapas), arte (2 mazos, flag), monetización (día gratis/profundidad Plus),
enfoque A (vertical por fases) aprobado. Siguiente: `writing-plans` para el plan
TDD de T1 (motor+contenido) → SDD con review por tarea → T2 → T3.
