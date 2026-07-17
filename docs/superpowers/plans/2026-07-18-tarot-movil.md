# Tarot móvil — espejo con paridad completa: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) o superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** el mundo tarot en la app Expo con paridad de la web: **sexta tab propia** (decisión de Gio 2026-07-18), carta del día con flip y persistencia servidor-como-verdad, la ceremonia táctil completa (sostener → cortar → abanico → voltear → lectura), y el diario. Reusa el motor y (tras moverlo) el contenido de `@aluna/core`; consume `/api/tarot/readings` con Bearer.

**Architecture:** (1) el contenido de las 78 cartas + prosa se MUEVE de `apps/web/lib/content/tarot-*.ts` a `packages/core/src/tarot/content-{es,en}.ts` (precedente glossary/legal — el móvil no puede importar de apps/web); la web pasa a re-exportar de core. (2) Cliente móvil `lib/tarot-api.ts` con el patrón Bearer exacto de eastern-api. (3) Imágenes por URL remota `${apiUrl()}/tarot/rws/{id}.webp` (cero bundling, 0 precedente de assets pesados en el binario). (4) Ceremonia con `Animated` de RN core (NO reanimated — no está instalado) + `Pressable` onPressIn/Out, siguiendo el precedente de coreografía de `components/use-ceremony.ts` (reduce-motion incluido).

**Tech Stack:** Expo/React Native, expo-router (Tabs), react-native-svg (TabIcon), Animated core, AsyncStorage vía lib/storage, Vitest (SOLO lib/ — no hay infra de tests de pantallas RN en el repo; las pantallas se verifican en Expo web + Expo Go de Gio).

## Global Constraints

- Gate móvil por tarea: desde `apps/mobile`: `npx tsc --noEmit && npx vitest run`. Gate web COMPLETO en la tarea 1 (el refactor de contenido la toca): desde `apps/web`: `npx tsc --noEmit && npx vitest run && rm -rf .next && npx next build`. ⚠️ Si el dev server corre, quien haga build DEBE reiniciarlo después (lección repetida ×2).
- i18n móvil: claves nuevas `tarot.*` en `apps/mobile/lib/strings.ts` en ES **y** EN (lookup nunca rompe pero la paridad se revisa a mano — espejar las claves que la web usa con `useTranslations("tarot")`).
- Tokens/temas SIEMPRE de `useTheme()` (`theme/tokens.ts`) — nada hardcodeado; serif Cormorant para nombres de carta, Quicksand para UI.
- Storage: keys versionadas patrón `aluna.X.v1` vía `lib/storage.ts` (getRaw/setRaw, best-effort).
- Reduce motion: patrón de `use-ceremony.ts:85-93` (`AccessibilityInfo.isReduceMotionEnabled()` con `.catch` a instantáneo).
- Animated con `useNativeDriver: true` donde solo haya transform/opacity de Views (las cartas son Views/Images, NO SVG — a diferencia de use-ceremony que anima props de SVG y exige false).
- Sin dependencias nuevas. Commits `feat(tarot-movil):`. `git add` por ruta explícita.

## Hechos del código (verificados 2026-07-18 — no redescubrir)

- Tab bar: `apps/mobile/app/(tabs)/_layout.tsx:40-83` (5 Screens + 2 legacy ocultas `href:null`); estilo 18-27 (height 84, sin ancho fijo por ítem — el 6º solo estrecha). Íconos: `components/TabIcon.tsx` — union `TabIconName` (L14), componentes de Path stroke 1.5, halo activo como View absoluto (L85-101).
- Motor tarot YA importable en móvil: `TAROT_DECK, cardById, dailyCard(userId, localDate, {reversals?}), drawCards, mulberry32, spreadById, TAROT_SPREADS` de `@aluna/core`.
- Contenido a mover: `apps/web/lib/content/tarot-es.ts` (1473 líneas: TAROT_CARDS_ES + dicts + composeReadingProse/composeReadingWith + READING_POSITION_LABELS) y `tarot-en.ts` (1378: TAROT_CARDS_EN + dicts EN). Import runtime es→en (patrón a conservar en core).
- API client patrón: `apps/mobile/lib/eastern-api.ts` completo (apiUrl() de lib/config, Bearer del auth-context, clase de error con status, tipos duplicados a mano con comentario de por qué). Tests: `lib/__tests__/eastern-api.test.ts` (mock de ../config + global.fetch).
- API server: `POST /api/tarot/readings` `{spread, question?, cards:[{cardId,reversed,position}], deck?}` → 201 fila | 400 | 401 | 403 `{error:"free_limit"}` | 500; `GET` → `{readings:[...], total}` (free ve 7). Acepta Bearer (authenticateRoute ya lo soporta — patrón de todas las APIs).
- Imágenes: `${apiUrl()}/tarot/rws/{id}.webp` y `back.webp` (públicas, sin auth). RN `<Image source={{uri}}>` core (expo-image NO está).
- Anidación de referencia: `app/(tabs)/astros/_layout.tsx` (Tabs internas con tabBar null + chips por pathname).
- Ceremonia web de referencia: `apps/web/app/(app)/tarot/ceremony.tsx` (máquina useReducer question→shuffle→cut→fan→reveal→reading, efímera).
- storage keys existentes: `aluna.activeProfile.v1`, `aluna.locale.v1`.
- Gate de sesión de app: `lib/ceremony-gate.ts` (una vez por sesión) — NO aplica al tarot (cada tirada ES una ceremonia nueva); no reusar.

---

### Task 1: Contenido de las 78 a `@aluna/core` (refactor web+core)

**Files:**
- Create: `packages/core/src/tarot/content-es.ts` + `content-en.ts` (movidos desde apps/web/lib/content/tarot-{es,en}.ts, con sus tipos TarotCardContent/TarotAmbits/ReadingComposeDicts y composeReadingProse/composeReadingWith/READING_POSITION_LABELS_*)
- Modify: `packages/core/src/index.ts` (exports nuevos en la sección // Tarot)
- Modify: `apps/web/lib/content/tarot-es.ts` → **re-export delgado** (`export { ... } from "@aluna/core"` — los consumidores web no cambian sus imports) · ídem `tarot-en.ts`
- Move test: la parte de contenido de `apps/web/lib/content/__tests__/tarot.test.ts` pasa a `packages/core/src/tarot/__tests__/content.test.ts`; en apps/web queda lo que pruebe integración web si algo (si nada, el archivo se reduce o elimina).

**Interfaces:**
- Produces (desde @aluna/core): `TAROT_CARDS_ES`, `TAROT_CARDS_EN`, `TarotCardContent`, `composeReadingProse(locale, spreadId, cards, question?)` — firmas EXACTAS actuales, sin cambios de comportamiento (es un MOVE, no un rewrite).

- [ ] **Step 1:** mover archivos (git mv espiritual: copiar contenido íntegro, ajustar imports internos — deck/spreads ahora son relativos `./deck`), exports en index.ts, re-exports web.
- [ ] **Step 2:** mover el test de contenido a core (ajustar imports); correr AMBOS gates: core (tsc+vitest) y web COMPLETO (tsc+vitest+build — el build verifica que ningún import web quedó roto).
- [ ] **Step 3:** commit `feat(tarot-movil): contenido de las 78 a @aluna/core — el móvil no puede importar de apps/web (precedente glossary)`.

### Task 2: Cliente API móvil + strings

**Files:**
- Create: `apps/mobile/lib/tarot-api.ts` + `apps/mobile/lib/__tests__/tarot-api.test.ts`
- Modify: `apps/mobile/lib/strings.ts` (bloque `tarot` ES+EN completo)

**Interfaces:**
- Produces: `saveTarotReading(accessToken, {spread, question?, cards, deck?}): Promise<TarotReadingRow>` (POST; lanza `TarotApiError` con `.status` — 403 free_limit distinguible); `fetchTarotDiary(accessToken): Promise<{readings: TarotReadingRow[], total: number}>`; tipo `TarotReadingRow` duplicado a mano (comentario del porqué, patrón eastern-api:4-8).

- [ ] **Step 1 (TDD):** tests patrón eastern-api.test (mock ../config + fetch): POST manda Bearer+body exacto; question omitida no viaja; 403 → error con status 403; GET parsea readings+total; JSON malformado → error. FAIL → implementar → verde.
- [ ] **Step 2:** strings `tarot.*` ES+EN espejando las claves web (title, dailyTitle, reversed, seeFullReading, spreads, spreadThree, spreadCeltic, soonPlus, diaryTitle, diaryEmpty, diaryError, retry, question*, silent, continue, shuffleHold, shuffleForMe, cutTitle, cutHint, fanTitle, fanCount, revealTitle, revealHint, read, readingTitle, yourQuestion, save, saved, freeLimit, backToThreshold, positions past/present/future/day...).
- [ ] **Step 3:** gate móvil → commit `feat(tarot-movil): cliente Bearer del diario + strings ES/EN`.

### Task 3: Sexta tab + pantalla umbral

**Files:**
- Modify: `apps/mobile/components/TabIcon.tsx` (union + `IconCards` — dos rects redondeados solapados en abanico, stroke 1.5, mismo lenguaje del icono `cards` web de components/icon.tsx — míralo)
- Modify: `apps/mobile/app/(tabs)/_layout.tsx` (Screen `tarot` entre `numeros` y `ajustes`)
- Create: `apps/mobile/app/(tabs)/tarot.tsx` (umbral) + lo que amerite en `components/` si un widget se repite
- Create: `apps/mobile/lib/tarot-daily.ts` + test (lógica pura extraíble: resolver estado revelado/guardado desde diario+storage — testeable sin RN)

**El umbral (paridad web):** eyebrow+título · carta del día: dorso por URI (`${apiUrl()}/tarot/rws/back.webp`) → tap = flip con `Animated` (rotateY interpolado, 2 caras con backfaceVisibility hidden; reduce-motion = swap) → carta revelada (imagen por URI, **invertida = rotate 180**, nombre serif + chip INVERTIDA + keywords + essence de TAROT_CARDS_* por locale) + "Ver lectura completa" (sheet/expand con la prosa daily de composeReadingProse) · persistencia: `aluna.tarotDailyRevealed.v1:{userId}:{localDate}` y `...Saved...` en storage + **servidor-como-verdad**: si el diario del GET trae daily de hoy → revelada+guardada (patrón exacto del fix web — portar la lógica a `lib/tarot-daily.ts` puro y testearla) · POST al revelar (marca saved solo en ok; reintento única vez al montar si revelada-sin-guardar) · tiradas: "Tres cartas" activa → ceremonia (Task 4 — placeholder mientras) · "Cruz celta" con SoonBadge · diario: lista del GET (spread+fecha+pregunta), tap expande lectura recompuesta; loading/error/vacío diferenciados (diaryError + retry).

- [ ] **Step 1 (TDD de lo puro):** tests de `lib/tarot-daily.ts`: (a) diario con daily de HOY (created_at local) → {revealed:true, saved:true}; (b) daily de ayer → ambos false si storage vacío; (c) storage revelado sin saved → {revealed:true, saved:false} (pide reintento). FAIL → implementar → verde.
- [ ] **Step 2:** icono + tab (verificar el union type compila) + pantalla completa.
- [ ] **Step 3:** gate móvil (tsc+vitest) + arranca `npx expo start --web` y mira el umbral en el navegador (login → tab Tarot → flip) — repórtalo con lo que viste. NO mates procesos ajenos.
- [ ] **Step 4:** commit `feat(tarot-movil): sexta tab + umbral — carta del día con flip, tiradas, diario`.

### Task 4: La ceremonia táctil

**Files:**
- Create: `apps/mobile/components/tarot-ceremony.tsx` (o app/(tabs)/tarot-ceremony si encaja mejor el patrón — decide mirando cómo astros estructura; la ceremonia se abre DESDE el umbral como overlay/pantalla, efímera)
- Modify: `apps/mobile/app/(tabs)/tarot.tsx` (montarla)
- Create: `apps/mobile/lib/__tests__/` — lo puro que se pueda extraer (p.ej. el reducer de la máquina SI se extrae a lib/tarot-ceremony-machine.ts → testearlo: transiciones válidas, guard 4º pick, pick duplicado, no-Leer hasta all flipped)

**La máquina (paridad web, adaptada a touch):** `question` (TextInput + "En silencio") → `shuffle` (mazo centrado; **Pressable onPressIn/onPressOut**: mientras presionas, 5-6 cartas fantasma orbitan con Animated loop — transform/opacity, native driver true; al soltar `gestureRng(Date.now()+performance.now())` de... ⚠️ gestureRng vive en apps/web/lib — DUPLICAR la función de 15 líneas en `apps/mobile/lib/tarot-rng.ts` con comentario (crypto: usar `expo-crypto`? NO está instalado — usar `Math.random()*2**32 ^ timestamp` como fuente móvil documentando la diferencia — la semilla del gesto sigue participando; o `global.crypto?.getRandomValues` que Hermes moderno SÍ expone — detecta y usa con fallback) → drawCards(3) → `cut` (3 montones, tap reunifica — ritual) → `fan` (las 78 boca abajo: **ScrollView horizontal** con cartas rotadas levemente en arco, tap elige, contador N de 3, la elegida se resalta/vuela a su slot con Animated) → `reveal` (3 slots, tap voltea cada una — flip reusado del umbral) → `reading` (scroll: por carta imagen+posición+nombre+ámbito; prosa completa de composeReadingProse; guardar vía tarot-api con manejo de 403 free_limit → nota con strings.freeLimit; volver refresca diario). Reduce-motion: por paso, resultado inmediato (patrón use-ceremony).

- [ ] **Step 1 (TDD del reducer):** extraer la máquina a `lib/tarot-ceremony-machine.ts` (pura, sin RN) y testearla. FAIL → implementar → verde.
- [ ] **Step 2:** el componente con la coreografía Animated.
- [ ] **Step 3:** gate móvil + expo web: ceremonia entera con mouse (press-hold funciona en web) — reporta lo visto.
- [ ] **Step 4:** commit `feat(tarot-movil): la ceremonia táctil — sostener, cortar, abanico, voltear, leer`.

### Task 5 (controlador): Verificación + revisión final + merge

Gates completos (core + web + móvil). Expo web propio: flujo entero + EN + reduce-motion si emulable. Revisión adversarial del branch (Fable — foco: refactor de contenido no rompió web, paridad de claves strings, la máquina móvil vs web, el RNG móvil documentado). Fixes → merge a main + push + memoria + checklist para Gio de qué mirar en Expo Go.
