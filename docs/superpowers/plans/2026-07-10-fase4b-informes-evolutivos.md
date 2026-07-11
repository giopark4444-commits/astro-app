# Fase 4b — Informes evolutivos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el motor de los informes evolutivos premium de Aluna — tabla `user_reports`, cascada de proveedores Hermes→DeepSeek→OpenAI, generación IA en background con `after()`, gate Plus antes de gastar, endpoints y una vista mínima de verificación. UI de lujo/móvil/PDF diferidos.

**Architecture:** Módulos puros de generación (grounding→prompt→parse) + un orquestador `runReportGeneration` (testeable con `await` directo) disparado por `after()` de Next 15; los endpoints gatean `isPlusActive` ANTES de cualquier gasto de IA; estado en `user_reports` con recuperación de colgados por staleness. Mismo patrón de auth/servicio que 4a.

**Tech Stack:** Next.js 15 (App Router, `after()` de `next/server`), Supabase (Postgres 17 + RLS + service-role), proveedores IA por REST OpenAI-compatible (Hermes/Nous Portal, DeepSeek, OpenAI ya existe), TypeScript strict, Vitest.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-10-fase4b-informes-evolutivos-design.md`.
- **Gate Plus ANTES de gastar en IA**: cada endpoint corre `authenticateRoute` → lee `subscriptions` con service-role → `isPlusActive` (de `@aluna/core`); sin Plus → 403 `{ error: "plus_required" }`, cero llamada a proveedor. El `user_id` sale SIEMPRE de la sesión, nunca del body.
- **Cascada de proveedores** para informes: Hermes (Nous Portal, `https://api.nousresearch.com/v1`, modelo `Hermes-4-70B`, `NOUS_API_KEY`/`NOUS_MODEL`) → DeepSeek (`https://api.deepseek.com`, modelo `deepseek-chat`, `DEEPSEEK_API_KEY`) → OpenAI (ya existe). Todos OpenAI-compatible por `fetch` REST (Aluna NO usa el SDK de OpenAI — mantener el estilo `fetch` de `provider.ts`). Sin ninguna llave → `available: false`, sin escribir fila.
- **Timeout de la cascada de informes ≠ el de lecturas cortas**: los adaptadores existentes hardcodean `AbortSignal.timeout(60000)` (60s, para 650-850 palabras). Un informe largo lo necesita mayor — la cascada usa `AbortSignal.timeout(150000)` (150s) propio, y NO se ata al `request.signal` del cliente (cerrar la pestaña no debe abortar una generación que igual va a terminar y guardarse).
- **Migración `0006`**: la tabla ya se aplica en vivo al proyecto `xcilrdpcanielalpfvld` vía `mcp__plugin_supabase_supabase__apply_migration` (como 0001-0005) + hand-edit de `packages/supabase/src/database.types.ts`.
- **NULLS NOT DISTINCT**: `unique(user_id, kind, year, locale)` con `year` NULL para natal NO colisiona en Postgres estándar; usar `unique nulls not distinct` (Postgres 15+; Supabase es 17) para que dos filas natal del mismo usuario sí choquen.
- **`content` es `jsonb not null`**: una fila `generating` aún no tiene informe → placeholder `'{}'::jsonb` al marcar generating.
- Bilingüe ES/EN (el `locale` viaja en cada request y se persiste). Comentarios en español.
- Gate por tarea: `cd apps/web && npx tsc --noEmit && npx vitest run`; el gate pesado `rm -rf .next && npx next build` al final de las tareas de ruta/vista. Paquetes tocados → `npx pnpm -w exec turbo run typecheck test`.
- La verificación en vivo (endpoints ejecutados de verdad) es la Fase 5 de build-fable-g, con Plus simulado por SQL; si Gio no puso llaves de IA, el camino `available:false` se verifica y la generación real se documenta como bloqueada.

---

### Task 1: Migración `user_reports` + tipos + entrada Functions no aplica

**Files:**
- Create: `supabase/migrations/0006_user_reports.sql`
- Modify: `packages/supabase/src/database.types.ts`

**Interfaces:**
- Produces: tabla `public.user_reports`; tipos `Tables<"user_reports">`, `TablesInsert<"user_reports">`, `TablesUpdate<"user_reports">`.

- [ ] **Step 1: Escribir la migración**

```sql
-- supabase/migrations/0006_user_reports.sql
-- Informes evolutivos premium POR USUARIO (a diferencia de reading_cache, que
-- es contenido universal). Un informe por (usuario, tipo, año, idioma) — natal
-- usa year NULL (permanente). Solo el webhook/servidor (service_role) escribe;
-- el usuario solo lee los suyos (RLS), igual que subscriptions.
create table public.user_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles_user(id) on delete cascade,
  kind text not null check (kind in ('natal', 'solar_return')),
  year int,
  locale text not null check (locale in ('es', 'en')),
  content jsonb not null,
  status text not null check (status in ('generating', 'ready', 'error')),
  model_used text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- NULLS NOT DISTINCT: sin esto, dos filas natal (year=NULL) del mismo usuario
  -- NO colisionarían en Postgres estándar y el dedup fallaría. Postgres 15+.
  constraint user_reports_unique unique nulls not distinct (user_id, kind, year, locale)
);

alter table public.user_reports enable row level security;

create policy "own reports select"
  on public.user_reports for select
  using (user_id = auth.uid());

-- Sin políticas de insert/update/delete para anon/authenticated: solo
-- service_role escribe (igual que subscriptions 0005 y reading_cache 0004).
```

- [ ] **Step 2: Aplicar en vivo** vía `mcp__plugin_supabase_supabase__apply_migration` (`project_id: xcilrdpcanielalpfvld`, `name: user_reports`, `query`: el SQL). Verificar con `list_tables` y `get_advisors` (security) que no hay hallazgos nuevos.

- [ ] **Step 3: Tipo a mano en `database.types.ts`** — añadir la entrada `user_reports` en orden alfabético dentro de `Tables` (entre `subscriptions` y ... — verificar orden real; `subscriptions` < `user_reports`), con `Row`/`Insert`/`Update`/`Relationships` siguiendo el estilo de `subscriptions`. Campos: id/user_id/kind/year(nullable)/locale/content(Json)/status/model_used(nullable)/created_at/updated_at.

- [ ] **Step 4: Verificar + commit**

Run: `cd packages/supabase && npx tsc --noEmit -p tsconfig.json` → 0 errores.
```bash
git add supabase/migrations/0006_user_reports.sql packages/supabase/src/database.types.ts
git commit -m "feat(reports): tabla user_reports (aplicada al proyecto remoto)"
```

---

### Task 2: Cascada de proveedores (Hermes + DeepSeek + completeWithCascade)

**Files:**
- Modify: `apps/web/lib/reading/provider.ts`
- Test: `apps/web/lib/reading/__tests__/cascade.test.ts` (nuevo)

**Interfaces:**
- Consumes: la interfaz `ReadingProvider` existente + `CompleteOptions`.
- Produces: `resolveReportCascade(): ReadingProvider[]` (orden Hermes→DeepSeek→OpenAI, filtrado por llave presente; vacío si ninguna); `completeWithCascade(opts: CompleteOptions & { timeoutMs?: number }): Promise<{ text: string; modelUsed: string }>` (intenta cada proveedor; si error o texto vacío, pasa al siguiente; lanza si todos fallan).

- [ ] **Step 1: Adaptadores Hermes y DeepSeek (REST OpenAI-compatible)**

En `provider.ts`, añadir un factory genérico OpenAI-compatible reusando el patrón de `openaiProvider` (fetch a `<baseUrl>/chat/completions`, `response_format: json_object`, `AbortSignal.timeout(timeoutMs)`):

```ts
// Hermes (Nous Portal) y DeepSeek exponen la MISMA forma que OpenAI en
// /chat/completions — un solo factory REST los cubre (Aluna no usa el SDK de
// OpenAI, mantenemos fetch). El timeout es parametrizable porque los informes
// largos necesitan MÁS que los 60s de las lecturas cortas.
function openAICompatibleProvider(
  name: string, baseUrl: string, apiKey: string, model: string, timeoutMs: number,
): ReadingProvider { /* complete() vía fetch; completeStream/chat/chatStream pueden
     delegar a complete() si el informe no los usa — los informes solo llaman complete() */ }

function hermesProvider(apiKey: string, timeoutMs: number): ReadingProvider {
  return openAICompatibleProvider("hermes", "https://api.nousresearch.com/v1", apiKey,
    process.env.NOUS_MODEL || "Hermes-4-70B", timeoutMs);
}
function deepseekProvider(apiKey: string, timeoutMs: number): ReadingProvider {
  return openAICompatibleProvider("deepseek", "https://api.deepseek.com", apiKey,
    process.env.DEEPSEEK_READING_MODEL || "deepseek-chat", timeoutMs);
}
```

Nota implementador: verificar la forma exacta del endpoint DeepSeek/Nous contra su doc si el `fetch` falla en la verificación real; ambos son OpenAI-compatible pero confirmar el path `/chat/completions` y el nombre del campo de tokens.

- [ ] **Step 2: `resolveReportCascade` + `completeWithCascade`** (TDD — test primero)

```ts
// cascade.test.ts (esbozo de casos)
// - resolveReportCascade con NOUS_API_KEY + OPENAI_API_KEY presentes → [hermes, openai]
// - resolveReportCascade sin llaves → []
// - completeWithCascade: primer proveedor OK → devuelve {text, modelUsed:'hermes'}
// - primer proveedor lanza → cae al segundo, modelUsed del segundo
// - primer proveedor devuelve texto vacío → cae al siguiente (vacío = fallo)
// - todos fallan → lanza
// (los proveedores se inyectan como fakes: completeWithCascade recibe la lista de
//  providers como argumento para ser testeable sin env; resolveReportCascade se
//  testea aparte manipulando process.env)
```

`completeWithCascade(providers, opts)` recibe la lista (inyectable) — la ruta la obtiene de `resolveReportCascade()`. Así el test no depende de env.

- [ ] **Step 3: Gate + commit**

Run: `cd apps/web && npx vitest run lib/reading/__tests__/cascade.test.ts && npx tsc --noEmit` → verde.
```bash
git add apps/web/lib/reading/provider.ts apps/web/lib/reading/__tests__/cascade.test.ts
git commit -m "feat(reports): cascada Hermes→DeepSeek→OpenAI para informes (OpenAI-compatible REST)"
```

---

### Task 3: Motor puro de informes — grounding, prompts, parse, types

**Files:**
- Create: `apps/web/lib/reports/types.ts`, `apps/web/lib/reports/grounding.ts`, `apps/web/lib/reports/prompts.ts`, `apps/web/lib/reports/parse.ts`
- Test: `apps/web/lib/reports/__tests__/reports.test.ts` (nuevo)

**Interfaces:**
- Produces:
  - `types.ts`: `NatalReport = { intro, sections: {key,title,body}[], outro }`, `SolarReport = { year, essay, themes: {title,why,invitation}[], mantra }`, `ReportContent = NatalReport | SolarReport`.
  - `grounding.ts`: `gatherNatalGrounding(chart, labels, locale): string` — selecciona posiciones clave (Sol, Luna, Asc, planetas/aspectos relevantes), compone sus lecturas con `composeBodyReading` del corpus existente y devuelve el material fuente como texto para embeber en el prompt.
  - `prompts.ts`: `buildNatalReportPrompt(chart, grounding, labels, locale): { system, prompt, maxTokens }` (pide `{intro, sections[4], outro}` en JSON); `buildSolarReportPrompt(solarChart, natalChart, labels, locale, year): { system, prompt, maxTokens }` (pide `{essay, themes[10], mantra}` en JSON). `maxTokens` acotado (natal ~6000, solar ~4500) para techo de latencia.
  - `parse.ts`: `parseNatalReport(raw): NatalReport` / `parseSolarReport(raw): SolarReport` — parsean+validan la forma (JSON.parse + chequeo de campos y longitudes de array: sections=4, themes=10); lanzan `ReportParseError` claro si viene malformado (la cascada lo trata como fallo del proveedor y reintenta).

- [ ] **Step 1: Tests primero** (formas de prompt correctas por idioma/tipo; grounding reusa composeBodyReading y no inventa; parse acepta bien-formado y lanza ante malformado/array de largo incorrecto). Todo puro, sin red.
- [ ] **Step 2: Implementar los 4 módulos.** Reusar el `SYSTEM` evolutivo-yóguico de `chart-reading/route.ts` como base de la voz (extraerlo o replicar el tono; documentar la decisión). Los prompts piden JSON estructurado explícito.
- [ ] **Step 3: Gate + commit**

```bash
git add apps/web/lib/reports/ apps/web/lib/reports/__tests__/
git commit -m "feat(reports): motor puro — grounding, prompts, parse, types"
```

---

### Task 4: Orquestador `runReportGeneration` (testeable con await directo)

**Files:**
- Create: `apps/web/lib/reports/generate.ts`
- Test: `apps/web/lib/reports/__tests__/generate.test.ts` (nuevo)

**Interfaces:**
- Consumes: `computeChart`/`computeDerivedChart` (server-only, de `@aluna/ephemeris` — OJO: esta pieza es server-only, se importa solo desde la ruta/orquestador, nunca del cliente), `gatherNatalGrounding`/`buildNatalReportPrompt`/`buildSolarReportPrompt`/`parseNatalReport`/`parseSolarReport` (Task 3), `resolveReportCascade`/`completeWithCascade` (Task 2), `createServiceSupabaseClient`.
- Produces: `runReportGeneration(args: { userId, kind, year, locale, birthProfile }): Promise<void>` — computa la carta, arma el prompt, llama la cascada, parsea, y ESCRIBE la fila final (`ready` + content + model_used, o `error`). NO lanza al caller (captura todo y persiste el estado — porque en producción corre dentro de `after()` sin conexión que reciba el throw). Los tests lo llaman con `await` directo (sin `after()`) y assertan el estado escrito en el Supabase mockeado.

- [ ] **Step 1: Tests primero** — con cascada y Supabase mockeados: éxito natal → escribe `ready` + content + `model_used`; éxito solar; cascada lanza (todos fallan) → escribe `error`; parse lanza → reintenta siguiente proveedor (si aplica) y si todos malforman → `error`. Verificar que NUNCA propaga excepción al caller.
- [ ] **Step 2: Implementar.** La carta se computa dentro del orquestador (server-only). El `birthProfile` llega ya resuelto desde la ruta (que lo lee del usuario) — el orquestador no consulta perfiles.
- [ ] **Step 3: Gate + commit**

```bash
git add apps/web/lib/reports/generate.ts apps/web/lib/reports/__tests__/generate.test.ts
git commit -m "feat(reports): orquestador runReportGeneration (persiste ready/error, no lanza)"
```

---

### Task 5: Endpoints — generate, GET, regenerate (gate Plus + after())

**Files:**
- Create: `apps/web/app/api/reports/generate/route.ts`, `apps/web/app/api/reports/route.ts` (GET), `apps/web/app/api/reports/regenerate/route.ts`
- Create: `apps/web/lib/reports/access.ts` (helper compartido de gate)

**Interfaces:**
- `access.ts`: `requirePlus(request): Promise<{ user } | NextResponse>` — corre `authenticateRoute`, lee `subscriptions` con service-role, aplica `isPlusActive`; devuelve el user o una NextResponse (401/403) lista para retornar. Reusado por los 3 endpoints.
- `POST /api/reports/generate`: body `{ kind, year?, locale }`. requirePlus → si cascada vacía `{ available:false }` (sin escribir) → si existe fila `ready` la devuelve → si fila `generating` fresca (updated_at < 150s) → 409 `already_generating` → si `generating` vieja o `error` o inexistente: upsert `generating` (content `{}`), `after(() => runReportGeneration(...))`, responde `{ status:'generating' }`.
- `GET /api/reports?kind=&year=&locale=`: requirePlus → devuelve la fila (RLS propia) o `{ status:'none' }`; si `generating` y vieja (>150s) → `{ status:'error', stale:true }` (no muta desde el GET).
- `POST /api/reports/regenerate`: igual que generate pero fuerza sobreescribir la fila (mismo gate, misma cascada, `after()`).

- [ ] **Step 1: `access.ts` + su test** (401 sin user, 403 sin Plus, pasa con Plus — Supabase mockeado).
- [ ] **Step 2: Las 3 rutas.** `export const runtime = "nodejs";`. `after` de `next/server`. El upsert `generating` es SÍNCRONO antes de `after()` (sin carrera con el primer GET). Errores de Supabase chequeados (fail-closed, patrón del webhook 4a). El `birthProfile` del usuario se lee en la ruta (de `birth_profiles`, el perfil activo) y se pasa al orquestador.
- [ ] **Step 3: Gate + commit**

Run: `cd apps/web && npx tsc --noEmit && npx vitest run`.
```bash
git add apps/web/app/api/reports/ apps/web/lib/reports/access.ts
git commit -m "feat(reports): endpoints generate/GET/regenerate con gate Plus + after()"
```

---

### Task 6: Vista mínima de verificación `/informe`

**Files:**
- Create: `apps/web/app/(app)/informe/page.tsx`, `apps/web/app/(app)/informe/informe-view.tsx`, `apps/web/app/(app)/informe/informe.module.css`

**Interfaces:**
- Consumes: los endpoints de Task 5.
- Produces: una página bajo el shell autenticado que lista los informes del usuario (natal + solar del año actual), con botón Generar/Regenerar por tipo y un botón "Actualizar" manual (NO auto-poll — eso es de la UI de lujo). Renderiza el `content` en crudo (secciones/temas como texto plano legible). Estados: sin Plus → tease "esto es Plus"; generating → "Generando… toca Actualizar en un momento"; ready → el texto; error → botón Reintentar; available:false → nota "el oráculo aún duerme" (como las lecturas latentes).

- [ ] **Step 1: page.tsx (server) + informe-view.tsx (client).** Estilo mínimo con los tokens de R2 (usa la escala/vars, no inventa) — es vista de verificación, no de lujo. Sin entrada en la nav (se llega por URL directa; la nav de lujo es fase posterior).
- [ ] **Step 2: Gate pesado + commit**

Run: `cd apps/web && npx tsc --noEmit && npx vitest run && rm -rf .next && npx next build` → verde.
```bash
git add "apps/web/app/(app)/informe/"
git commit -m "feat(reports): vista mínima /informe (verificación, no UI de lujo)"
```

---

### Task 7: Verificación integral (la hace el controller — Fase 5 de build-fable-g)

- [ ] **Step 1:** `npx pnpm -w exec turbo run typecheck test` verde; `next build` verde.
- [ ] **Step 2:** `get_advisors` (security) sobre `user_reports` = sin hallazgos nuevos.
- [ ] **Step 3: Loop real (endpoints ejecutados de verdad):** con cuenta de prueba + Plus simulado por SQL (insert en `subscriptions` status active): `GET /api/reports` sin fila → `{status:none}`; sin Plus → 403; `POST /generate` sin llaves de IA → `{available:false}` sin escribir. Si Gio dejó una llave (Nous/DeepSeek/OpenAI): generar un natal y un solar, ver `generating`, actualizar hasta `ready`, confirmar `content` + `model_used` correctos, y que un segundo `/generate` inmediato devuelve la fila `ready` sin gastar. Si no hay llave, documentar el bloqueo (patrón 4a) — todo lo demás verificado. Limpiar datos de prueba.
- [ ] **Step 4:** Merge a main + push + memoria.

---

## Self-Review

- **Cobertura del spec:** §3A→T2, §3B→T3+T4, §3C/§4→T1, §5→T5+T6, §6 (gate+concurrencia)→T5 (requirePlus + generating guard + staleness), §8→tests de T2-T5 + T7 (vivo). Los dos hallazgos del panel (NULLS NOT DISTINCT, timeout de cascada propio no atado al request.signal) están en Global Constraints + T1/T2.
- **Placeholders:** las dos incógnitas reales (forma exacta del endpoint DeepSeek/Nous; latencia real → afinar maxTokens/timeout) están marcadas con instrucción de verificar en vivo (T2 nota + T7 loop), no como "TBD".
- **Type consistency:** `ReadingProvider`/`CompleteOptions` reusados (T2); `NatalReport`/`SolarReport`/`ReportContent` (T3) usados en parse/orquestador/vista; `Tables<"user_reports">` (T1) en orquestador/rutas; `resolveReportCascade`/`completeWithCascade` (T2) en el orquestador (T4).
