# Astro App — Diseño de la Fase 1 (El Núcleo)

**Fecha:** 2026-06-12
**Estado:** Aprobado para planificación
**Autor:** Gio + Claude

---

## 1. Visión del producto (contexto general)

Plataforma **multi-sistema de autoconocimiento** "la más completa posible", bonita y precisa.
Combina varios "lentes" sobre la misma persona: **astrología occidental** (carta natal),
**numerología**, **astrología china** (animal + Ba Zi / Cuatro Pilares) y **Saju coreano**
(Cuatro Pilares, tradición coreana).
Modelo **híbrido**: gratis para el público con lo básico, monetizable más adelante con
suscripción + informes premium. Arranca como herramienta personal (Gio, familia, amigos) y,
si funciona, se vuelve producto.

**Sinergia técnica clave:** los Cuatro Pilares chinos (Ba Zi) y el Saju coreano comparten el
mismo motor de cálculo (ciclo sexagenario + términos solares), que se deriva de la **posición
solar exacta** que ya calcula Swiss Ephemeris. Por eso NO son motores separados: es **un motor
de efemérides + varias capas de interpretación** (occidental, china, coreana). Ba Zi y Saju son
el mismo cálculo con tradiciones interpretativas distintas.

**Plataformas:** web (Next.js PWA) + móvil (Expo/React Native), compartiendo un backend único.

**Idiomas:** español e inglés desde el inicio (i18n).

### Construcción por fases

La app completa es demasiado grande para un solo spec. Se construye en fases, cada una
usable de verdad:

- **Fase 1 (este documento) — El Núcleo:** cuentas + perfiles múltiples, onboarding con
  datos de nacimiento (Swiss Ephemeris), **Carta Astral** completa, **Numerología** completa,
  los **3 temas** visuales y ajustes. Todo desbloqueado, sin pagos.
- **Fase 2 — Lo que engancha:** pantalla "Hoy" con horóscopo diario / tránsitos reales y las
  barras de puntuación (amor, finanzas, trabajo, salud, bienestar, suerte…) en periodos
  hoy/semana/mes/año. El horóscopo occidental ofrece **dos modos con una palanca**: (1)
  **personalizado por tránsitos** sobre la carta completa del usuario (modo principal,
  recomendado) y (2) **clásico por signo solar** ("Acuario hoy…", vista rápida/compartible).
  Nota conceptual: el horóscopo NO es la carta natal — la carta es la foto fija de nacimiento
  (quién eres); el horóscopo es el cielo actual sobre tu carta (qué pasa ahora).
- **Fase 3 — Lo viral:** Compatibilidad (sinastría astrológica + numerológica) con barras
  compartibles (amor, sexo, comunicación, confianza, familia…).
- **Fase 4 — Monetización:** suscripción + informes PDF + lecturas profundas con IA (Claude).
  Aquí entran los **informes largos estilo Gio**: Carta Astral evolutiva completa (planeta por
  planeta, casa por casa) y **Revolución Solar** (lectura del año, cumpleaños a cumpleaños, con
  "temas a trabajar" + mantra personalizado). Ver sección 9 para la voz.
- **Fase 5 — Sistemas orientales:** **astrología china** (animal + elemento, y **Ba Zi /
  Cuatro Pilares completos**) y **Saju coreano** (Cuatro Pilares, tradición coreana), con
  interpretación a fondo al nivel de la carta occidental. Reusa el motor de efemérides ya
  construido (ver sinergia en sección 1). Cada sistema es su propia sección/"lente".

> Nota: el orden de las Fases 2–5 es flexible y se prioriza según interés; lo único fijo es que
> la Fase 1 (núcleo occidental) va primero porque construye el motor que las demás reusan.

Cada fase tendrá su propio documento de diseño. **Este spec cubre solo la Fase 1.**

---

## 2. Alcance de la Fase 1

### Dentro de alcance

1. **Cuentas** (registro/login) con **perfiles múltiples** por cuenta (yo, pareja, familia,
   amigos). Cada perfil guarda sus datos de nacimiento.
2. **Onboarding / captura de datos de nacimiento:** nombre, fecha, hora y lugar de nacimiento,
   con geocodificación (lat/long) y zona horaria histórica correcta.
3. **Motor de astrología (Swiss Ephemeris):** cálculo de posiciones para una fecha/hora/lugar
   dados de: los 10 planetas (Sol→Plutón), signos, casas, ascendente/medio cielo, aspectos, y
   además **Quirón, Nodo Norte/Sur y Lilith** (los usa el estilo de interpretación de Gio).
   También se marca el estado dignidad/debilidad (domicilio, exilio, exaltación, caída).
4. **Sección Carta Astral:** rueda interactiva + tabla de posiciones + balance de elementos +
   interpretaciones por planeta/casa/aspecto, escritas en la **voz de la casa** (ver sección 9):
   estructura "Energía fluida / Energía no fluida / Tips" (plantillas propias ES/EN). La sección
   incluye un **selector de tipo de carta** (ver "Cartas derivadas" en sección 9): en Fase 1 la
   **Natal**; las revoluciones y técnicas predictivas se suman en fase posterior reusando la
   misma rueda y motor.
5. **Motor de numerología:** camino de vida, destino/expresión, alma, personalidad,
   año personal, números maestros (11, 22, 33).
6. **Sección Numerología:** números clave con sus interpretaciones (plantillas propias ES/EN).
7. **Sistema de 3 temas** (Aurora Suave, Cósmico Vibrante, Observatorio) + modo Auto,
   y control "Estilo de la carta astral" (siempre nocturna / según el tema).
8. **Sección Ajustes:** tema, estilo de carta, **estilo de lectura**, idioma, sistema de casas,
   gestión de perfiles.

### Fuera de alcance (fases posteriores)

- Horóscopo diario, tránsitos y barras de puntuación → Fase 2.
- Compatibilidad / sinastría → Fase 3.
- Pagos, suscripción, informes PDF, lecturas con IA → Fase 4.
- Astrología china (Ba Zi) y Saju coreano (Cuatro Pilares) → Fase 5 (reusan este motor).
- Notificaciones push, login social, modo offline avanzado → según fase.

---

## 3. Decisiones de diseño visual (ya validadas con mockups)

### Temas (intercambiables desde Ajustes)

| Tema | Descripción | Uso |
|------|-------------|-----|
| **Aurora Suave** ☀️ | Claro, pasteles lavanda/durazno, redondeado, vibra wellness. | Tema por defecto. |
| **Cósmico Vibrante** ⚡ | Oscuro, púrpuras neón, glassmorphism, energía compartible. | Opción oscura enérgica. |
| **Observatorio** 🌙 | Nocturno azul profundo + dorado, serif elegante, cielo estrellado. | Opción mística. |
| **Auto** ☀/🌙 | Aurora de día, Observatorio de noche, automático. | Sigue el reloj del sistema. |

Implementación: **tokens de tema** (paleta, tipografías, radios, sombras) en una sola fuente
de verdad compartida; cada tema es un conjunto de tokens. Cambiar el tema reasigna tokens, no
re-maqueta pantallas.

### Estilo de la carta astral

Control aparte en Ajustes con dos modos:
- **🌙 Siempre nocturna (por defecto):** la rueda vive en un "lienzo" nocturno dorado embebido,
  sin importar el tema activo; el texto y elementos alrededor siguen el tema.
- **🎨 Según el tema:** la rueda se viste con el tema activo (clara con Aurora, neón con
  Cósmico, dorada con Observatorio).

### Identidad / marca

- **Logo:** "Luna en Enso" — un círculo zen (enso) abierto con una luna creciente y su estrella,
  de **un solo trazo** y un color.
- **Sistema de iconos:** todos de **línea fina (≈1.5px), un solo color (currentColor del tema),
  mismo viewBox (24), mismo tamaño**, estética mántrica/geometría sacra. Mismo lenguaje que el logo.
- **Menú inferior:** un único color por tema; pestaña activa a opacidad plena, el resto tenue.
  Labels al mismo tamaño, iconos centrados y alineados.

### Onboarding (estilo elegido: Ceremonial)

La captura de datos de nacimiento es **paso a paso** (una pregunta por pantalla), y cada paso
lleva una **cabecera nocturna estrellada** (un "ritual") con el campo abajo en claro — combina la
magia del lienzo nocturno con la claridad de un formulario. Pasos: nombre → fecha → hora → lugar
(con autocompletado + lat/long + zona horaria detectada) → género. Indicador de progreso por
puntos. Si no se conoce la hora, paso para marcar "hora desconocida".

### Navegación

Barra inferior de 5 secciones. En la Fase 1 están activas: **Carta**, **Números**, **Ajustes/Perfil**.
Los slots **Hoy** y **Pareja** se muestran como "próximamente" (placeholders) para no romper la
estructura que tendrá la app completa.

### Rueda de la carta (referencia visual ya diseñada)

Aro exterior con los 12 signos, anillo de 12 casas numeradas, planetas ubicados por grado,
líneas de aspectos (duros en rojo/rosa, armónicos en azul/verde). Interactiva: tocar un planeta
abre su interpretación. Tabs Planetas / Casas / Aspectos. Balance de elementos
(fuego/tierra/aire/agua) en barras.

---

## 4. Arquitectura

### Visión general

```
┌──────────────┐     ┌──────────────┐
│  Web (Next)  │     │ Móvil (Expo) │   ← clientes "delgados", solo UI
└──────┬───────┘     └──────┬───────┘
       │   HTTPS / SDK      │
       └─────────┬──────────┘
                 ▼
        ┌──────────────────┐
        │     Supabase     │
        │ ─ Postgres + RLS │  ← cuentas, perfiles, cartas calculadas (cache)
        │ ─ Auth           │
        │ ─ Edge Function: │  ← Swiss Ephemeris + numerología (cálculo pesado)
        │   "compute-chart"│
        └──────────────────┘
```

**Principio:** toda la lógica de cálculo vive en el backend (una sola implementación,
resultado idéntico en web y móvil). Los clientes solo capturan datos y pintan resultados.

### Componentes y responsabilidades

| Componente | Qué hace | Depende de |
|------------|----------|------------|
| `compute-chart` (Edge Function) | Recibe fecha/hora/lat/long/zona horaria + sistema de casas; devuelve posiciones, casas, aspectos. | Swiss Ephemeris |
| `compute-numerology` (lib server) | Recibe nombre completo + fecha; devuelve números (vida, destino, alma, personalidad, año personal). | — |
| `interpretations` (biblioteca de textos) | Mapea cada posición/número a su texto ES/EN. | — |
| `geocode` (servicio/dataset) | Lugar de nacimiento → lat/long + zona horaria histórica. | Dataset ciudades + tz |
| Base de datos | Cuentas, perfiles, cartas cacheadas. | Supabase Postgres + RLS |
| Cliente web | UI, temas, navegación, formularios. | Backend |
| Cliente móvil | Misma UI conceptual en Expo. | Backend |
| **Paquete compartido** `@astro/core` | Tipos TS, esquemas de validación, constantes astrológicas/numerológicas, helpers de render de la rueda. | — |

### Astrología — Swiss Ephemeris

- Estándar de oro en precisión.
- Se ejecuta **en el servidor** (Edge Function) para no cargar binarios pesados en el cliente.
- **Sistema de casas por defecto: Placidus** (configurable en Ajustes: Placidus, Koch,
  Casas Iguales, Whole Sign).
- El resultado de una carta se **cachea** en la tabla `charts` (clave: datos de nacimiento +
  sistema de casas), porque para datos fijos el resultado nunca cambia.
- **Pensar a futuro (Fase 5):** este mismo motor expondrá la **longitud solar** y la fecha/hora
  precisas que necesitan los **términos solares (節氣/절기)** para calcular los Cuatro Pilares
  (Ba Zi / Saju). Diseñar `compute-chart` de forma que esos datos crudos queden reutilizables,
  no enterrados solo en la lógica occidental.

### Geocodificación y zona horaria

- El lugar de nacimiento debe resolverse a **latitud/longitud** y a la **zona horaria correcta
  para esa fecha** (las reglas de horario de verano y husos han cambiado con los años).
- Enfoque Fase 1: dataset/offline de ciudades + base de datos de zonas horarias histórica
  (tz database). Decisión de librería concreta se cierra en el plan de implementación.

### Numerología

- Cálculo puro (sin dependencias externas): reducción de dígitos, manejo de números maestros
  (11, 22, 33), mapeo de letras→números (sistema pitagórico) para nombre.
- Soporta nombres en ES/EN.

### Modelo de datos (borrador)

- `profiles_user` — cuenta (1:1 con auth.users).
- `birth_profiles` — perfiles de personas (N por cuenta): nombre, fecha, hora, lugar,
  lat, long, zona horaria, ¿hora desconocida?, **género gramatical (fem/masc, obligatorio)**.
- `charts` — carta calculada cacheada (FK a birth_profile + sistema de casas + JSON resultado).
- `settings` — preferencias por cuenta: tema, estilo de carta, idioma, sistema de casas,
  **estilo de lectura** (por defecto: evolutivo-yóguico), **nivel de detalle** (resumen/detallado).
- `interpretations` — biblioteca de textos, indexada por `(posición, estilo, idioma, género)`.
- **RLS:** cada usuario solo accede a sus propios perfiles, cartas y ajustes.

---

## 5. Flujos principales (Fase 1)

### Alta y primer perfil

1. Usuario se registra (email + contraseña vía Supabase Auth).
2. Onboarding: crea su primer **perfil de nacimiento** (nombre, fecha, hora, lugar, género).
3. El lugar se geocodifica (lat/long + zona horaria). Si no sabe la hora, marca "hora
   desconocida" (se calcula carta sin casas/ascendente y se avisa).
4. Backend calcula carta + numerología; se cachea.
5. Usuario aterriza en su **Carta Astral**.

### Ver carta astral

1. Selecciona un perfil (el propio u otro).
2. Se muestra la rueda + tabs (Planetas/Casas/Aspectos) + balance de elementos.
3. Toca un planeta/casa/aspecto → se abre su interpretación (texto de plantilla ES/EN).

### Ver numerología

1. Mismo selector de perfil.
2. Muestra números clave (vida, destino, alma, personalidad, año personal) con interpretación.

### Gestionar perfiles y ajustes

1. Crear/editar/borrar perfiles de nacimiento.
2. Cambiar tema, estilo de carta, idioma, sistema de casas (recalcula cartas afectadas).

### Manejo de errores

- **Geocodificación fallida / lugar ambiguo:** ofrecer lista de coincidencias; permitir
  introducir lat/long manualmente.
- **Hora de nacimiento desconocida:** calcular sin casas ni ascendente; marcar claramente
  qué datos son fiables y cuáles no.
- **Fallo del motor de cálculo:** mensaje claro + reintento; no mostrar carta a medias.
- **Sin conexión (móvil):** mostrar cartas ya cacheadas; bloquear cálculo nuevo con aviso.

---

## 6. Testing

- **Motor de astrología:** casos conocidos contra valores de referencia de Swiss Ephemeris
  (cartas de fechas/lugares con resultados publicados) — tolerancia de minutos de arco.
- **Numerología:** casos con resultados calculados a mano (incluyendo números maestros).
- **Geocodificación + zona horaria:** casos con cambios históricos de huso/horario de verano.
- **RLS:** un usuario no puede leer perfiles/cartas de otro.
- **Render de la rueda:** snapshot de posiciones (planetas en el grado correcto del SVG).
- **Temas:** cambiar tema reasigna tokens sin romper layout (las 3 paletas + Auto).

---

## 7. Criterios de éxito de la Fase 1

- Un usuario puede registrarse, crear varios perfiles y ver, para cada uno, una **carta astral
  precisa** (validada contra Swiss Ephemeris) y su **numerología completa**.
- La carta es **bonita e interactiva** y se ve correcta en los **3 temas** + Auto, con el
  control de estilo de carta funcionando.
- Funciona en **web (PWA)** y en **móvil (Expo)** sobre el **mismo backend**.
- Todo en **español e inglés**.
- La estructura deja "huecos" claros (Hoy, Pareja) listos para las fases 2 y 3.

---

## 8. Riesgos y notas

- **Precisión de zona horaria histórica** es la parte más delicada de la exactitud; se prioriza
  en testing.
- **Swiss Ephemeris en Edge Function:** confirmar en el plan que el binario/WASM corre en el
  entorno de Supabase Edge; alternativa: micro-servicio aparte si hiciera falta.
- **Biblioteca de interpretaciones (ES/EN)** es mucho texto; en Fase 1 se cubren las posiciones
  esenciales y se amplía luego. La calidad de estos textos define la percepción de la app.
- Mantener `@astro/core` como única fuente de verdad para que web y móvil nunca diverjan.

---

## 8-bis. Backlog de funciones dinámicas (candidatas, fases 2+)

Ideas para que la app se sienta viva y se vuelva un hábito diario. Viven en su mayoría en un
**menú desplegable (☰)** o en el hub de Inicio, para no saturar la barra inferior (4 mundos +
Perfil). No son Fase 1; se priorizan al planear las fases siguientes.

- **Brújula / Guía por periodos** (idea de Gio): consejo del día/semana/mes/año derivado de
  tránsitos + Año Personal numerológico; cada uno con su práctica yóguica. **Fase 2.**
- **Mantra y ritual del día:** afirmación + práctica corta (respiración/meditación/intención). Fase 2.
- **Diario & Manifestación** (idea de Gio): notas libres + prompts de journaling personalizados al
  cielo del día; **manifestar en Luna Nueva** y soltar en Luna Llena, con recordatorios. Fase 2/3.
- **Registro de ánimo** cruzado con tránsitos → patrones e insights personales. Fase 3.
- **Calendario lunar / cósmico:** fases lunares + próximos tránsitos importantes. Fase 2.
- **"Pregúntale a tu carta":** oráculo conversacional con IA usando la carta del usuario
  (astrología horaria asistida). **Fase 4** (requiere IA).
- **Notificaciones inteligentes por tránsito** + widget de pantalla de bloqueo. Fase 2.
- **Rachas y logros suaves** (gamificación zen por explorar y escribir en el diario). Fase 3.

Navegación (decisión de Gio, modelo Ⓑ de barra fija):

- **Barra inferior fija = 4 secciones:**
  1. **Carta Astral** (natal + revoluciones + tránsitos, como sub-tabs arriba).
  2. **Numerología** (núcleo, ciclos, kármicos).
  3. **Horóscopo** = Occidental (zodiacal) + Chino, con palanca; más periodos hoy/semana/mes/año.
  4. **Saju · Tarot**, con palanca.
- **Perfil:** avatar arriba a la derecha que abre un menú (bottom sheet) con lo **complementario
  y transversal**: cambiar de persona, ver cualquier sección por día/semana/mes/año, **preguntar
  algo específico** ("¿cómo va mi amor esta semana?"), Brújula/guía, Diario & Manifestación,
  Calendario lunar, y Ajustes.
- Las **sub-secciones de cada mundo** van como tabs/palancas **arriba** (contextuales), no en la
  barra inferior (que permanece estable).

Pendientes de confirmar con Gio: (a) **"Tarot"** como cuarto pilar de la sección 4 (Gio escribió
"tor"; interpretado como Tarot — sería un sistema nuevo además de astrología/numerología/Ba Zi/
Saju); (b) si el **Ba Zi** va en "Horóscopo" (junto al occidental) o junto al Saju (ambos son
cartas de Cuatro Pilares), dejando solo el **animal chino** en Horóscopo.

## 9. Voz y enfoque del contenido (definido con referencias de Gio)

Gio aportó informes de referencia (carta astral + revolución solar hechos con Astrodienst, con
interpretación escrita) que **definen la voz, profundidad y estructura** que la app debe producir.
No se copia ese texto (es de terceros / con derechos); se escribe contenido **original** que
siga este mismo ADN. Imágenes de referencia: `~/Downloads/IMG_7517…7528.jpg` (junio 2026).

### Escuela y tono

- **Astrología evolutiva:** el mapa se lee como guía de crecimiento y **propósito del alma**, no
  como predicción de eventos ("los aprendizajes que el alma eligió experimentar").
- Tono **compasivo, cálido, espiritual y empoderador**; habla de tú al usuario.
- **Registro: voz intensa/espiritual** (decisión de Gio). Se usa lenguaje místico-yóguico pleno
  ("tu alma vino a…", ego vs alma, sánscrito como *santosha*/*svadhyaya*), no la versión
  simplificada. Es la voz de tus referencias, sin diluir.
- **Mezcla yóguica** (sello distintivo): referencias a Yoga Sutras, sánscrito (svadhyaya,
  santosha, aparigraha), meditación y prácticas conscientes en los consejos.
- Enmarca siempre como **autoconocimiento**, no como verdad literal ni consejo médico/financiero.

### Estructura por posición (plantilla base de cada interpretación)

Para cada planeta/punto en signo + casa:

1. **Título** con emoji e identificación (ej. "☀️ Sol en Acuario en casa 11").
2. **Energía fluida:** el don, la luz, el potencial de esa posición.
3. **Energía no fluida:** la sombra, el reto, el riesgo a integrar.
4. **Tips** (cuando aplique): prácticas concretas, a menudo con tinte yóguico/espiritual.

Las **casas** se interpretan agrupando lo que contienen (ej. "🏠 Casa 8: Marte, Saturno y Plutón
en Escorpio") con su propio bloque + Tips.

### Adaptación obligatoria (lo que NO debe copiarse tal cual)

- **Género:** las referencias están en femenino ("estás llamada"); la app debe adaptar el género
  (masculino/femenino/neutro) según el perfil, o usar lenguaje neutro por defecto.
- **Idioma:** todo en ES y EN.
- **Personalización:** los textos deben combinarse según la carta real de cada persona, no ser
  un bloque fijo.

### Mapeo a fases

- **Fase 1:** interpretaciones natales por posición (planeta/casa/aspecto) en esta voz y
  estructura "fluida/no fluida/tips". Plantillas propias.
- **Fase 4:** informes largos generados con IA (Claude) — Carta Astral evolutiva completa y
  **Revolución Solar** (lectura del año con "temas a trabajar" de ~10 puntos + **mantra
  personalizado** de cierre). La IA recibe los datos calculados + esta guía de voz como sistema.

### Puntos del mapa requeridos por esta voz

Además de los 10 planetas: **Quirón** (herida/sanación), **Nodo Norte y Sur** (camino evolutivo
/ karma), **Lilith** (sombra), y **dignidades** (domicilio, exilio, exaltación, caída). El motor
de cálculo (sección 4) ya los incluye.

### Estilos de lectura (seleccionables)

La app soporta **varios estilos de lectura** que el usuario elige (en Ajustes, y/o por informe):

- **Evolutivo-yóguico (insignia, por defecto):** el descrito arriba. Es el único que se escribe
  **completo en la Fase 1**.
- Otros estilos previstos (se añaden después, posiblemente como premium): tradicional,
  psicológico, y directo/moderno (tipo Co-Star).

Implicación: las interpretaciones se guardan **indexadas por `estilo`** (además de idioma y
género), para poder sumar estilos sin rehacer nada. La biblioteca de textos se diseña con esa
clave compuesta desde el día uno.

### Género

Cada perfil **elige género gramatical al crearse (femenino / masculino)** — campo obligatorio.
Las interpretaciones tienen variante por género. (Se podría añadir "neutro" más adelante sin
romper el modelo.) Clave de un texto de interpretación:
`(posición, estilo, idioma, género)`.

### Principio rector: una app para "jugar y explorar"

Decisión central de Gio: la app no es un documento que se lee, es un espacio que se **explora con
el dedo**. Toda pantalla invita a tocar, cambiar y descubrir. Reglas de diseño que se aplican en
TODAS las secciones (presentes y futuras):

- **Todo lo que muestra un dato es tocable** y abre más profundidad (planeta, número, pilar,
  barra, aspecto, casa).
- **Cambios en vivo, sin recargar:** cambiar de persona, de pareja (en compatibilidad), de tema
  o de periodo reconfigura la pantalla al instante con transición suave.
- **Hub de inicio:** la pantalla principal reúne los sistemas (Carta, Numerología, Ba Zi, Saju)
  como tarjetas de entrada + la síntesis del día.
- **Hojas inferiores (bottom sheets)** para las lecturas profundas, en vez de navegar a otra
  pantalla: mantiene al usuario en contexto y anima a seguir explorando.
- **Microinteracciones** (escala al tocar, glow, transiciones) para que se sienta vivo.

### Información progresiva (parte del principio anterior)

Patrón de UX para todas las secciones (carta, numerología, Ba Zi, Saju…):

- **Resumen por defecto:** vista limpia, fácil de leer de un vistazo.
- **Interruptor "Detallado":** añade una línea de contexto a cada tarjeta/fila sin abrir nada.
  Su estado se recuerda por usuario (preferencia en `settings`).
- **Tap-to-expand (deep dive):** tocar cualquier elemento (un número, un planeta, un pilar,
  un aspecto) abre una **hoja inferior** con su lectura profunda completa, estructurada:
  *Tu cálculo* (cómo se derivó con los datos del usuario) → *El arquetipo* → *Energía fluida*
  → *Energía no fluida* → *Tu práctica* (en la voz intensa).

Esto reconcilia "la más completa" con "no abrumar": el principiante ve un resumen; quien quiere
todo, toca y profundiza sin límite.

### Nivel de profundidad (decisión de Gio: máximo detalle)

Cada sistema muestra información **rica y extensa**, no resumida. Referencias de profundidad
objetivo por sistema:

- **Carta natal:** 14+ puntos (10 planetas + Quirón, Nodos, Lilith, MC/IC) con signo, casa,
  grado y dignidad; tabla de aspectos con orbes; triple balance (elementos, modalidades,
  polaridad) + hemisferios; planeta/configuración dominante.
- **Numerología:** núcleo (Camino de Vida, Destino, Alma, Personalidad, Día) + Pináculos por
  etapas + Desafíos + Año/Mes/Día personal + Madurez + Equilibrio + lecciones y deudas kármicas.
- **Ba Zi (Fase 5):** Cuatro Pilares con tronco 干, rama 支, Diez Dioses 十神, troncos ocultos
  藏干, Na Yin 納音, fuerza del Maestro del Día + elementos favorables 喜用神/desfavorables,
  balance 五行, Pilares de Suerte 大運.
- **Saju (Fase 5):** Cuatro Columnas con 천간/지지, 십신, 지장간, 신강·신약 + 용신, balance 오행,
  distribución de Diez Dioses, ciclos 대운; tradición interpretativa coreana.

**Cartas derivadas y técnicas predictivas (la Carta no es solo la natal):**
La sección Carta Astral tiene un **selector de tipo de carta**. Todas usan la misma rueda
interactiva y el mismo motor de efemérides (solo cambia el momento/método de cálculo):

Se incluyen **todas** estas técnicas (decisión de Gio):

- **Natal** — la foto de nacimiento (Fase 1, base de todo).
- **Revolución Solar** — carta del año, recalculada cada cumpleaños (Sol vuelve a su grado natal).
- **Revolución Lunar** — carta del mes (Luna vuelve a su grado natal); corto plazo, más detallada.
- **Retornos planetarios** — Saturno (~29 años), Júpiter (~12), Lunar nodal, etc.: hitos vitales.
- **Progresiones secundarias** — evolución simbólica "un día = un año".
- **Direcciones** — arco solar y primarias.
- **Tránsitos** — el cielo de hoy sobre la natal (base del horóscopo de Fase 2).
- **Sinastría** — superposición de dos cartas (compatibilidad, Fase 3).
- **Carta compuesta** y **Davison** — la "carta de la relación".
- **Carta dracónica** — nivel del alma / propósito profundo.
- **Astrología horaria** — responder una pregunta por el cielo del momento.
- **Carta electiva** — elegir el mejor momento para algo.
- **Relocación / astrocartografía** — cómo cambia tu carta según el lugar del mundo.

Todas usan la misma rueda y el mismo motor de efemérides; lo que cambia es el momento/método de
cálculo. **Fase 1 construye la Natal.** El resto se añade en fases posteriores (las interpretaciones
largas de la Revolución Solar ya están mapeadas a Fase 4); el motor de Fase 1 se diseña para poder
calcular estas cartas derivadas sin rehacerlo. Por su tamaño, las técnicas predictivas/relacionales
probablemente formen su **propia fase** (p. ej. una "Fase 6 — Astrología avanzada").

La consistencia visual es por **identidad cultural**: occidental/numerología siguen el tema
(Aurora/Observatorio); el Ba Zi usa paleta roja/dorada china; el Saju, jade/verde coreana.

### Norte del contenido

La calidad y personalidad de estos textos **es** el producto. La meta es que un informe de la app
se sienta tan rico y humano como las referencias de Gio — esa es la vara de medir.
