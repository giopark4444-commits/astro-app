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
  La sección Horóscopo incluye además el **horóscopo chino por animal del año** (capa ligera);
  el Ba Zi profundo vive en la sección "Cuatro Pilares Orientales" junto al Saju.
  Nota conceptual: el horóscopo NO es la carta natal — la carta es la foto fija de nacimiento
  (quién eres); el horóscopo es el cielo actual sobre tu carta (qué pasa ahora).
- **Fase 3 — Lo viral:** Compatibilidad (sinastría astrológica + numerológica) con barras
  compartibles (amor, sexo, comunicación, confianza, familia…).
- **Fase 4 — Monetización:** suscripción + informes PDF + lecturas profundas con IA (Claude).
  Aquí entran los **informes largos estilo Gio**: Carta Astral evolutiva completa (planeta por
  planeta, casa por casa) y **Revolución Solar** (lectura del año, cumpleaños a cumpleaños, con
  "temas a trabajar" + mantra personalizado). Ver sección 9 para la voz.
  - **Frontera gratis vs premium (boceto, decisión Gio: que el gratis sea generoso):** el nivel
    **gratis no es mínimo**, da buena extensión — carta + numerología con interpretación de
    **planeta-en-signo Y planeta-en-casa** (núcleo "fluida/no fluida/tips"), balance, y un perfil.
    También el **Modo Pro / lámina técnica es gratis** (es dato calculado; sirve para enganchar a
    los astrólogos y que recomienden la app). **Premium** desbloquea: informes largos evolutivos +
    Revolución Solar, **lecturas con IA**, PDFs, perfiles ilimitados y secciones de fortuna
    avanzadas. Principio: regalar *amplitud y datos*, cobrar *profundidad narrativa e IA*. (Detalle
    fino se cierra en el spec de Fase 4.)
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

### Modelo de temas en Ajustes (decisión Gio, 2026-06-13) — dos ejes

El usuario controla la apariencia con **dos palancas independientes** que se combinan:

1. **Modo de luz (interruptor maestro, global): Claro / Oscuro / Auto.** Cambia **toda la app**
   de un golpe a clara u oscura (Auto sigue el reloj del sistema). Es lo primero y más simple.
2. **Tema / personalidad visual:** Aurora, Cósmico, Observatorio (los 3 ya validados) — define
   tipografías, formas y el carácter de la paleta. Cada tema declara su variante clara y oscura,
   así que respeta el interruptor maestro.

Sobre esto se mantiene la **identidad por sección (acento cultural):** astrología occidental y
numerología siguen el tema/acento elegido; **Ba Zi** usa acento rojo/dorado chino; **Saju**, jade/
verde coreano. Ese acento por sección **convive** con el modo de luz: p. ej. el Ba Zi se ve
rojo-dorado tanto en claro como en oscuro. Resumen: **modo de luz = global; tema = personalidad;
acento = identidad de cada sección.** Todo en `settings`, recordado por usuario.

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

Modelo decidido (ver detalle en sección 8-bis): **barra inferior fija de 4 mundos** — Carta Astral,
Numerología, Horóscopo, Cuatro Pilares Orientales — + **avatar de Perfil arriba** (abre menú con
lo transversal: cambiar de persona, Ajustes, Brújula, Diario, Compatibilidad, etc.). Las
sub-secciones de cada mundo van como tabs/palancas **arriba**, no abajo.

En la **Fase 1** están activos **Carta Astral** y **Numerología**; **Horóscopo** (Fase 2) y
**Cuatro Pilares Orientales** (Fase 5) se muestran como "próximamente" para no romper la estructura
final. **Ajustes vive dentro del menú de Perfil** (no es un mundo de la barra). La síntesis del día
("Hoy") es la pantalla **hub de inicio**, no una pestaña.

### Rueda de la carta (referencia visual ya diseñada)

Aro exterior con los 12 signos, anillo de 12 casas numeradas, planetas ubicados por grado,
líneas de aspectos (duros en rojo/rosa, armónicos en azul/verde). Interactiva: tocar un planeta
abre su interpretación. Tabs Planetas / Casas / Aspectos. Balance de elementos
(fuego/tierra/aire/agua) en barras.

### Lámina técnica / "vista profesional" (decisión clave: la app debe servir a astrólogos)

Posicionamiento estratégico (definido por Gio con sus referencias de Astrodienst): la herramienta
debe ser **útil para quien YA sabe leer una carta**, no solo para principiantes que consumen textos.
El plan de difusión es promocionarla en redes con astrólogos y gente que ya practica. Por eso la
**versión extendida/detallada** de la Carta Astral expone, junto a la rueda, los mismos datos
crudos que un astrólogo profesional usa (estilo Astrodienst), además de las interpretaciones. Son
tres láminas/tablas, todas tocables para abrir profundidad:

1. **Tabla de posiciones:** cada cuerpo (☉→♇ + Quirón, Nodos, Lilith) con **signo, grado, minuto
   y segundo**, casa, movimiento retrógrado, y **dignidad** escrita (domicilio/exilio/exaltación/
   caída). Incluye **AC/DC, MC/IC y las cúspides de las 12 casas** con sus grados exactos.
2. **Cuadro de distribución (modalidad × elemento):** rejilla Cardinal/Fijo/Mutable × Fuego/Tierra/
   Aire/Agua con cada planeta en su celda, más **polaridad** (yin/yang), **hemisferios** (N/S, E/O)
   y **cuadrantes**, y el **planeta/configuración dominante**. Da el temperamento de un vistazo.
3. **Aspectario (rejilla triangular):** matriz que cruza cada planeta con cada otro mostrando el
   **aspecto exacto, el orbe y si es aplicativo/separativo (A/S)**. Es la herramienta central de
   lectura profesional. Configurable: tipos de aspecto activos y orbes (mayores/menores).

Estas láminas viven en el **nivel "Detallado"** (la vista "Resumen" las oculta para no abrumar al
principiante); ver "Resumen ⇄ Detallado" en sección 8. Mismas láminas para todas las cartas
derivadas (Natal, Revolución Solar, etc.), porque comparten motor y rueda.

**Credibilidad ante profesionales (requisito no negociable):** como se promociona con astrólogos
que sí saben leer, la carta extendida no puede tener datos incorrectos ni faltantes — un error
expone a Gio. Por eso: (a) precisión de grado/minuto vía Swiss Ephemeris (efemérides JPL),
zona horaria histórica y casas correctas; (b) la lámina técnica debe estar **completa**: nada de
"casi". Lista mínima de lo que un astrólogo espera encontrar y poder configurar:

- Los **10 planetas + Quirón, Nodo Norte/Sur, Lilith (Luna Negra)**; opción de Parte de la
  Fortuna, Vértex y asteroides principales (Ceres/Palas/Juno/Vesta) en avanzado.
- **Sistema de casas configurable** (Placidus por defecto; Koch, Casas Iguales, Whole Sign,
  Regiomontanus, Porfirio) — los astrólogos discuten por esto, debe poder cambiarse.
- **Posiciones exactas** con retrogradación, velocidad, y **dignidades esenciales**
  (domicilio/exilio/exaltación/caída); declinaciones y **paralelos/contraparalelos** en avanzado.
- **Aspectos configurables:** mayores (☌☍△□⚹) y menores (quincuncio, semisextil, sesquicuadratura,
  semicuadratura, quintil), con **orbes ajustables por aspecto** y aplicativo/separativo.
- **Triple balance** (elemento/modalidad/polaridad), hemisferios, cuadrantes, planeta dominante,
  y **configuraciones/patrones** (stellium, T-cuadrada, gran trígono, yod, cometa…).
- Datos de cabecera verificables: fecha/hora local, **Tiempo Universal, Tiempo Sideral**, lat/long.

Esta lista es la vara para que la herramienta "no haga pasar vergüenza": si un profesional abre la
carta y encuentra todo esto correcto y configurable, la app gana su confianza.

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
| `compute-numerology` (lib server) | Recibe nombre completo + fecha; devuelve la **hoja pitagórica completa** (núcleo + pináculos/desafíos con edades + ciclos personales + tabla de inclusión/intensidad + lecciones y deudas kármicas + planos de expresión + letras de tránsito/esencia), con la reducción paso a paso. Cálculo puro, sin deps. | — |
| `interpretations` (biblioteca de textos) | Mapea cada posición/número a su texto ES/EN. | — |
| `geocode` (servicio/dataset) | Lugar de nacimiento → lat/long + zona horaria histórica. | Dataset ciudades + tz |
| Base de datos | Cuentas, perfiles, cartas cacheadas. | Supabase Postgres + RLS |
| Cliente web | UI, temas, navegación, formularios. | Backend |
| Cliente móvil | Misma UI conceptual en Expo. | Backend |
| **Paquete compartido** `@astro/core` | Tipos TS, esquemas de validación, constantes astrológicas/numerológicas, helpers de render de la rueda. | — |

### Astrología — Swiss Ephemeris

- Estándar de oro en precisión.
- Se ejecuta **en el servidor** para no cargar binarios pesados en el cliente.
- **Tensión a resolver en el plan (precisión vs entorno):** la precisión grado/segundo de calidad
  JPL requiere los **archivos de efemérides** (`.se1`, pesados). La variante que corre sin archivos
  (aproximación **Moshier**) es buena (~arcosegundos) pero no es grado-JPL pleno. Como la
  credibilidad es no negociable, la recomendación es **un servicio de cálculo dedicado** (contenedor
  con Swiss Ephemeris + archivos, p. ej. `sweph` nativo) en vez de depender solo de un Edge
  Function con WASM/Moshier. El Edge sigue valiendo como capa fina que llama a ese servicio y
  cachea. Decisión final (Edge+WASM vs micro-servicio) se cierra en el plan, pero **la precisión
  manda sobre la comodidad de despliegue**.
- **Sistema de casas por defecto: Placidus** (configurable en Ajustes: Placidus, Koch,
  Casas Iguales, Whole Sign, Regiomontano, Porfirio — los astrólogos discuten por esto, debe
  poder cambiarse y recalcular en vivo).
- **Zodiaco:** **tropical** por defecto (estándar occidental) + **sideral** configurable con
  **selector de ayanamsha** (Lahiri por defecto; Fagan-Bradley, Krishnamurti…). El motor (Swiss
  Ephemeris) calcula ambos sin coste extra: es desplazar por el ayanamsha. **Matiz importante (no
  prometer a medias):** ofrecer el *zodiaco* sideral ≠ ofrecer **astrología védica (Jyotish)
  completa**. Un astrólogo védico espera **Nakshatras, Dashas y cartas divisionales (Vargas)** —
  eso es una tradición propia, equivalente en peso al Ba Zi/Saju, y sería **su propio "lente"/fase
  futura**, no Fase 1. En Fase 1: el toggle tropical/sideral aplica a la carta occidental (mismos
  puntos y técnicas, grados desplazados). Así un sideral-occidental (escuela Fagan) queda servido,
  y al védico se le es honesto: "Jyotish completo viene después".
- **Nodo y Lilith configurables:** Nodo **verdadero/medio** (true/mean) y Lilith **media/
  osculatriz** — distinción que un profesional espera poder elegir.
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
  lat, long, zona horaria, ¿hora desconocida?, **género gramatical para la voz del texto
  (femenino / masculino / neutro; obligatorio elegir, neutro disponible)**.
- `charts` — carta calculada cacheada (FK a birth_profile + sistema de casas + JSON resultado).
- `settings` — preferencias por cuenta: tema, estilo de carta, idioma, sistema de casas,
  **estilo de lectura** (por defecto: evolutivo-yóguico), **nivel de detalle** (resumen/detallado).
- `interpretations` — biblioteca de plantillas, indexada por `(tipo, clave, estilo, idioma)`,
  donde `tipo` ∈ {posición-en-signo, posición-en-casa, aspecto, configuración, número} y `clave`
  es la combinación correspondiente (p. ej. `sol·acuario`, `marte□saturno`, `camino-vida·11`).
  **Género y perspectiva (1ª/3ª persona) NO se almacenan como filas aparte**: la plantilla lleva
  variables gramaticales y se resuelven al renderizar (ver "Adaptación obligatoria", sección 9).
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
- **Numerología:** casos con resultados calculados a mano (incluyendo números maestros, **deudas
  kármicas, lecciones kármicas y tabla de inclusión**, no solo el núcleo).
- **Lámina técnica de la carta (credibilidad pro):** aspectario (aspectos y **orbes** correctos,
  aplicativo/separativo), **dignidades**, distribución elemento/modalidad/polaridad y detección de
  **patrones** (stellium, T-cuadrada, yod) contra cartas de referencia conocidas.
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
- La estructura deja "huecos" claros (**Horóscopo**, **Cuatro Pilares Orientales**) en la barra,
  listos para las fases 2 y 5; los transversales (Hoy/hub, Compatibilidad) ya tienen su lugar.
- **Modo Pro de la Carta y de la Numerología** (ambos pilares de Fase 1) muestran su lámina
  técnica completa y correcta, validada contra herramientas de referencia.

---

## 8. Riesgos y notas

- **Precisión de zona horaria histórica** es la parte más delicada de la exactitud; se prioriza
  en testing.
- **Swiss Ephemeris en Edge Function:** confirmar en el plan que el binario/WASM corre en el
  entorno de Supabase Edge; alternativa: micro-servicio aparte si hiciera falta.
- **Biblioteca de interpretaciones (ES/EN)** es mucho texto; en Fase 1 se cubren las posiciones
  esenciales y se amplía luego. La calidad de estos textos define la percepción de la app.
- Mantener `@astro/core` como única fuente de verdad para que web y móvil nunca diverjan.

**Decisiones cerradas (2026-06-13):**
- **Zodiaco:** tropical + sideral con selector de ayanamsha (resuelto, ver sección 4). Jyotish
  completo (Nakshatras/Dashas/Vargas) = lente/fase futura, no Fase 1.
- **Compatibilidad/Sinastría:** vive como **herramienta transversal en el menú de Perfil**
  (entrada principal: elegir persona A + B → sinastría de carta + comparación numerológica +
  barras compartibles), reusando por dentro el "tipo de carta" sinastría/compuesta. No ocupa
  pestaña de la barra fija. (Fase 3.)

**Decisión abierta menor (a cerrar en el plan):**
- **Aspectos a los ángulos (AC/MC):** el aspectario pro debería incluir aspectos a AC/MC además
  de entre planetas; confirmar orbes a ángulos al detallar el motor.

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
  3. **Horóscopo** = la capa "ligera / de fortuna": **occidental por signo** + **chino por animal
     del año**, con palanca; más periodos hoy/semana/mes/año.
  4. **Cuatro Pilares Orientales** = la capa profunda: **Ba Zi (chino) + Saju (coreano)**, con
     palanca. Son el **mismo sistema** (Cuatro Pilares) en dos tradiciones de interpretación.
- **Perfil:** avatar arriba a la derecha que abre un menú (bottom sheet) con lo **complementario
  y transversal**: cambiar de persona, **Compatibilidad** (persona A + B → sinastría + numerología
  comparada, Fase 3), ver cualquier sección por día/semana/mes/año, **preguntar algo específico**
  ("¿cómo va mi amor esta semana?"), Brújula/guía, Diario & Manifestación, Calendario lunar, y
  Ajustes.
- Las **sub-secciones de cada mundo** van como tabs/palancas **arriba** (contextuales), no en la
  barra inferior (que permanece estable).

Nota: **se descartó el Tarot** (venía de un typo "tor"; un tarot digital sin cartas físicas no
convence a Gio). Aclaración clave: el **Ba Zi chino** NO es el horóscopo chino de los animales —
el animal del año es solo una pizca; el Ba Zi son los Cuatro Pilares completos, equivalente a la
carta natal, e idéntico en cálculo al Saju coreano.

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

- **Género:** las referencias están en femenino ("estás llamada"); la app adapta el género
  (masculino/femenino/neutro) según el perfil.
- **Perspectiva (1ª vs 3ª persona):** la carta puede ser la del propio usuario **o la de otra
  persona** (pareja, hija, amigo). El texto debe poder hablar en **segunda persona** ("tu alma
  vino a…") cuando el perfil es "yo", y en **tercera** ("el alma de [Nombre] vino a…", "ella/él
  está llamada/o a…") cuando es otro. Es una dimensión que cruza TODO el corpus: hay que diseñar
  las plantillas con variables de persona/nombre/pronombre desde el día 1, no reescribir luego.
- **Idioma:** todo en ES y EN.
- **Personalización:** los textos deben combinarse según la carta real de cada persona, no ser
  un bloque fijo.

> **Implicación de diseño:** para no multiplicar el corpus a mano por (género × perspectiva ×
> idioma), las plantillas se escriben con **variables gramaticales** (pronombre, terminaciones de
> género, nombre, persona) y un motor de plantillas las resuelve. Se escribe **una** plantilla por
> posición y voz; las variantes se generan, no se redactan a mano.

### Volumen de contenido y alcance interpretativo de Fase 1 (realista)

El corpus completo (planeta-en-signo ~168 + planeta-en-casa ~168 + aspectos ~450 + numerología
~150 ≈ **900+ piezas** en la voz cuidada) es el verdadero trabajo del producto — "la voz es el
producto". Para que Fase 1 sea **usable y honesta** sin esperar a tener 900 textos perfectos, se
prioriza así:

- **Imprescindible Fase 1 (escrito a mano, calidad insignia):** planeta-en-signo (168) +
  planeta-en-casa (168) + núcleo numerológico (~30). Es lo que el usuario ve primero al tocar.
- **Diferible dentro de Fase 1 / a Fase 1.5:** el corpus de **aspectos** (~450) y los kármicos/
  ciclos numerológicos largos. Mientras tanto, el Modo Pro **ya muestra el dato** (el aspecto, su
  orbe, aplicativo/separativo) con una **glosa breve** del significado del aspecto; la prosa larga
  llega después. Así el profesional tiene su lámina aunque la prosa evolutiva aún no esté completa.
- La **traducción ES↔EN** se gestiona como par desde el inicio (no se escribe el doble a ciegas).

**Método de autoría del corpus (decidido 2026-06-13): borrador IA + edición humana.** Se genera
cada pieza con IA a partir de los datos astrológicos/numerológicos y de esta guía de voz, y luego
**una persona la edita y aprueba** antes de guardarla como **plantilla fija** ES/EN. Matices:
- **No es la IA en vivo de Fase 4.** Aquí la IA es una **herramienta de autoría offline**; el
  usuario final nunca ve texto generado al vuelo en Fase 1 — ve plantillas ya curadas. (La lectura
  IA personalizada por usuario sigue siendo Fase 4.)
- **Control de calidad editorial (porque "la voz es el producto"):** rúbrica de voz + revisión
  humana de cada pieza para que **no suene genérica** y respete el ADN intenso-yóguico. Sin este
  paso, el diferenciador se pierde.
- **Anti-plagio:** las referencias de Gio (Astrodienst) son de terceros; el borrador IA parte de
  la guía de voz y los datos, **no** del texto de referencia. La edición verifica originalidad.

### Mapeo a fases

- **Fase 1:** interpretaciones natales **núcleo** (planeta-en-signo, planeta-en-casa, núcleo
  numerológico) en esta voz y estructura "fluida/no fluida/tips". Plantillas propias con variables
  gramaticales. Aspectos y kármicos: dato en Modo Pro + glosa breve; prosa larga progresiva.
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
- **Interruptor "Detallado" / "Modo Pro":** dos pasos. *Detallado* añade una línea de contexto a
  cada tarjeta/fila; *Modo Pro* (el escalón pleno) despliega la **lámina técnica** del pilar —
  las hojas de trabajo profesionales descritas en la sección 9 ("Modo Pro en los 4 pilares").
  Su estado se recuerda por usuario (preferencia en `settings`), global y ajustable por sección.
- **Tap-to-expand (deep dive):** tocar cualquier elemento (un número, un planeta, un pilar,
  un aspecto) abre una **hoja inferior** con su lectura profunda completa, estructurada:
  *Tu cálculo* (cómo se derivó con los datos del usuario) → *El arquetipo* → *Energía fluida*
  → *Energía no fluida* → *Tu práctica* (en la voz intensa).

Esto reconcilia "la más completa" con "no abrumar": el principiante ve un resumen; quien quiere
todo, toca y profundiza sin límite.

### Modo Pro: nivel de profundidad profesional en los 4 pilares (decisión central de Gio)

El "Modo Pro" es el nombre y la ambición del nivel **Detallado**: un único interruptor global (y
por sección) que, al activarse, despliega en **cada uno de los 4 pilares** la **hoja de trabajo
técnica** que usa un practicante *de esa tradición concreta*. La meta declarada por Gio: que un
experto lo active y diga **"dios… esto es todo lo que necesitaba"**. No es genérico — cada pilar
expone los datos crudos y configurables que su disciplina exige, con la misma exactitud que las
herramientas de referencia del gremio (Astrodienst para astrología, etc.). El requisito de
credibilidad de la sección 3 ("no negociable: nada incorrecto ni faltante") aplica a los CUATRO.

**1. Carta Astral — lámina técnica occidental** (detallada en sección 3 "Lámina técnica"):
posiciones con grado/min/seg + dignidades + casas/cúspides; cuadro modalidad×elemento + polaridad/
hemisferios/cuadrantes/dominante; aspectario triangular con orbes y aplicativo/separativo; casas y
orbes configurables; patrones (stellium, T-cuadrada, yod…); 14+ puntos (10 planetas + Quirón,
Nodos, Lilith, MC/IC, +Fortuna/Vértex/asteroides en avanzado). Vale para todas las cartas derivadas.

**2. Numerología — hoja de cálculo pitagórica completa.** Un numerólogo serio espera ver no solo
los números, sino **cómo se calculan** y la malla completa:
- **Núcleo:** Camino de Vida, Destino/Expresión, Alma/Anhelo, Personalidad, Día de nacimiento —
  con la **reducción mostrada** (la suma paso a paso, no solo el resultado).
- **Números maestros 11/22/33** (y 44) y **deudas kármicas 13/14/16/19** señaladas donde aparezcan.
- **Lecciones kármicas** (números ausentes en el nombre) + **tabla de intensidad/inclusión**
  (cuántas veces aparece cada número) + **pasión oculta** + **yo subconsciente**.
- **Cuadrícula del nombre** (letra→número pitagórico), **piedra angular/clave** (primera/última
  letra), **primera vocal**, **planos de expresión** (físico/mental/emocional/intuitivo).
- **Ciclos:** Pináculos y Desafíos **con sus edades exactas**, Ciclos de vida, Año/Mes/Día
  personal, **letras de tránsito y esencia**, Madurez, Equilibrio, números puente.

**3. Horóscopo (Fase 2) — hoja de tránsitos.** En Modo Pro, más allá del texto del día: **tabla
de tránsitos** (planetas actuales y sus aspectos a la natal, con **orbe y fecha exacta** en que
perfeccionan), lunaciones/eclipses, retrógrados e ingresos, progresiones secundarias del periodo;
en la capa china, **pilar del año/mes/día** (tronco+rama) y elemento regente, no solo el animal.

**4. Cuatro Pilares Orientales (Fase 5) — láminas Ba Zi y Saju.**
- **Ba Zi:** los Cuatro Pilares (año/mes/día/hora) con tronco 干 + rama 支, **troncos ocultos**
  藏干, **Diez Dioses** 十神 por posición, Na Yin 納音, **fuerza del Maestro del Día** 身強/身弱 +
  elementos favorables/desfavorables 喜用神/忌神, balance 五行, **Pilares de Suerte** 大運 y
  **años de flujo** 流年 con edades, 12 etapas 十二長生, combinaciones/choques/castigos 刑沖合害,
  vacíos 空亡 y estrellas simbólicas 神煞.
- **Saju:** las Cuatro Columnas con 천간/지지, 지장간, 십신, 신강·신약 + 용신, balance 오행,
  distribución de Diez Dioses, ciclos 대운/세운, 신살; en tradición interpretativa coreana.

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
