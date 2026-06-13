# Astro App — Diseño de la Fase 1 (El Núcleo)

**Fecha:** 2026-06-12
**Estado:** Aprobado para planificación
**Autor:** Gio + Claude

---

## 1. Visión del producto (contexto general)

App de **astrología, carta astral y numerología** "la más completa posible", bonita y precisa.
Modelo **híbrido**: gratis para el público con lo básico, monetizable más adelante con
suscripción + informes premium. Arranca como herramienta personal (Gio, familia, amigos) y,
si funciona, se vuelve producto.

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
  hoy/semana/mes/año.
- **Fase 3 — Lo viral:** Compatibilidad (sinastría astrológica + numerológica) con barras
  compartibles (amor, sexo, comunicación, confianza, familia…).
- **Fase 4 — Monetización:** suscripción + informes PDF + lecturas profundas con IA (Claude).

Cada fase tendrá su propio documento de diseño. **Este spec cubre solo la Fase 1.**

---

## 2. Alcance de la Fase 1

### Dentro de alcance

1. **Cuentas** (registro/login) con **perfiles múltiples** por cuenta (yo, pareja, familia,
   amigos). Cada perfil guarda sus datos de nacimiento.
2. **Onboarding / captura de datos de nacimiento:** nombre, fecha, hora y lugar de nacimiento,
   con geocodificación (lat/long) y zona horaria histórica correcta.
3. **Motor de astrología (Swiss Ephemeris):** cálculo de posiciones planetarias, signos,
   casas, ascendente/medio cielo y aspectos para una fecha/hora/lugar dados.
4. **Sección Carta Astral:** rueda interactiva + tabla de posiciones + balance de elementos +
   interpretaciones por planeta/casa/aspecto (plantillas propias ES/EN).
5. **Motor de numerología:** camino de vida, destino/expresión, alma, personalidad,
   año personal, números maestros (11, 22, 33).
6. **Sección Numerología:** números clave con sus interpretaciones (plantillas propias ES/EN).
7. **Sistema de 3 temas** (Aurora Suave, Cósmico Vibrante, Observatorio) + modo Auto,
   y control "Estilo de la carta astral" (siempre nocturna / según el tema).
8. **Sección Ajustes:** tema, estilo de carta, idioma, sistema de casas, gestión de perfiles.

### Fuera de alcance (fases posteriores)

- Horóscopo diario, tránsitos y barras de puntuación → Fase 2.
- Compatibilidad / sinastría → Fase 3.
- Pagos, suscripción, informes PDF, lecturas con IA → Fase 4.
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
  lat, long, zona horaria, ¿hora desconocida?.
- `charts` — carta calculada cacheada (FK a birth_profile + sistema de casas + JSON resultado).
- `settings` — preferencias por cuenta: tema, estilo de carta, idioma, sistema de casas.
- **RLS:** cada usuario solo accede a sus propios perfiles, cartas y ajustes.

---

## 5. Flujos principales (Fase 1)

### Alta y primer perfil

1. Usuario se registra (email + contraseña vía Supabase Auth).
2. Onboarding: crea su primer **perfil de nacimiento** (nombre, fecha, hora, lugar).
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
