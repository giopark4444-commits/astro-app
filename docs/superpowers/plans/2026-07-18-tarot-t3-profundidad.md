# Tarot T3 — Profundidad: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) o superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** las tres piezas del feedback de Gio según `docs/superpowers/specs/2026-07-18-tarot-t3-profundidad-design.md`: prosa de sesión real (composer v2 en core), chat IA de la tirada que pregunta y desarrolla (latente sin llaves), y modo manual con mazo físico (plantillas + libre + jumpers) — en web Y móvil.

**Architecture:** composer v2 en `packages/core/src/tarot/content-{es,en}.ts` (compartido gratis); API nueva `/api/tarot/reading-chat` clonando `/api/chat` (resolveReadingProvider, latente); migración 0014 (spread 'free') + validate-reading ampliado; UI web (selector manual + chat inline) y móvil espejo.

**Tech Stack:** el de siempre. Gates: core (tsc+vitest), web (tsc+vitest+build), móvil (tsc+vitest). ⚠️ dev server + build = reiniciar dev. `git add` por ruta explícita.

## Global Constraints

- Voz Aluna calibrada (leer signos/animales/cartas existentes); EN arquitectura propia (lección T1 — Sonnet calca: el implementador de contenido EN debe variar estructura, y la curación va en el review).
- i18n: web messages es+en (namespace tarot, claves nuevas del manual/chat); móvil strings.ts ES+EN en paridad.
- El chat NUNCA inventa significados: el system prompt lleva el canon de las cartas de la tirada (essence/ámbitos/bridge) y se le ordena anclarse ahí.
- Jumpers: máx 3, sin duplicados contra la tirada; positions `jumper-1..n`. Free: 1-10 cartas, positions `free-1..n`.
- Sin dependencias nuevas. Commits `feat(tarot-t3):`.

## Hechos del código (no redescubrir)

- Chat patrón: `apps/web/app/api/chat/route.ts` COMPLETO (SYSTEM_INTRO con la voz, buildContext con carta natal resumida, resolveReadingProvider de `lib/reading/provider`, latente → {available:false}, ChatMessage). La UI del chat web: `app/(app)/preguntar/` (burbujas .user/.aluna, chat.module.css). Móvil: `apps/mobile/lib/chat-api.ts` + pantalla `app/(tabs)/preguntar.tsx` (si existe — verificar; el móvil tiene chat de F4).
- Composer actual: `packages/core/src/tarot/content-es.ts` (composeReadingProse/composeReadingWith + READING_POSITION_LABELS + conectores rotados) y dicts en content-en.ts.
- Validación: `apps/web/lib/tarot/validate-reading.ts` (ALLOWED_SPREAD_IDS excluye celtic; extenderá free). API readings: `app/api/tarot/readings/route.ts`. Migraciones: 0012/0013 (check spread in daily/three/celtic-cross → 0014 añade 'free').
- Web tarot UI: `app/(app)/tarot/tarot-view.tsx` (umbral) + `ceremony.tsx` (reading step — el chat se monta al final de su paso reading Y en la lectura del diario/daily "Ver lectura completa"). Móvil: `app/(tabs)/tarot.tsx` + `components/tarot-ceremony.tsx`.
- Móvil 403: `components/tarot-ceremony.tsx:323-328` asume 403=free_limit — corregir leyendo body (la API devuelve {error:"free_limit"}).
- TarotFlipCard móvil con fallback de imagen (main 6d8edc0). Cliente móvil: `lib/tarot-api.ts`.

---

### Task 1: Composer v2 — prosa de sesión real (core)

**Files:** Modify `packages/core/src/tarot/content-es.ts` + `content-en.ts`; test `packages/core/src/tarot/__tests__/content.test.ts` (extender).

**Interfaces:** `composeReadingProse(locale, spreadId, cards, question?, opts?: { jumpers?: Array<{cardId, reversed}> })` — firma retrocompatible (opts nuevo). Estructura del spec §1: apertura con clima (mayorías: palo dominante si ≥50% de menores comparten palo, conteo invertidas, mayores vs menores), 2-3 párrafos POR carta (escena=essence anclada al rol; ámbito desarrollado + eco de la pregunta; bridge como cierre), sección jumpers, cierre de relaciones (palo repetido, todas-mayores, señal invertidas existente). Free: positions free-N → "Primera carta…" (dict ordinal 1-10 ES/EN). TODO el texto conectivo nuevo en dicts ES/EN — EN con estructura propia, no calco.

- [ ] Step 1 (TDD): tests — por carta ≥2 párrafos; jumpers presentes solo si vienen; free sin roles con ordinales; clima correcto (fixture con 3 bastos → "domina el fuego"); retrocompat (llamada sin opts = estructura nueva pero sin sección jumpers); EN≠ES estructural (spot).
- [ ] Step 2: implementar (dicts conectivos nuevos con la voz; calibrar leyendo cartas existentes).
- [ ] Step 3: gates core+web (composeReadingProse la consume la web — verificar que las vistas siguen bien con la prosa más larga) + commit `feat(tarot-t3): composer v2 — prosa de sesión real con clima, escenas, jumpers y cierre tejido`.

### Task 2: Migración 0014 + validación free/jumpers + fix 403 móvil

**Files:** Create `supabase/migrations/0014_tarot_free_spread.sql`; Modify `apps/web/lib/tarot/validate-reading.ts` + su test; Modify `apps/mobile/components/tarot-ceremony.tsx` (403 lee body) + `apps/mobile/lib/tarot-api.ts` (exponer body del error).

```sql
-- Aluna · Tarot T3 — tirada libre del modo manual.
alter table public.tarot_readings drop constraint tarot_readings_spread_check;
alter table public.tarot_readings add constraint tarot_readings_spread_check
  check (spread in ('daily','three','celtic-cross','free'));
```

Validación: spread 'free' → 1-10 cards con positions free-1..free-N consecutivas; jumpers opcionales en cards con position jumper-1..jumper-M (M≤3), flag jumper:true; cardId único en TODO el conjunto; 'three'/'daily' aceptan también jumpers (modo manual con plantilla). TarotApiError móvil gana `.code` (parsea {error} del body); tarot-ceremony usa code==="free_limit".

- [ ] Step 1 (TDD validación): free válido; free-11 cartas → error; jumper duplicando cardId → error; 4 jumpers → error; positions no consecutivas → error; three+jumpers válido.
- [ ] Step 2: migración verbatim + implementar + fix móvil (test del .code en tarot-api.test).
- [ ] Step 3: gates web+móvil + commit `feat(tarot-t3): tirada libre y jumpers en BD+validación; el móvil distingue free_limit por body`. Nota: PENDIENTE GIO aplicar 0014 (con 0011-0013).

### Task 3: API del chat de la tirada

**Files:** Create `apps/web/app/api/tarot/reading-chat/route.ts`; test `apps/web/lib/tarot/__tests__/reading-chat-context.test.ts` (la construcción del contexto extraída pura a `apps/web/lib/tarot/reading-chat-context.ts`).

Clon de `/api/chat`: mismo runtime/auth/proveedor/latencia. `buildTarotContext(locale, spread, cards+jumpers, question, natal?)` PURO: bloque de tirada (posición→carta→invertida→jumper) + canon por carta (essence/ámbito aplicable/bridge del dict del locale) + cielo natal resumido si hay perfil (reusar el buildContext de chat como referencia, versión compacta). System prompt = voz SYSTEM_INTRO + capa tarotista del spec §2 (ES y EN): abre el PRIMER turno con 1-2 preguntas puntuales sobre la tirada concreta, desarrolla con la persona, jamás fuera del canon, invertidas y jumpers pesan.

- [ ] Step 1 (TDD contexto): el contexto contiene las 3 cartas con sus textos canónicos del locale; jumper marcado; question presente; sin natal si no hay perfil.
- [ ] Step 2: route (streaming/shape idéntico a /api/chat; sin llaves → available:false).
- [ ] Step 3: gate web completo + commit `feat(tarot-t3): chat de la tirada — la IA pregunta y desarrolla, anclada al canon (latente sin llaves)`.

### Task 4: Web — modo manual + chat inline + prosa v2 visible

**Files:** Modify `app/(app)/tarot/tarot-view.tsx` (entrada "Con tu mazo físico"), Create `app/(app)/tarot/manual-entry.tsx` (+ estilos en tarot.module.css o módulo propio), Create `app/(app)/tarot/reading-chat.tsx` (chat inline reusando el patrón visual de preguntar), Modify `ceremony.tsx` (montar chat al final del reading), messages es+en, tests RTL.

Manual: plantilla (three/daily) o libre (stepper 1-10) → selector (input buscador con filtro por nombre localizado + grid por palo; toggle invertida por elegida; sin duplicados; miniaturas) → jumpers (mismo selector, máx 3) → lectura (composer v2 + jumpers) → chat → guardar (POST readings con free/jumpers). Chat inline: burbujas patrón preguntar, dormido sin llaves con nota, primer mensaje lo abre la IA (la UI manda messages:[] y muestra la apertura con preguntas).

- [ ] Step 1 (TDD): selector impide duplicados y respeta límites; toggle invertida refleja; flujo libre 5 cartas llega a lectura; chat dormido sin llaves muestra nota; ceremonia digital muestra el chat al final.
- [ ] Step 2: implementar (estética: naipes chicos con miniatura, buscador con el input del repo).
- [ ] Step 3: gate web + commit `feat(tarot-t3): modo manual con mazo físico + chat de la tirada en la lectura`.

### Task 5: Móvil — espejo manual + chat

**Files:** Modify `apps/mobile/app/(tabs)/tarot.tsx`, Create `apps/mobile/components/tarot-manual.tsx` + `tarot-reading-chat.tsx`, Modify `components/tarot-ceremony.tsx` (chat al final), Modify `lib/tarot-api.ts` (+ `sendTarotChat` Bearer → /api/tarot/reading-chat), strings ES/EN, tests de lo puro (lib).

Espejo del flujo web adaptado: selector con TextInput buscador + FlatList por palo, toggles, jumpers; chat con burbujas RN (referencia: pantalla preguntar móvil de F4 — buscarla; si el patrón existe, reusarlo). Prosa v2 llega sola por core.

- [ ] Step 1 (TDD lib): sendTarotChat shape+Bearer; lógica pura del selector si se extrae (dedupe/límites) testeada.
- [ ] Step 2: implementar + gate móvil.
- [ ] Step 3: commit `feat(tarot-t3): móvil — mazo físico y chat de la tirada`.

### Task 6 (controlador): Verificación real + review final + merge

Web (cuenta r4ctest): modo manual completo (libre 5 cartas + 2 jumpers → prosa rica con clima/escenas/jumpers → chat dormido con nota), ceremonia digital → prosa v2 + chat al final, EN. Móvil Expo web: espejo. Review Fable (lentes: canon en el prompt del chat — que NO pueda inventar; validación free/jumpers; calco EN del conectivo nuevo; regresiones en lecturas guardadas viejas con el composer nuevo). Fixes → merge+push+memoria.
