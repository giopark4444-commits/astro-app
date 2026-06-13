# Aluna · Plan 4 (Web) · Corte 1 — Cimientos + Numerología

**Fecha:** 2026-06-13
**Estado:** Aprobado para planificación
**Autor:** Gio + Claude
**Contexto:** sub-diseño técnico del cliente web. El producto y la dirección visual ya están
definidos en el spec de Fase 1 (`docs/superpowers/specs/2026-06-12-astro-app-fase1-design.md`)
y en los mockups aprobados (`.superpowers/brainstorm/.../aluna-set-final.html`, `visual-style.html`,
`numerologia-craft-comparativa.html`). Este documento **no los repite**: fija el **cómo técnico**
del primer corte usable de la web.

---

## 1. Objetivo del corte

Un usuario puede **registrarse**, pasar por el **onboarding ceremonial** (datos de nacimiento
reales, geocodificados), y ver su **Numerología completa (Modo Pro)** — todo bonito, en los **3
temas** con modo claro/oscuro, en **ES/EN**. Es la app mínima real: *"entra, crea perfil, ve sus
números"*. Construye los cimientos (auth, temas, navegación, perfiles, ajustes, onboarding) sobre
los que el Corte 2 montará la rueda de carta.

**Criterio de éxito:** registro → onboarding → numerología Modo Pro funcionando end-to-end, en los
3 temas × claro/oscuro, ES/EN, con perfiles múltiples y ajustes persistidos. Sin pagos. La carta
queda como "próximamente" sin romper la estructura final.

---

## 2. Decisiones cerradas en el brainstorm (2026-06-13)

- **Stack de estilos: CSS Modules + CSS custom properties (design tokens).** No Tailwind. Razón:
  el look bespoke de Aluna (glassmorphism, gradientes, serif, cambio de tema por override de vars)
  se controla mejor con CSS crafted, y evita el riesgo "templated". El cambio de tema/modo es un
  swap de `data-attr` en `<html>` que reasigna variables — cero recarga, cero runtime JS de tema.
- **Vara de calidad visual:** la columna "Crafted · Aluna" del mockup comparativo (tema
  Observatorio: noche `#0f1330` + oro `#e7c986`, Cormorant para números, Quicksand para UI, glass +
  starfield + glow, "Tu cálculo" mostrado). Aprobada por Gio.
- **Numerología:** alcance **datos completos / Modo Pro** (todo lo que `computeNumerology` ya
  calcula). La **prosa interpretativa** ("qué significa Camino 11") es del **Plan 6**; aquí va una
  **glosa breve** como placeholder.
- **Geocodificación:** incluida en este corte (el modelo `birth_profiles` exige lat/long/tz).
- **Rueda de carta + ruta de cómputo:** **fuera** de este corte → **Corte 2** (numerología no
  necesita backend). El onboarding ya captura los datos para que el Corte 2 solo renderice.
- **Al maquetar UI, usar los skills de diseño** (frontend-design / impeccable) ANTES de escribir
  cada pantalla — es regla del proyecto (memoria `feedback_aluna_diseno_skills`).

---

## 3. Arquitectura

```
apps/web (Next.js 15 App Router, TS strict)
├── consume @aluna/core      (numerología + dominio de carta; ISOMÓRFICO, corre en cliente)
├── consume @aluna/supabase  (auth + datos; cliente público en navegador, service-role en server)
├── consume @aluna/compute    (SOLO en route handlers; entra en el Corte 2 con la carta)
└── next.config: transpilePackages = [@aluna/core, @aluna/supabase, @aluna/compute]
```

**Principio:** el cliente es "delgado" — captura datos y pinta. La numerología es cálculo puro de
`@aluna/core` ejecutado **en el cliente** (sin backend). Auth y datos van por Supabase. Nada nativo
entra al bundle (regla App Store: `@aluna/ephemeris`/`@aluna/compute` jamás se importan en código
de cliente; solo en route handlers de servidor, y eso es Corte 2).

**Estructura de carpetas (borrador, se afina en el plan):**
```
apps/web/
├── app/
│   ├── (auth)/             # login, signup
│   ├── (app)/              # app autenticada: hub, numerología, ajustes, perfiles
│   │   ├── layout.tsx      # shell: ThemeProvider + nav inferior + avatar Perfil
│   │   ├── hoy/            # hub mínimo
│   │   ├── numerologia/    # sección Numerología (Modo Pro)
│   │   └── ajustes/        # tema/modo/idioma/perfiles
│   ├── onboarding/         # flujo ceremonial paso a paso
│   ├── api/geocode/        # route handler: lugar -> lat/long + IANA tz
│   └── layout.tsx          # root: fuentes, data-attrs de tema iniciales (SSR)
├── components/             # UI en CSS Modules (Card, Tile, Segmented, BottomSheet, Icon, …)
├── lib/
│   ├── supabase/           # browser client, server client, middleware helpers
│   ├── theme/              # tokens.css, ThemeProvider, tipos de tema
│   └── i18n/               # next-intl config + catálogos es/en
└── messages/{es,en}.json
```

---

## 4. Subsistemas

### 4.1 Tema y tokens (lo aprobado)
- `lib/theme/tokens.css`: variables base + bloques `[data-theme="observatory|aurora|cosmic"]` y
  `[data-mode="light|dark"]`. Variables: `--bg`, `--ink`, `--soft`, `--line`, `--acc` (acento),
  superficies glass, radios, sombras, tipografías. El **acento por sección** (`--acc`) se sobre-
  escribe en el contenedor de la sección (oro por defecto; rojo Ba Zi / jade Saju llegan en Fase 5).
- `[data-mode="auto"]` resuelve a claro/oscuro por `prefers-color-scheme` (sin parpadeo: se fija en
  SSR desde la cookie de settings + se corrige en cliente).
- Fuentes **Cormorant Garamond** (números/titulares) + **Quicksand** (UI) self-hosted con `next/font`.
- `ThemeProvider` (client component): lee la preferencia inicial de `settings` (vía SSR), fija
  `data-theme`/`data-mode` en `<html>`, y al cambiarlos persiste en la tabla `settings`. El switch
  es instantáneo (solo reasigna `data-attr`).
- Iconos de **línea** SVG inline (1.4 stroke, `currentColor`) como en los mockups (enso, wheel,
  grid3, sun, pillars, moon, cog). Un componente `<Icon name=…/>`.

### 4.2 Auth (Supabase)
- Email + contraseña con `@supabase/ssr` (sesión por cookies; `middleware.ts` refresca el token).
- Cliente de navegador (anon) para componentes cliente; cliente de servidor (anon, con cookies)
  para Server Components / Route Handlers; **service-role nunca en cliente**.
- El trigger `handle_new_user` (ya en la BD) crea `profiles_user` + `settings` por defecto al
  registrarse → tras signup, el usuario va directo al onboarding.
- Pantallas: `signup`, `login`, recuperación básica de contraseña. Errores claros (no estados a
  medias).

### 4.3 i18n
- `next-intl` (App Router). Catálogos `messages/es.json` + `messages/en.json`. **ES por defecto.**
  Idioma persistido en `settings.language`; conmutable en Ajustes. TODO string de UI sale del
  catálogo (incluidas etiquetas de numerología y nombres de números).

### 4.4 Onboarding ceremonial
- Flujo paso a paso, **una pregunta por pantalla**, cabecera nocturna estrellada + campo claro
  abajo, dots de progreso: **nombre → fecha → hora (+ "hora desconocida") → lugar → género**
  (género obligatorio: femenino/masculino/neutro).
- **Geocodificación** (`api/geocode` route handler): autocompletado de lugar → **lat/long** (vía un
  geocoder gratuito sin llave, p. ej. Open-Meteo Geocoding o Nominatim) + **zona horaria IANA**
  (vía `tz-lookup` u offset del geocoder). Manejo de errores: lista de coincidencias si es ambiguo;
  fallback a **lat/long manual**. *(La precisión histórica fina de tz se valida de verdad cuando el
  Corte 2 calcule la carta; aquí basta resolver una IANA correcta para el lugar.)*
- Al terminar, crea el primer `birth_profiles` (con `time_known=false` si marcó hora desconocida).
- Numerología solo usa **nombre + fecha**; el resto de campos quedan capturados para el Corte 2.

### 4.5 Numerología (corazón del corte)
- Cálculo **client-side** con `computeNumerology({ fullName, birthDate })` de `@aluna/core`.
- **Resumen:** núcleo (Camino de Vida, Expresión, Alma, Personalidad, Día, Madurez) en tarjetas
  tocables, con número grande en serif + etiqueta + glosa breve.
- **Modo Pro (interruptor):** despliega la hoja completa — **"Tu cálculo"** (reducción paso a paso),
  números maestros/deudas señalados, **lecciones kármicas**, **tabla de inclusión/intensidad**,
  **pináculos y desafíos con edades**, ciclos personales (año/mes/día). Todo es dato que el motor ya
  produce.
- **Tap-to-expand:** tocar un número abre una **bottom sheet** con su estructura: *Tu cálculo →
  arquetipo (glosa breve) → [prosa completa: Plan 6]*. Estado de Modo Pro recordado en `settings`.

### 4.6 Transversales
- **Perfiles:** crear/seleccionar/editar/borrar `birth_profiles`; cambiar de perfil recalcula la
  numerología en vivo. Selector en el menú del avatar Perfil.
- **Ajustes:** modo de luz (claro/oscuro/auto), tema (3), idioma; (sistema de casas, zodiaco, estilo
  de lectura se exponen pero su efecto pleno es de cortes/fases con carta). Todo persistido en
  `settings`.
- **Hub "Hoy" (mínimo):** saludo + tarjetas "Tus lentes" (Numerología activa; Carta / Horóscopo /
  Cuatro Pilares como "próximamente"). Sin síntesis de tránsitos (eso es Fase 2).
- **Navegación:** barra inferior fija de 4 mundos (Carta · Números · Hoy/hub · Pilares) — en este
  corte solo **Números** activo; el resto "próximamente" — + **avatar Perfil** arriba que abre menú
  (cambiar persona, Ajustes). Sub-secciones como tabs arriba.
- **PWA:** manifest + iconos instalables ahora; service worker / offline real **diferido**.

---

## 5. Fuera de alcance (este corte)

- **Rueda de carta astral + ruta de cómputo** (`getOrComputeChart` vía route handler) → **Corte 2**.
- Horóscopo / tránsitos (Fase 2), Cuatro Pilares (Fase 5), compatibilidad (Fase 3), pagos (Fase 4).
- **Prosa interpretativa** de numerología (Plan 6) — aquí solo glosa breve.
- Offline avanzado / push / login social.

---

## 6. Testing

- **Render de Numerología:** Vitest + Testing Library — los números núcleo + la reducción ("Tu
  cálculo") + kármicos se pintan correctos para un perfil conocido (la fecha de Gio → Camino 11).
- **Tema:** cambiar `data-theme`/`data-mode` reasigna tokens sin romper layout (los 3 temas × claro/
  oscuro + auto).
- **Onboarding:** lógica de pasos, "hora desconocida", y mapeo de respuestas a un `birth_profiles`
  válido; geocodificación mockeada en tests (sin red).
- **Auth / RLS:** un usuario solo ve sus perfiles/ajustes (ya verificado en backend; aquí, que el
  cliente respete la sesión).
- **Happy-path e2e (opcional, ligero):** registro → onboarding → numerología visible.

---

## 7. Riesgos y notas

- **Geocodificación** es el único subsistema "extra" del corte; si pesa, el fallback de lat/long
  manual mantiene el corte vivo. La precisión histórica de tz se prueba a fondo en el Corte 2.
- **`next/font` + fuentes self-hosted** para que el look (Cormorant/Quicksand) no dependa de red y no
  haya FOUT.
- **Sin parpadeo de tema (FOUC):** fijar `data-theme`/`data-mode` en el HTML del servidor desde la
  cookie de `settings` antes de pintar.
- **Regla App Store:** ningún import de `@aluna/ephemeris`/`@aluna/compute` en código que llegue al
  bundle de cliente (solo route handlers de servidor, Corte 2).
- Al construir cada pantalla, **invocar los skills de diseño** antes de escribir su UI.
