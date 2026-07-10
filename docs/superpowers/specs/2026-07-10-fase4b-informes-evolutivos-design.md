# Fase 4b — Informes evolutivos completos — Diseño

**Fecha:** 2026-07-10 · **Estado:** aprobado por Gio (brainstorming en sesión)
**Alcance:** segunda de 4 sub-fases de la Fase 4 (monetización) de Aluna. 4a (infraestructura de
cobro Dodo) ya está en main. Esta sub-fase construye el MOTOR de los informes evolutivos premium
(datos + generación IA + gate Plus + endpoints), con una vista mínima de verificación. La
experiencia de lectura de lujo, el móvil y el PDF son fases posteriores.

## 1. Punto de partida (qué ya existe y se reusa)

- **Proveedor de IA intercambiable** (`apps/web/lib/reading/provider.ts`): agnóstico —
  la ruta arma el `system` + `prompt` (la voz), el proveedor solo "llama al modelo y devuelve
  texto". Hoy cablea Anthropic (SDK) + OpenAI/Gemini (REST). Interfaz `complete()` +
  `completeStream()`. Se elige por env var (el primero con llave presente).
- **Caché durable de lecturas** (`reading_cache` en Supabase + `@aluna/compute`) — para el
  contenido UNIVERSAL (lecturas por-posición, iguales para todos). Los informes de 4b son
  POR-USUARIO, así que NO usan esta caché; usan una tabla propia.
- **Corpus escrito a mano** (`apps/web/lib/content/`): `astrology-readings-es/en.ts`
  (composeBodyReading: essence/flow/shadow por posición), labels, numerología. Voz
  evolutivo-yóguica ya definida en el `SYSTEM` de `chart-reading/route.ts`.
- **Motor de cartas**: `computeChart` (natal) y `computeDerivedChart(natal, "solar_return")`
  (Revolución Solar del año, ya validado — Sol vuelve a su longitud natal). Server-only.
- **Cobro (4a)**: tabla `subscriptions` + `isPlusActive(row, now?)` puro en `@aluna/core` +
  `authenticateRoute` (Bearer/cookie). El gate de 4b se apoya en esto.

## 2. Decisiones (tomadas en este brainstorming)

| Tema | Decisión |
|---|---|
| Forma del informe natal | **Híbrido**: secciones (reusan/extienden las lecturas por-posición existentes) + una intro y un cierre que la IA escribe leyendo el conjunto, para que se sienta un documento, no una lista. |
| Forma del informe Rev. Solar | **Narrativa + 10 temas + mantra**: ensayo del clima del año, luego los 10 temas a trabajar (título + porqué astrológico + invitación concreta), y el mantra personalizado como sello final. |
| Persistencia | **Generar una vez, guardar, permitir regenerar a voluntad**. El informe es un objeto que el usuario posee; "regenerar" sobreescribe. |
| Gate de acceso | **4b ya chequea `isPlusActive` (Plus) ANTES de gastar en IA**. Sin Plus → 403, cero costo. 4d después unifica el paywall de toda la app. |
| Plataforma | **Motor + API ahora, UI de lujo después**. Vista mínima para verificar end-to-end. Móvil = fase aparte. |
| Proveedor de IA | **Cascada Hermes (Nous Portal) → DeepSeek → OpenAI**. Hermes por defecto (~100x más barato, IA de cabecera de Gio, mismo patrón que Vantage Studio); si falla, DeepSeek; si falla, OpenAI. Se registra quién respondió. |

## 3. Arquitectura

Tres piezas nuevas server-only en `apps/web` + una extensión del proveedor.

**A) Cascada de proveedores** — extender `lib/reading/provider.ts`:
- Sumar adaptador **Hermes/Nous Portal** (REST; endpoint + `NOUS_API_KEY`) y **DeepSeek**
  (REST, API compatible con OpenAI; `DEEPSEEK_API_KEY`). OpenAI ya existe.
- Nueva función `resolveReportProvider()` que devuelve una **cascada ordenada**
  [Hermes, DeepSeek, OpenAI] filtrada por llaves presentes. Un helper `completeWithCascade(opts)`
  intenta el primero; ante error/respuesta vacía o malformada, pasa al siguiente; devuelve
  `{ text, modelUsed }` o lanza si todos fallan. Si la cascada está vacía (ninguna llave) →
  el motor responde `available: false`, sin gastar.
- No se toca el camino existente de `chart-reading`/`reading`/`chat` (siguen con
  `resolveReadingProvider`); la cascada es una API nueva y paralela para los informes.

**B) Motor de informes** — `apps/web/lib/reports/`:
- `grounding.ts` (puro): `gatherNatalGrounding(chart, labels, locale)` selecciona las
  posiciones clave (Sol, Luna, Asc, planetas/aspectos relevantes) y compone sus lecturas
  por-posición con `composeBodyReading` — devuelve el material fuente (essence/flow/shadow de cada
  una) que ancla la generación. Así el informe REUSA el corpus escrito a mano en vez de
  inventarlo, y queda coherente con las lecturas por-posición que el usuario ya ve.
- `prompts.ts` (puro): `buildNatalReportPrompt(chart, grounding, labels, locale)` produce **un**
  prompt estructurado que pide el informe completo de una sola generación —
  `{ intro, sections[4], outro }` — con el grounding embebido como material a tejer;
  `buildSolarReturnPrompt(solarChart, natalChart, labels, locale, year)` produce el prompt de
  `{ essay, themes[10], mantra }`. Testeable sin red.
- `parse.ts` (puro): `parseNatalReport(rawText)` / `parseSolarReport(rawText)` validan y
  estructuran la respuesta del modelo en la forma de §4 (el modelo responde JSON estructurado; el
  parse valida forma y campos, con fallo claro si viene malformado — la cascada reintenta ante
  eso). `types.ts`: la forma de `content`. Estos módulos NO tocan Supabase ni red; la ruta
  orquesta (grounding → prompt → cascada → parse → guardar).

**C) Capa de datos** — tabla `user_reports` (migración `0006_user_reports.sql`):

```sql
create table public.user_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles_user(id) on delete cascade,
  kind text not null check (kind in ('natal', 'solar_return')),
  year int,                    -- null para natal (permanente); el año para Rev. Solar
  locale text not null check (locale in ('es', 'en')),
  content jsonb not null,      -- el informe estructurado (ver §4)
  status text not null check (status in ('generating', 'ready', 'error')),
  model_used text,             -- hermes | deepseek | openai (trazabilidad de costo)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, kind, year, locale)
);
alter table public.user_reports enable row level security;
create policy "own reports select" on public.user_reports for select using (user_id = auth.uid());
-- sin políticas de escritura para anon/authenticated: solo el service-role escribe (igual que subscriptions/reading_cache)
```

Un informe por `(user_id, kind, year, locale)` — "regenerar" hace upsert sobre esa fila.
`status: generating` evita doble-generación ante taps repetidos. Tipo a mano en
`database.types.ts` (el proyecto no regenera tipos automáticamente).

## 4. Forma del contenido (`content` jsonb)

**Natal** (`kind: 'natal'`) — una sola generación estructurada, anclada en el grounding:
```
{
  intro: string,          // hilo de apertura
  sections: [
    { key: 'esencia',    title, body },   // Sol/Asc
    { key: 'emocional',  title, body },   // Luna
    { key: 'camino',     title, body },   // dones (planetas/aspectos favorables)
    { key: 'retos',      title, body },   // sombra a integrar
  ],
  outro: string           // cierre
}
```
Las 4 secciones son TEMÁTICAS (no una por planeta): cada una teje las posiciones relevantes de su
tema usando el grounding (`composeBodyReading`) como material fuente, en una sola generación que
también produce intro y outro — así el documento es cohesivo y el modelo ve el conjunto de una vez.

**Solar Return** (`kind: 'solar_return'`):
```
{
  year: int,
  essay: string,          // clima del año
  themes: [ { title, why, invitation } ] × 10,   // los 10 temas a trabajar
  mantra: string          // sello final
}
```

## 5. Endpoints

Todos server-only, runtime nodejs, con `authenticateRoute` (Bearer o cookie) PRIMERO y gate
`isPlusActive` DESPUÉS (leyendo `subscriptions` con service-role por el `user_id` de la sesión).

- `POST /api/reports/generate` — body `{ kind, year?, locale }`. 401 sin auth; **403
  `{ error: "plus_required" }` sin Plus** (cero gasto de IA); si existe fila `ready` para esa
  combinación → la devuelve; si no → upsert `generating`, genera por la cascada, guarda `ready`
  (o `error` + 502 si toda la cascada falla). Si la cascada está vacía (sin llaves) →
  `{ available: false }`, sin escribir `error`.
- `GET /api/reports?kind=&year=&locale=` — devuelve el informe guardado (RLS, propio) o
  `{ status: "none" }`.
- `POST /api/reports/regenerate` — igual que generate pero fuerza sobreescribir (mismo gate).
- **Vista mínima** `/informe` (server component + client): lista los informes del usuario y
  renderiza el `content` en crudo (secciones/temas como texto) + botones Generar/Regenerar por
  tipo. NO es la UI de lujo — es para verificar el motor end-to-end en el navegador.

Bilingüe ES/EN (constraint del proyecto): el `locale` viaja en cada request y se persiste en la
fila; los prompts tienen su variante por idioma como el resto del corpus.

## 6. Seguridad y costo

- El gate `isPlusActive` corre ANTES de cualquier llamada de IA — un no-Plus jamás dispara
  gasto. El `user_id` sale SIEMPRE de la sesión verificada, nunca del body (mismo principio que
  4a/`/api/chart`).
- La cascada arranca por Hermes (~100x más barato); el `model_used` deja rastro de qué proveedor
  gastó, para vigilar costo real.
- `status: generating` + el unique constraint evitan que dos requests concurrentes del mismo
  usuario generen dos veces.

## 7. Fuera de alcance (explícito)

- Experiencia de lectura de lujo (web) — fase visual aparte (probablemente encaja con el
  rediseño, tras R2).
- Vista móvil del informe — fase aparte (reusa el mismo endpoint por API; regla "el móvil nunca
  vende" intacta: el móvil solo LEE informes ya generados/pagados).
- Exportar a PDF — 4c.
- Paywall unificado de toda la app + tope de 1 perfil gratis + gating de las lecturas
  por-posición — 4d.
- Streaming del informe (efecto máquina de escribir) — los informes se generan en background y
  se guardan; se leen ya completos. El streaming no aporta a un objeto persistido.

## 8. Testing

- **Puro (sin red):** `gatherNatalGrounding` (selecciona posiciones clave y compone su corpus);
  `buildNatalReportPrompt`/`buildSolarReturnPrompt` (arman el prompt correcto por tipo/idioma/
  carta, con el grounding embebido); `parseNatalReport`/`parseSolarReport` (validan la estructura
  de §4, fallan claro ante respuesta malformada); `completeWithCascade` con proveedores mockeados
  (salta al siguiente al fallar, registra `modelUsed`, lanza si todos fallan, respeta cascada
  vacía).
- **Integración liviana:** las rutas con el proveedor y Supabase mockeados (gate Plus 403,
  auth 401, devolver-guardado vs generar, regenerar sobreescribe).
- **Verificación en vivo (loop real de build-fable-g):** con una suscripción Plus simulada por
  SQL y al menos una llave de proveedor, generar un informe natal y uno de Rev. Solar de una
  cuenta de prueba, confirmar que se guardan y se leen, que sin Plus da 403, y que sin llaves da
  `available:false`. Si Gio no ha puesto llaves, se documenta el bloqueo (como en 4a).

## 9. Pendiente de Gio (para encender, no para construir)

Llaves en `apps/web/.env.local`: `NOUS_API_KEY` (Hermes/Nous Portal) y opcionalmente
`DEEPSEEK_API_KEY` / `OPENAI_API_KEY` para el respaldo. Sin ninguna, el motor queda latente
(cero costo); todo lo demás (datos, gate, endpoints, vista) verificable. La suscripción Plus de
prueba se simula por SQL para verificar el gate.

## 10. Proceso de construcción

Diseño en esta sesión (brainstorming). Construcción con **build-fable-g**: panel de enfoques de
implementación + subagentes (Sonnet) con review adversarial por tarea + review final de rama en
el modelo más capaz + loop de verificación real (ejecutar los endpoints, no solo tests verdes).
Siguiente paso: writing-plans → plan de tareas TDD.
