# Tarot T2 — La ceremonia: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) o superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** el mundo `/tarot` visible y completo en web según el spec (`docs/superpowers/specs/2026-07-17-tarot-design.md` §4): séptima tab, umbral con carta del día, la ceremonia entera (pregunta → barajado sostenido → corte → abanico → volteo 3D → lectura), tirada de 3, diario básico. Con los deberes que dejó el review final de T1.

**Architecture:** una página `/tarot` con vista de umbral + una máquina de estados client-side para la ceremonia (componente propio, pantalla completa dentro del main); API nueva `/api/tarot/readings` (patrón western/bazi) con validación de cards contra el motor y límite free en servidor; el RNG de producción vive en `apps/web/lib/tarot/` (el motor de core sigue ciego a crypto). Todo el arte de assets ya existe (`public/tarot/rws/{id}.webp`).

**Tech Stack:** Next.js 15 App Router, @aluna/core (motor tarot T1), CSS Modules + tokens R3 + primitivos (.card/.chip/.seg — leer docs/redesign/R3-sistema.md antes de estilos), next-intl, Vitest + RTL.

## Global Constraints

- Gate por tarea (desde apps/web/): `npx tsc --noEmit && npx vitest run && rm -rf .next && npx next build` — verde antes de commitear. (Tareas solo-core: gate del paquete + tsc de web.)
- i18n: toda clave nueva en `messages/es.json` Y `en.json` (paridad vigilada por `app/__tests__/i18n.test.tsx`). Namespace nuevo `tarot`.
- Móvil (<1080px) también funciona: la ceremonia es responsive (no hay branch móvil aparte — un solo layout fluido; el breakpoint `@media (min-width: 1080px) /* bp desktop R4a */` solo ajusta proporciones).
- Animaciones: REUSAR los fundamentos existentes (`aluna-ignite`, `.reveal`, `aluna-draw`, `--dur-count`, patrón useCountUp) + keyframes locales del módulo donde haga falta. ⚠️ Lección CSS Modules: clase/keyframe global referenciado desde un .module.css se escala y muere silencioso — usar `:global()` o redefinir el keyframe local, y VERIFICAR EN NAVEGADOR.
- `prefers-reduced-motion`: cada paso de la ceremonia ofrece resultado inmediato (barajar = un tap, sin danza; revelado sin flip).
- El motor NO conoce crypto: el Rng de producción se construye en apps/web y se inyecta.
- Sin dependencias nuevas. Commits en español, prefijo `feat(tarot):`.
- ⚠️ Sesiones paralelas: `git add` por ruta explícita, nunca -A.

## Hechos del código (verificados, no redescubrir)

- Motor (T1, en main): `TAROT_DECK, TAROT_DECKS, cardById, mulberry32, shuffleDeck, drawCards(count, rng, {reversals?}), DrawnCard, TAROT_SPREADS, spreadById, dailyCard(userId, localDate), dailySeed, fnv1a32` — todo exportado de `@aluna/core`.
- Contenido: `TAROT_CARDS_ES/EN` (name, keywords, essence, upright/reversed{love,work,path}, bridge) y `composeReadingProse(locale, spreadId, cards[{cardId,reversed,position}], question?)` en `apps/web/lib/content/tarot-es.ts`.
- Assets: `apps/web/public/tarot/rws/{cardId}.webp` (~600px alto). Dorso de carta NO existe aún (Task 2 lo crea).
- BD: tabla `tarot_readings` (0012) — user_id RLS own, profile_id nullable, spread check in ('daily','three','celtic-cross'), question ≤280, cards jsonb, notes ≤2000, deck default 'rws'.
- Plus: `requirePlus(request)` en `apps/web/lib/reports/access.ts` (401/403 plus_required) — para T2 NO se usa directo (free también guarda); se usa `isPlusActive` de @aluna/core con la lectura de `subscriptions` (own-row RLS) como en access.ts:23-31 para el LÍMITE free.
- API patrón: `apps/web/app/api/horoscope/eastern/route.ts` (authenticateRoute, validación body, 400/401/404/500).
- TopNav: `apps/web/components/top-nav.tsx:11-16` — array de items {href, icon, key}; icons en `components/icon.tsx`.
- BottomSheet: `components/bottom-sheet.tsx` — {open, onClose, title?, center?, children}.
- Vista patrón: page.tsx server (auth+perfil) → *-view.tsx client. Perfil activo: `useProfiles()` de `lib/profiles/profiles-provider`.
- Review T1 → deberes T2 (este plan los cierra): checks de BD para cards (Task 1), opt reversals en dailyCard (Task 2), RNG de producción (Task 2), conectores variados del compose (Task 5), params vestigiales del compose (Task 5).

---

### Task 1: Migración 0013 — endurecer `cards` en BD

**Files:**
- Create: `supabase/migrations/0013_tarot_readings_hardening.sql`

Del review final de T1: la RLS permite insert directo vía PostgREST, así que lo estructural se valida en BD (el límite free y celtic-cross-Plus siguen en API — un free que se auto-llena el diario por REST solo se ensucia a sí mismo, sin fuga de valor en T2; se re-evalúa en T3 con la cruz celta).

```sql
-- Aluna · Tarot T2 — endurecimiento de tarot_readings (review final T1):
-- la RLS permite insert directo por PostgREST; lo ESTRUCTURAL se blinda en BD.
alter table public.tarot_readings
  add constraint tarot_cards_is_array check (jsonb_typeof(cards) = 'array'),
  add constraint tarot_cards_size check (pg_column_size(cards) <= 8192),
  add constraint tarot_deck_known check (deck in ('rws','aluna'));
```

- [ ] **Step 1:** escribir la migración (verbatim) + añadir los 3 constraints como comentario-nota en `packages/supabase/src/database.types.ts` NO cambia tipos (no hay cambio de shape) — no tocar types.
- [ ] **Step 2:** gate apps/web (nada debe romper) → commit `feat(tarot): endurecimiento BD de cards — array, cap 8KB, deck conocido (deberes review T1)`. Nota reporte: PENDIENTE GIO aplicar 0012+0013 juntas.

---

### Task 2: Core+lib — reversals opt en dailyCard, RNG de producción, dorso del mazo

**Files:**
- Modify: `packages/core/src/tarot/daily.ts` (+ test)
- Create: `apps/web/lib/tarot/rng.ts` + `apps/web/lib/tarot/__tests__/rng.test.ts`
- Create: `apps/web/public/tarot/rws/back.webp` (dorso)

**Interfaces:**
- Produces: `dailyCard(userId, localDate, opts?: { reversals?: boolean })` (default true, retrocompatible); `gestureRng(releaseTimestampMs: number): Rng` — mezcla `crypto.getRandomValues(new Uint32Array(1))[0] ^ (releaseTimestampMs >>> 0)` como semilla de `mulberry32` (el instante del gesto participa, spec §3.1); `back.webp` = dorso para cartas boca abajo.

- [ ] **Step 1 (TDD core):** test — `dailyCard(u, d, {reversals:false}).reversed === false` siempre; sin opts, igual que antes (mismos resultados con misma semilla — no romper determinismo existente). FAIL → implementar (pasa opts a drawCards) → verde.
- [ ] **Step 2 (TDD web):** test rng — `gestureRng(t)` devuelve función; dos llamadas con mismo timestamp dan secuencias DISTINTAS (crypto participa); mockeando crypto.getRandomValues con valor fijo, mismo timestamp → misma secuencia (determinismo del mezclado). FAIL → implementar → verde.
- [ ] **Step 3 (dorso):** generar back.webp con el script one-off `scripts/tarot-make-back.mjs` (crear): SVG simple programático — fondo índigo profundo #1a1a2e, borde dorado fino, patrón de estrella/enso centrado con líneas doradas (sobrio, geométrico — nada de clipart), 600px alto, vía npx sharp-cli svg→webp. Verificar ABRIÉNDOLO.
- [ ] **Step 4:** gates ambos paquetes → commit `feat(tarot): reversals opcionales en carta del día + RNG del gesto + dorso del mazo`.

---

### Task 3: API `/api/tarot/readings` — guardar y listar con límite free

**Files:**
- Create: `apps/web/app/api/tarot/readings/route.ts` (POST + GET)
- Test: `apps/web/lib/tarot/__tests__/readings-validation.test.ts` (la validación pura extraída)
- Create: `apps/web/lib/tarot/validate-reading.ts`

**Interfaces:**
- Produces: `validateReadingPayload(body: unknown): { ok: true; value: {spread, question?, cards, deck} } | { ok: false; error: string }` — pura, testeable: spread ∈ TAROT_SPREADS y ≠'celtic-cross' (T2 no lo expone; T3 lo abre con gate Plus), cards.length === spreadCount, cada cardId existe (cardById), positions = las del spread sin repetir, reversed boolean, question ≤280, deck ∈ mazos enabled.
- POST: authenticateRoute → validate → si NO Plus (lectura subscriptions own-row + isPlusActive, patrón access.ts:23-31): contar lecturas del user (head:true count) y si ≥7 → 403 `{error:"free_limit"}` → insert (cliente autenticado, RLS own) → 201 con la fila.
- GET: authenticateRoute → lista propia ordenada created_at desc, limit 20 (T2 sin paginación) — el FREE ve solo 7 (slice server-side, con `total` en la respuesta para que la UI muestre "N guardadas · Plus para ver todas").

- [ ] **Step 1 (TDD):** tests de validateReadingPayload — casos: three válido ✓; celtic-cross → error; cardId inventado → error; posición repetida → error; 2 cartas para three → error; question 281 → error; deck 'aluna' (disabled) → error. FAIL → implementar → verde.
- [ ] **Step 2:** route con el flujo de arriba (la carta del DÍA también se guarda por aquí: spread 'daily', 1 carta — cuenta para el diario pero NO para el límite de 7: filtrar spread≠'daily' en el count; documentar por qué: el hábito diario nunca se bloquea).
- [ ] **Step 3:** gate completo → commit `feat(tarot): API de lecturas — validación contra el motor, límite free 7 (daily exento), diario RLS`.

---

### Task 4: La séptima tab + el umbral `/tarot`

**Files:**
- Modify: `apps/web/components/top-nav.tsx` (item tarot tras pilares, antes de perfil) + `components/icon.tsx` (icono "cards" — dos rectángulos redondeados solapados en abanico, trazo línea como los demás)
- Create: `apps/web/app/(app)/tarot/page.tsx` + `tarot-view.tsx` + `tarot.module.css`
- Modify: `apps/web/messages/es.json` + `en.json` (namespace `tarot`: tab, título, eyebrow, dailyTitle, dailyReveal, spreads, spreadThree, spreadCelticSoon, diaryTitle, diaryEmpty, freeLimitNote, ...)
- Test: `apps/web/app/(app)/tarot/__tests__/tarot-view.test.tsx`

**El umbral (spec §4.1):** eyebrow TAROT + h1 · **carta del día** arriba: la carta boca abajo (back.webp) esperándote; tap → flip 3D in-place + nombre/keywords (ignite) + essence + botón "ver lectura completa" (abre la lectura daily como ceremonia corta) — el estado revelado PERSISTE (localStorage `tarot-daily-{userId}-{localDate}` + guardado vía POST spread 'daily' la primera vez) · **tiradas**: tarjeta "Tres cartas" (pasado/presente/futuro) activa → entra a la ceremonia; tarjeta "Cruz celta" con chip "Pronto · Plus" deshabilitada (T3) · **diario**: las últimas lecturas (GET), cada una expandible (BottomSheet con su prosa recompuesta), vacío con card--dashed.

**Spike previo (Step 1): TopNav a 7 tabs** — añadir el item y mirar a 1080/1180/1280px que no rompa (los items tienen labels cortos; si aprieta, el CSS de .tabs admite gap menor bajo un media query puntual — decidir con el navegador).

- [ ] **Step 1:** spike TopNav (añadir tab + icono, `pnpm dev`, screenshot mental a 3 anchos, ajustar gap si hace falta) → commit chico `feat(tarot): séptima tab en el shell (spike 1080-1280 ok)`.
- [ ] **Step 2 (TDD):** tests de tarot-view con fetch mockeado: carta del día boca abajo al montar; tap la voltea y postea; tarjeta three navega a estado ceremonia; celtic deshabilitada con chip; diario lista lo del GET.
- [ ] **Step 3:** implementar umbral (flip 3D: keyframe local `tarotFlip` con transform rotateY + backface-visibility, mitad dorso mitad cara; reduced-motion: swap directo).
- [ ] **Step 4:** gate → commit `feat(tarot): el umbral — carta del día con flip, tiradas, diario (mockup vivo del mundo 7)`.

---

### Task 5: La ceremonia (el corazón de T2)

**Files:**
- Create: `apps/web/app/(app)/tarot/ceremony.tsx` (máquina de estados client)
- Create: `apps/web/app/(app)/tarot/ceremony.module.css`
- Modify: `apps/web/app/(app)/tarot/tarot-view.tsx` (montar ceremonia al elegir tirada)
- Modify: `apps/web/lib/content/tarot-es.ts` (deberes review T1: conectores VARIADOS por posición en composeReadingProse — array de 3-4 plantillas de conector rotando por índice, ES y EN en sus dicts; y limpiar params vestigiales `locale` interno / documentar `spreadId`)
- Modify: messages es/en (pasos: questionTitle, questionPlaceholder, questionSilent, shuffleHold, shuffleHint, cutTitle, fanTitle, fanHint, revealHint, readingTitle, saveReading, savedOk, ...)
- Test: `apps/web/app/(app)/tarot/__tests__/ceremony.test.tsx` + extender `lib/content/__tests__/tarot.test.ts` (conectores variados: los 3 párrafos de three NO comparten el mismo arranque)

**Máquina de estados:** `question → shuffle → cut → fan → reveal → reading`.

- **question**: input opcional (≤280) + botón "En silencio" (question=undefined). Enter avanza.
- **shuffle**: el mazo centrado (dorso). MANTENER PRESIONADO (pointerdown/up, también touch): mientras sostienes, 5-7 cartas fantasma orbitan/danzan alrededor (keyframes locales, transform/opacity only, starfield de fondo ya existe); al SOLTAR: `gestureRng(performance.now() + Date.now())` → `drawCards(spreadCount, rng)` guardado en estado + transición a cut. Accesible: botón "Barajar por mí" (tap simple, mismo rng). Reduced-motion: solo el botón.
- **cut**: el mazo se divide en 3 montones (mismo dorso, offsets); tocar uno (visual only — el orden ya está echado; documentar en comentario que el corte es ritual, no re-aleatoriza: la semilla del gesto ya selló el orden) → transición.
- **fan**: las 78 boca abajo en arco (CSS: absolute + rotate por índice, container queries de ancho; en móvil arco más cerrado con scroll horizontal suave). Eliges spreadCount cartas con tap — cada elegida vuela (transition transform) a su slot de posición abajo (etiquetados past/present/future). Las elegidas MAPEAN al resultado de drawCards por orden de elección (la 1ª que tocas = cards[0]...). Contador "2 de 3".
- **reveal**: los slots en fila; tap voltea cada una (flip 3D reutilizado de Task 4) mostrando la carta real (webp) + nombre (ignite) + keywords; volteadas todas → botón "Leer".
- **reading**: la lectura scrolleable — por carta: imagen chica + posición + nombre + el texto del ámbito (upright/reversed según carta) — y la prosa de composeReadingProse completa al final + guardar (POST; si 403 free_limit → nota con CTA Plus suave; daily nunca la ve) + "volver al umbral".
- Estado en el componente (useReducer); NO en URL (la ceremonia es efímera; recargar = volver al umbral, correcto).

- [ ] **Step 1 (TDD):** tests con RTL (reduced-motion mockeado): flujo completo question→…→reading con fetch mockeado; "En silencio" salta sin question; elegir 3 en el fan habilita reveal; voltear las 3 habilita Leer; la lectura muestra los 3 nombres; conectores variados (test en tarot.test.ts).
- [ ] **Step 2:** conectores del compose (contenido) + limpiar vestigiales.
- [ ] **Step 3:** implementar ceremonia completa (CSS con el alma de Aluna: lento y suave, dorado sobre índigo; nada de confeti).
- [ ] **Step 4:** gate completo → commit `feat(tarot): la ceremonia — pregunta, barajado sostenido, corte, abanico, volteo y lectura`.

---

### Task 6 (controlador): Verificación real end-to-end + revisión adversarial

Navegador (cuenta de prueba): tab visible a 3 anchos; carta del día voltea/persiste/aparece en diario; ceremonia entera con mouse Y con touch emulado (390px); "en silencio"; guardar y ver en diario; límite free (insertar 7 por API y ver el 403 + nota); reduced-motion (emular); EN completo. Revisión adversarial del branch (Fable) con lentes: estados de la ceremonia (¿se puede romper la máquina saltando pasos?), doble-guardado del daily, validación API, i18n. Fixes → merge a main + push + memoria.
