# "Aluna te conoce" — capa de memoria por usuario · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** que Aluna recuerde a la persona entre conversaciones — sin borrones: tras cada chat (general y de tarot) se destilan hechos duraderos a una tabla por usuario, y esos recuerdos se re-inyectan en los prompts de todas las superficies IA, gobernados por el toggle de privacidad existente (`intent.useInAI`).

**Architecture:** tabla `user_memories` (RLS por usuario) + `apps/web/lib/memories.ts` (leer/formatear/destilar-guardar) + inyección en `/api/chat` y `/api/tarot/reading-chat` + destilación fire-and-forget post-stream (patrón `after()` de los informes) + sección "Aluna te conoce" en /ajustes para ver y borrar recuerdos. Sin embeddings (YAGNI: cap de 24 recuerdos compactos caben en prompt). El modelo NO es la memoria — la plataforma lo es (patrón Hermes+RAG de Gio).

**Tech Stack:** Next.js 15, Supabase (RLS), proveedor IA intercambiable existente (`resolveReadingProvider`), Vitest.

## Global Constraints

- Rama `aluna-te-conoce` en ~/astro-app. NO tocar main directamente. ⚠️ Sesiones paralelas activas (tarot-t4 toca `/api/tarot/reading-chat`): los cambios en ese archivo deben ser MÍNIMOS (import + 2 puntos de inserción).
- **Prompt byte-igual** cuando no hay recuerdos o `useInAI` está apagado (mismo contrato que intent-line — regla sagrada del repo).
- La destilación NUNCA bloquea ni rompe la respuesta del chat (fire-and-forget, try/catch total, patrón best-effort).
- PostgrestBuilder NO tiene `.catch` — try/catch siempre (lección T9 cuestionario).
- Claves internas en inglés. i18n ES y EN (paridad vigilada). Sin deps nuevas.
- cacheKeys que incluyan contenido personalizado deben incluir lo que el prompt teje (lección security fix 18108a3) — las superficies chat no cachean, no aplica; NO cablear memoria en lecturas cacheadas (/api/reading, chart-reading, bazi-reading) en esta fase: su caché es por-número/posición compartible y la memoria la rompería. SOLO chat + tarot-chat.
- Gates por tarea: vitest web + tsc web; la final añade `NODE_OPTIONS=--max-old-space-size=16384 next build`.
- Commits en español, prefijo `feat(memoria):`.
- Migración 0018 (0017 es la última hoy). NO aplicarla en vivo (Gio la aplica con las pendientes 0011+).

### Task 1: Cimientos — migración + lib de memorias

**Files:** Create `supabase/migrations/0018_memorias.sql`; Modify `packages/supabase/src/database.types.ts` (tabla `user_memories`); Create `apps/web/lib/memories.ts` + `apps/web/lib/__tests__/memories.test.ts`.

SQL: tabla `public.user_memories` (`id uuid pk default gen_random_uuid()`, `user_id uuid not null references auth.users on delete cascade`, `content text not null check (char_length(content) <= 280)`, `source text not null` (chat|tarot), `created_at timestamptz default now()`); índice por user_id; RLS: select/insert/delete propios (calcar el estilo de 0002/0011).

`memories.ts` produce:
- `MEMORY_CAP = 24`
- `fetchMemories(supabase, userId): Promise<{id,content,source,created_at}[]>` (orden created_at desc, limit CAP; try/catch → [])
- `formatMemoryBlock(memories, locale): string | null` — null si vacío; ES: `"LO QUE ALUNA RECUERDA DE LA PERSONA (contexto ganado en conversaciones previas; úsalo con naturalidad, no lo recites):\n- …"`; EN equivalente.
- `distillPrompt(transcript, existing, locale): {system, prompt}` — pide 0-3 hechos NUEVOS duraderos (no ya sabidos, no chismes de un día, no datos sensibles de salud/terceros), formato JSON `{"memories": ["…"]}`, cada uno ≤200 chars.
- `parseDistilled(raw): string[]` (tolerante: JSON directo o embebido; filtra vacíos/duplicados contra existentes case-insensitive; máx 3).
- `storeMemories(supabase, userId, contents, source)` — inserta y si supera CAP borra las más viejas (select ids sobrantes → delete). Todo try/catch.
TDD: tests de formatMemoryBlock (null vacío/formato ES-EN), parseDistilled (JSON limpio, embebido en prosa, dedupe, cap 3), y fakes de supabase para storeMemories (inserta y poda) — calcar el estilo de fakes de `apps/mobile/lib/__tests__/intent.test.ts`.

Commit: `feat(memoria): tabla user_memories + lib de recuerdos (formato, destilado y poda)`

### Task 2: Cablear chat y tarot-chat — inyección + destilación

**Files:** Modify `apps/web/app/api/chat/route.ts` y `apps/web/app/api/tarot/reading-chat/route.ts` (MÍNIMO en el de tarot).

En ambos:
1. Tras armar `system` (y tras la línea de intención en /api/chat): leer `settings.intent` (el chat ya lo hace; en tarot-chat ver si ya lee settings — si no, un select más), y si `parseIntent(...)?.useInAI !== false` → `fetchMemories` + `formatMemoryBlock`; si block → `system += "\n\n" + block`. Byte-igual si off/vacío.
2. Post-stream: `after(async () => { … })` (import de `next/server`, patrón de reports/generate) que reconstruye el transcript (mensajes user+assistant de la conversación + respuesta final acumulada — acumular chunks en una var durante el stream), llama `provider.complete` con `distillPrompt`, `parseDistilled`, `storeMemories`. SOLO si useInAI on. Try/catch total.
Nota tarot: tocar el mínimo de líneas; no reordenar nada del canon.
Tests: el repo no testea routes — la lógica pura quedó testeada en T1. Verificación: tsc + suite entera verde + revisión de byte-igual por lectura.

Commit: `feat(memoria): el chat y el tarot recuerdan — inyección de recuerdos y destilado post-conversación`

### Task 3: Ajustes "Aluna te conoce" + gate final

**Files:** Modify `apps/web/app/(app)/ajustes/` (nueva card — leer la página para calcar el patrón de cards/estilos), `apps/web/app/(app)/actions.ts` (action `deleteMemory(id)` — delete RLS-scoped propio), `apps/web/messages/es.json`/`en.json`.

Card "Aluna te conoce" bajo la sección de preferencias: lista los recuerdos (server component fetch) con botón borrar por ítem (form action), y estado vacío amable ("Aluna aún no guarda recuerdos tuyos. Nacen de tus conversaciones."). Junto al toggle `intentAI` existente (que ya gobierna el uso). i18n: `memoriesTitle` "Aluna te conoce"/"Aluna knows you", `memoriesHint` ES: "Recuerdos que Aluna destila de tus conversaciones para acompañarte mejor. Bórralos cuando quieras." EN natural, `memoriesEmpty`, `memoriesDelete` "Olvidar"/"Forget".
Gate final: vitest web + tsc + next build (16384) → PASS.

Commit: `feat(memoria): Ajustes muestra y deja olvidar lo que Aluna recuerda`

## Self-review del plan (hecho)
- Privacidad: gobernada por toggle existente + visibilidad/borrado en Ajustes ✓. Byte-igual off ✓. Caches compartidas NO tocadas a propósito (documentado) ✓. Móvil: consumirá los mismos prompts server-side automáticamente (chat móvil pega a las mismas rutas); UI de gestión móvil = fase siguiente ✓.
