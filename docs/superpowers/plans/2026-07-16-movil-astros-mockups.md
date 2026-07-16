# Móvil: Astros (Carta+Horóscopo) + repintado a mockups compactos — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** La app móvil queda con la navegación pedida por Gio (tab "Astros" que hospeda Carta+Horóscopo con switch; barra de 5 tabs) y las pantallas Hoy/Carta/Números/Pilares repintadas "tal cual" los mockups compactos aprobados (Set B).

**Architecture:** Reestructuración de rutas idiomática de expo-router (grupo anidado `app/(tabs)/astros/` con `<Tabs tabBar={() => null}>`; screens movidos verbatim; stubs `<Redirect>` para deep links viejos) + repintado por pantalla usando los mockups HTML como spec visual, con una tarea previa de cimientos (tokens + primitivos) que arregla los gaps sistemáticos de una vez.

**Tech Stack:** Expo SDK 54, expo-router 6, RN StyleSheet con tokens por tema (`theme/tokens.ts`), primitivos en `components/ui.tsx`, i18n plano en `lib/strings.ts`, Supabase Bearer auth contra apps/web.

**Specs (fuentes de verdad, en este orden):**
1. Mockups: `docs/redesign/movil-mockups/screens-compacta/{01-hoy-hub,09-carta,10-numeros,11-pilares}.html` + `docs/redesign/movil-mockups/tokens.css` — el look final.
2. Gap analysis con valores extraídos: `.superpowers/sdd/gap-analysis-astros-mockups.md` (§A tokens, §B por pantalla, §C tab bar, §D horóscopo, §E riesgos).
3. Enfoque de nav elegido (panel Fase 2): `.superpowers/sdd/propuesta-a-astros.md` (rutas anidadas; injerto de B: semántica `href: null` verificada).

## Global Constraints

- **NUNCA** `git checkout` / `git switch` / `git reset` (2 incidentes reales previos). Verifica `git branch --show-current` == `movil-astros-mockups` ANTES y DESPUÉS de commitear. Si no coincide: PARA y reporta BLOCKED.
- Móvil NUNCA importa `@aluna/ephemeris` ni `@aluna/compute` (server-only). Todo dato de efemérides llega por API con Bearer.
- Gate por tarea (móvil): `cd /Users/gio/astro-app/apps/mobile && npx tsc --noEmit && npx expo export --platform ios`; añade `npx vitest run` si tocaste `lib/`. Gate para T3a (web): `cd /Users/gio/astro-app/apps/web && npx tsc --noEmit --project tsconfig.json && npx vitest run && npx next build`.
- i18n: toda string visible pasa por `t()` con clave en AMBOS locales (`lib/strings.ts`, bloques es/en espejo).
- **Regla tipográfica de Gio (dura):** en las pantallas tocadas, SOLO 4 tamaños de texto: **13** (`type.sm`, secundario/eyebrows) · **15** (`type.md`, base) · **19** (`type.lg2`, énfasis/voz/lectura larga — lo crea T1) · **24** (`type.xl2`, títulos de pantalla). Exentos: números-hero/glifos que son el foco gráfico único (score, camino de vida, hanzi, glifos de rueda — 44/60 permitidos ahí). Eyebrows: 13 uppercase con letterSpacing.
- En conflicto entre mockup y pantalla actual, **gana el mockup**. Si el mockup pinta un dato que hoy no existe, usa EXCLUSIVAMENTE el contenido definido en la tarea correspondiente de este plan — no inventes copy.
- Modo Pro (secciones técnicas de carta/números/pilares/horóscopo) **se conserva funcionalmente** — los mockups no lo cubren; solo se realinea su tipografía/colores a los tokens. No rediseñar ni eliminar.
- Orden de tabs final (mockup): **Hoy · Astros · Pilares · Números · Ajustes**.
- `sceneStyle`: `Platform.OS === "web" ? t.bg : "transparent"` (fix del commit `5f8b8e9`) — aplica al Tabs externo Y al interno de astros.
- No tocar `apps/web` salvo T3a (swap Bearer de `/api/scores`).
- El fondo (radial + Starfield) lo pinta `ThemedBackground` en el layout raíz — ninguna pantalla añade fondo propio.

---

### Task 1: Cimientos — tokens, Chip y tab bar

**Files:**
- Modify: `apps/mobile/theme/tokens.ts`
- Modify: `apps/mobile/components/ui.tsx`
- Modify: `apps/mobile/components/TabIcon.tsx`
- Modify: `apps/mobile/app/(tabs)/_layout.tsx` (solo estilos de la barra; la reestructuración de Screens es T2)

**Interfaces:**
- Produces: `type.lg2 = 19` (nuevo paso, NO cambiar valores de claves existentes — pantallas fuera de alcance dependen de ellas); token `accText` en `ThemeTokens` y en los 6 temas (observatory/aurora/cosmic × light/dark) con los hex de la tabla §A del gap analysis (observatory viene de tokens.css; aurora/cosmic derivan igual que sus `acc` actuales — mismo criterio de contraste: en modo claro un dorado/acento OSCURECIDO legible sobre fondo claro).
- Produces: `Chip` con label a `type.md` (15) y `minHeight: 44` (touch target) conservando su API (`kind`, `selected`, `onPress`, `label`) — CONTROLADO como hoy, cero cambios de firma.
- Produces: tab bar estilada según §C del gap: label 13 peso 600, halo del activo radio 19 (el mockup: círculo `background acc opacity .12, inset -7px` sobre icono de 24).

**Steps:**
- [ ] En `tokens.ts`: añadir `lg2: 19` al objeto `type` (queda `sm:13, md:15, lg:17, lg2:19, xl:20, xl2:24…` — `lg`/`xl` viejos NO se tocan). Añadir `accText: string` a la interfaz `ThemeTokens` y su valor en los 6 temas usando la tabla §A del gap file.
- [ ] En `ui.tsx`: `Chip` label a `type.md`, `minHeight: 44`, alineación vertical centrada; verificar visualmente en el gate que no rompa filas de chips existentes (flexWrap ya existe).
- [ ] En `TabIcon.tsx`: halo del estado activo a radio 19 (según §C); mantener `ICONS` intacto (T2 lo edita).
- [ ] En `(tabs)/_layout.tsx`: `tabBarLabelStyle` a `{ fontSize: type.sm, fontFamily: fonts.sansSemiBold ?? fonts.sansMedium, letterSpacing: 0.3 }` y altura/padding según §C. NO tocar la lista de `Tabs.Screen` aún.
- [ ] Gate móvil. Commit: `feat(movil-astros): cimientos — type 19, accText, Chip 15/44, tab bar del mockup`.

### Task 2: Reestructuración de navegación — Astros con switch

**Files:**
- Create: `apps/mobile/app/(tabs)/astros/_layout.tsx`
- Move (git mv, luego ajustar imports `../../` → `../../../`): `apps/mobile/app/(tabs)/carta.tsx` → `apps/mobile/app/(tabs)/astros/carta.tsx`; `apps/mobile/app/(tabs)/horoscopo.tsx` → `apps/mobile/app/(tabs)/astros/horoscopo.tsx`
- Create (stubs): `apps/mobile/app/(tabs)/carta.tsx`, `apps/mobile/app/(tabs)/horoscopo.tsx` (redirects)
- Modify: `apps/mobile/app/(tabs)/_layout.tsx`, `apps/mobile/components/TabIcon.tsx`, `apps/mobile/lib/strings.ts`, `apps/mobile/app/(tabs)/index.tsx`

**Interfaces:**
- Consumes: patrón `Chip kind="control"` (T1), `sceneStyle` web-fix del Global Constraints.
- Produces: rutas `/(tabs)/astros/carta` y `/(tabs)/astros/horoscopo`; tab visible "Astros" (icono wheel); barra final Hoy·Astros·Pilares·Números·Ajustes.

**Steps:**
- [ ] `astros/_layout.tsx`: header propio (paddingTop `insets.top`, eyebrow "ASTROS" 13 uppercase + fila de 2 `Chip kind="control"`: `t("carta.title")` / `t("horoscopo.title")`), vista activa derivada de `usePathname()`, cambio con `router.replace("/(tabs)/astros/carta"|"/(tabs)/astros/horoscopo")`. Debajo `<Tabs tabBar={() => null} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: Platform.OS === "web" ? tk.bg : "transparent" } }}>` con las 2 Screens; `initialRouteName="carta"` (o `<Tabs.Screen name="carta">` primero — verifica el default real de expo-router 6 en el gate).
- [ ] Mover los 2 screens verbatim (solo profundidad de imports). Único edit interno permitido: el `paddingTop` del contentContainer de su ScrollView baja de `insets.top + space.*` a `space.lg` (el header de astros ya consumió el inset). NADA MÁS se edita adentro.
- [ ] Stubs: `app/(tabs)/carta.tsx` = `export default () => <Redirect href="/(tabs)/astros/carta" />;` (ídem horoscopo). En el `_layout` externo, declarar ambos con `options={{ href: null }}` — **verificado contra el código de expo-router 6: omitir el `Tabs.Screen` re-aparece la ruta como tab fantasma; `href: null` la oculta sin desregistrarla**.
- [ ] `_layout.tsx` externo: `Tabs.Screen name="astros"` con `title: t("nav.astros")` e icono `astros`; orden final Hoy·Astros·Pilares·Números·Ajustes (+ los 2 stubs ocultos).
- [ ] `TabIcon.tsx`: añadir `"astros"` al `TabIconName` mapeado al glifo wheel actual de carta; eliminar `IconAries` y su entrada (queda huérfano — verifica con grep que nadie más lo usa antes de borrar).
- [ ] `strings.ts`: añadir `nav.astros` = "Astros" (ES y EN). NO borrar `nav.carta`/`nav.horoscopo` si algún otro sitio los usa — grep primero; si solo los usaba la barra, elimínalos.
- [ ] `index.tsx`: actualizar el/los enlaces del hub que apuntan a `/(tabs)/carta` → `/(tabs)/astros` (grep confirmó que es el único; no hay enlaces a horoscopo).
- [ ] Gate móvil completo. Commit: `feat(movil-astros): tab Astros — Carta+Horóscopo anidados con switch, barra a 5`.

### Task 3a: `/api/scores` acepta Bearer (web, prerequisito de Hoy)

**Files:**
- Modify: `apps/web/app/api/scores/route.ts`
- Test: el/los tests existentes de la ruta si los hay (grep `__tests__` cerca); si no hay, añadir uno mínimo de auth (401 sin token) espejo del de synastry.

**Interfaces:**
- Consumes: `authenticateRoute` de `@/lib/supabase/route-auth` — **plantilla exacta: `apps/web/app/api/synastry/route.ts`** (mismo swap ya hecho y revisado para synastry/chat).
- Produces: `/api/scores` responde 200 con `Authorization: Bearer <token>` válido (sin cookies) y 401/redirect igual que antes sin credenciales. La firma del body/respuesta NO cambia.

**Steps:**
- [ ] Reemplazar `createClient()`+`getUser()` por `authenticateRoute(request)` copiando el patrón de synastry línea a línea (manejo de no-autenticado idéntico).
- [ ] Gate web (tsc + vitest + next build). Commit: `feat(movil-astros): /api/scores acepta Bearer (patrón synastry) para el Hoy móvil`.

### Task 3b: Hoy reconstruida según mockup 01

**Files:**
- Create: `apps/mobile/lib/scores-api.ts`
- Rewrite: `apps/mobile/app/(tabs)/index.tsx`
- Create: `apps/mobile/content/day-voice.ts`
- Modify: `apps/mobile/lib/strings.ts`
- Test: `apps/mobile/lib/__tests__/scores-api.test.ts` (parse/errores, espejo de `synastry-api.test.ts`)

**Interfaces:**
- Consumes: `/api/scores` con Bearer (T3a); `fetchChart(profileId, "transits", token)` existente (`lib/chart-api.ts`); `fetchWesternHoroscope` existente (`lib/horoscope-api.ts`); `moonPhase` + `signOfLongitude` de `@aluna/core` (RN-safe, ya exportados); tokens/Chip de T1.
- Produces: pantalla Hoy = mockup 01 compacta, sección por sección (§B.1 del gap file manda en valores): (1) eyebrow fecha (13) + saludo "Tu clima del alma, {nombre}" (24 serif) + **verso del día** (15 itálica, del mapa `content/day-voice.ts` por signo lunar); (2) mini-card "LUNA EN {SIGNO} ✦ ENERGÍA DE {X}" + chips `Amor {n}` `Trabajo {n}`; (3) "TU ENERGÍA DE HOY": 4 barras (amor/trabajo/salud/suerte — de las 6 áreas del payload, esas 4) con score numérico; (4) card de evento lunar próximo ("Luna nueva {cuándo} · buen día para sembrar intención") tomado de la primera lunación ≥ hoy en `events` de `fetchWesternHoroscope(sign solar, "month")`; (5) "TU UNIVERSO" (Pregúntale/Compatibilidad/Informes — ya existe, se conserva restilada). El contenido numerológico actual (día personal/camino de vida) SALE de Hoy (vive en Números) — así lo manda el mockup.
- Data-flow: 1× `fetchChart(transits)` → longitudes Sol/Luna → `moonPhase()` + `signOfLongitude()` + signo solar; 1× `fetchScores(profileId, "today")`; 1× `fetchWesternHoroscope(signoSolar, "month")` solo para `events`. Cada fetch con guard de unmount + `AbortController` (patrón HoroscopeReading).

`content/day-voice.ts` — contenido EXACTO (clave = signo lunar; el implementador transcribe, no redacta):

```ts
export const DAY_VOICE: Record<string, { es: string; en: string }> = {
  aries:       { es: "El cielo te pide chispa hoy.",      en: "The sky asks you for spark today." },
  taurus:      { es: "El cielo te pide calma hoy.",       en: "The sky asks you for calm today." },
  gemini:      { es: "El cielo te pide palabras hoy.",    en: "The sky asks you for words today." },
  cancer:      { es: "El cielo te pide hogar hoy.",       en: "The sky asks you for home today." },
  leo:         { es: "El cielo te pide corazón hoy.",     en: "The sky asks you for heart today." },
  virgo:       { es: "El cielo te pide raíces hoy.",      en: "The sky asks you for roots today." },
  libra:       { es: "El cielo te pide equilibrio hoy.",  en: "The sky asks you for balance today." },
  scorpio:     { es: "El cielo te pide hondura hoy.",     en: "The sky asks you for depth today." },
  sagittarius: { es: "El cielo te pide horizonte hoy.",   en: "The sky asks you for horizon today." },
  capricorn:   { es: "El cielo te pide paso firme hoy.",  en: "The sky asks you for steady steps today." },
  aquarius:    { es: "El cielo te pide aire nuevo hoy.",  en: "The sky asks you for fresh air today." },
  pisces:      { es: "El cielo te pide marea hoy.",       en: "The sky asks you for tide today." },
};
```

**Steps:**
- [ ] TDD `scores-api.ts`: test primero (shape ok / 401 → error tipado / respuesta malformada → error), implementación espejo de `synastry-api.ts` (`fetchScores(profileId, period, accessToken)`).
- [ ] `content/day-voice.ts` transcrito EXACTO del bloque de arriba.
- [ ] Reconstruir `index.tsx` sección por sección con los valores del §B.1; estados: loading (skeleton suave), error por sección degradada (una barra falla → esa sección muestra nota calma, el resto vive); strings nuevas ES+EN.
- [ ] Gate móvil + vitest. Commit: `feat(movil-astros): Hoy = mockup 01 — clima del alma, energía, evento lunar, universo`.

### Task 4: Carta repintada según mockup 09

**Files:**
- Modify: `apps/mobile/app/(tabs)/astros/carta.tsx` (+ `apps/mobile/lib/strings.ts` si faltan claves)

**Interfaces:**
- Consumes: §B.2 del gap file (valores exactos); tokens T1.
- Produces: Carta visualmente = mockup 09: h1 24 (hoy 44), fuera el patrón eyebrow+Enso (el Enso solo vive en Hoy según mockups), chips de posiciones clave bajo la rueda (`☉ Acuario · Casa 11`, `☽ Escorpio · Casa 8`, `ASC Virgo` — datos ya presentes en el payload), lista "POSICIONES" en filas con glifo+nombre+signo+grado+casa como el mockup, selector Natal|Tránsitos arriba a la derecha del título. Modo Pro intacto funcionalmente, tipografía realineada a la escala de 4.

**Steps:**
- [ ] Aplicar §B.2 sección por sección (orden del mockup manda). Toda medida/color del gap file, no inventadas.
- [ ] Gate móvil. Commit: `feat(movil-astros): Carta = mockup 09`.

### Task 5: Números repintada según mockup 10

**Files:**
- Modify: `apps/mobile/app/(tabs)/numeros.tsx` (+ strings si faltan)

**Interfaces:**
- Consumes: §B.3 del gap file; tokens T1.
- Produces: Números = mockup 10: hero "CAMINO DE VIDA" con número grande (exento de la escala) + apodo + prosa corta, grid de núcleo (Expresión/Alma/Personalidad/Madurez) con número+etiqueta+apodo, strip "Año personal {año}" con verso, CTA "Ver la lectura completa de tus números ›". h1 24. Modo Pro/kármicos intactos, tipografía realineada.

**Steps:**
- [ ] Aplicar §B.3 sección por sección. Gate móvil. Commit: `feat(movil-astros): Números = mockup 10`.

### Task 6: Pilares repintada según mockup 11

**Files:**
- Modify: `apps/mobile/app/(tabs)/pilares.tsx`
- Modify: `apps/mobile/content/bazi.ts` (añadir las 10 líneas del Maestro del Día)
- Modify: `apps/mobile/lib/strings.ts` si faltan claves

**Interfaces:**
- Consumes: §B.4 del gap file; tokens T1.
- Produces: Pilares = mockup 11: toggle Ba Zi|Saju arriba (ya existe — restilar), grid de 4 pilares (HORA/DÍA/MES/AÑO: hanzi grande exento + etiqueta elemento 13 + animal), pilar del DÍA resaltado, card del Maestro del Día con **línea poética** (contenido exacto abajo), "BALANCE DE ELEMENTOS" con barras + conteo. Modo Pro intacto, tipografía realineada.

`DAY_MASTER_VOICE` — contenido EXACTO (clave = tronco celestial; transcribir, no redactar):

```ts
export const DAY_MASTER_VOICE: Record<string, { es: string; en: string }> = {
  jia:  { es: "Roble al amanecer: creces derecho aunque el viento diga otra cosa.",        en: "Oak at dawn: you grow straight even when the wind says otherwise." },
  yi:   { es: "Enredadera viva: no rompes el muro — lo conviertes en camino.",             en: "Living vine: you don't break the wall — you turn it into a path." },
  bing: { es: "Sol de mediodía: calor que da vida sin pedir permiso.",                     en: "Midday sun: warmth that gives life without asking permission." },
  ding: { es: "Llama de vela: luz íntima que enseña más que mil focos.",                   en: "Candle flame: an intimate light that teaches more than a thousand lamps." },
  wu:   { es: "Montaña quieta: los demás descansan porque tú no te mueves.",               en: "Still mountain: others rest because you do not move." },
  ji:   { es: "Tierra de huerto: todo lo que te confían, florece.",                        en: "Garden soil: everything entrusted to you, blooms." },
  geng: { es: "Acero templado: cortas lo que sobra para que quede lo verdadero.",          en: "Tempered steel: you cut away the excess so the true remains." },
  xin:  { es: "Joya pulida: tu brillo viene de la presión que supiste sostener.",          en: "Polished gem: your shine comes from the pressure you learned to hold." },
  ren:  { es: "Río ancho: llegas lejos porque no peleas con el cauce.",                    en: "Wide river: you go far because you don't fight the current." },
  gui:  { es: "Rocío del alba: tocas suave y aun así lo transformas todo.",                en: "Dawn dew: you touch softly and still transform everything." },
};
```

(Nota: usa como clave el identificador de tronco que ya use `content/bazi.ts`/el payload — jia/yi/bing/… o el hanzi — VERIFICA el shape real antes de escribir el Record.)

**Steps:**
- [ ] Añadir `DAY_MASTER_VOICE` a `content/bazi.ts` con la clave que el payload real usa.
- [ ] Aplicar §B.4 sección por sección. Gate móvil. Commit: `feat(movil-astros): Pilares = mockup 11 + voz del Maestro del Día`.

### Task 7: Horóscopo realineado a tokens (sin mockup propio)

**Files:**
- Modify: `apps/mobile/app/(tabs)/astros/horoscopo.tsx`, `apps/mobile/components/AreaBars.tsx`, `apps/mobile/components/SkyEvents.tsx`, `apps/mobile/components/HoroscopeReading.tsx` (solo estilos)

**Interfaces:**
- Consumes: §D del gap file.
- Produces: Horóscopo dentro de Astros con la misma piel: h1 fuera (el header de Astros ya da contexto — el título interno baja a sección 13 eyebrow o desaparece según §D), tipografía SOLO en la escala de 4 (+ glifos exentos), colores por tokens. CERO cambios de lógica/fetch/estado.

**Steps:**
- [ ] Aplicar §D. Gate móvil. Commit: `feat(movil-astros): Horóscopo realineado a la piel de mockups`.

### Task 8: Barrido final

**Files:** los tocados; no archivos nuevos.

**Steps:**
- [ ] Grep de tamaños fuera de escala en las pantallas tocadas (`fontSize: type.(xs2|xs|lg|xl|xl3)` y literales numéricos) — cada hallazgo se corrige o se justifica como exento (hero/glifo) en comentario.
- [ ] Paridad i18n: cada clave nueva existe en ES y EN (el lookup cae al literal de la clave si falta — grep de bloques).
- [ ] Gate completo: móvil (tsc + vitest + expo export) + web (tsc + vitest + next build, por T3a) + `npx turbo run test` en la raíz si el tiempo lo permite.
- [ ] Commit: `chore(movil-astros): barrido final — escala tipográfica, i18n, gates`.

---

## Self-Review (hecho al escribir)

- **Cobertura vs pedido de Gio:** Astros+switch (T2) ✓, Horóscopo adentro con Oriental/Occidental intacto (T2+T7) ✓, "tal cual los mockups" (T1, T3b, T4, T5, T6) ✓, barra 5 tabs (T2) ✓.
- **Placeholders:** los versos y las líneas del Maestro del Día están escritos AQUÍ (no "TBD"); los valores pixel viven en el gap file §A–§D que es artefacto concreto ya escrito.
- **Consistencia de tipos:** `fetchScores` nueva es espejo de `synastry-api.ts`; `type.lg2` se define en T1 y se consume en T3b–T7; `accText` ídem.
- **Decisiones tomadas (no re-litigar):** Modo Pro se conserva restilado; numerología sale de Hoy (mockup manda); orden de tabs = mockup (Pilares antes de Números) — flageado a Gio para flip trivial si lo quiere.
- **Riesgo secuencial:** T3b depende de T3a; T4–T7 dependen de T1+T2. Orden de ejecución: T1 → T2 → T3a → T3b → T4 → T5 → T6 → T7 → T8.
