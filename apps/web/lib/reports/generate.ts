// apps/web/lib/reports/generate.ts
// Orquestador de generación de informes evolutivos (Fase 4b): arma el prompt
// según `kind`, llama la cascada de proveedores, parsea la respuesta y
// persiste el resultado final en `user_reports` (ready+content+model_used, o
// error). NUNCA lanza al caller: en producción corre dentro de `after()` de
// Next.js (fire-and-forget tras la respuesta HTTP), que no tiene conexión que
// reciba un throw — todo error se atrapa y se convierte en `status:'error'`
// en la fila.
//
// DISEÑO (ajuste sobre el plan original): recibe las cartas YA COMPUTADAS
// (`natalChart`/`solarChart`) en vez de computarlas él mismo. Así este módulo
// NO importa `@aluna/ephemeris` (el motor nativo sweph, server-only) y queda
// trivial de testear en vitest sin arrastrar ese binding nativo — la ruta
// (Task 5) es quien computa las cartas y se las inyecta.

import type { ChartResult } from "@aluna/core";
import type { AlunaSupabaseClient, Json, TablesUpdate } from "@aluna/supabase";
import { resolveReportCascade, completeWithCascade, type ReadingProvider } from "../reading/provider";
import { gatherNatalGrounding } from "./grounding";
import { buildNatalReportPrompt, buildSolarReportPrompt, type ReportPromptSpec } from "./prompts";
import { parseNatalReport, parseSolarReport } from "./parse";
import { astroLabels } from "../content/astrology-labels";
import type { NatalReport, SolarReport } from "./types";

export interface RunReportArgs {
  /** Cliente service-role, ya construido e inyectado por la ruta (fake en tests). */
  supabase: AlunaSupabaseClient;
  userId: string;
  kind: "natal" | "solar_return";
  /** NULL para el informe natal (permanente); año del giro para solar_return. */
  year: number | null;
  locale: "es" | "en";
  natalChart: ChartResult;
  /** Requerida cuando kind='solar_return'; ignorada para 'natal'. */
  solarChart?: ChartResult;
  /** Inyectable para tests; en producción, `resolveReportCascade()`. */
  providers?: ReadingProvider[];
}

type ReportContent = NatalReport | SolarReport;

/** kind='solar_return' exige year no-nulo (es el año del giro solar); si
 *  llega null es un error del llamador, no un caso silencioso a rellenar con
 *  "el año actual". Se lanza para que el catch de arriba lo convierta en
 *  status:'error' explícito en vez de generar un informe para un año que
 *  nadie pidió. */
function requireYear(year: number | null): number {
  if (year === null) {
    throw new Error("runReportGeneration: kind='solar_return' requiere year (no puede ser null)");
  }
  return year;
}

/** Arma el prompt (system+prompt+maxTokens) según el tipo de informe. */
function buildPrompt(args: RunReportArgs): ReportPromptSpec {
  const labels = astroLabels(args.locale);

  if (args.kind === "natal") {
    const grounding = gatherNatalGrounding(args.natalChart, labels, args.locale);
    return buildNatalReportPrompt(args.natalChart, grounding, labels, args.locale);
  }

  if (!args.solarChart) {
    throw new Error("runReportGeneration: kind='solar_return' requiere solarChart");
  }
  return buildSolarReportPrompt(args.solarChart, args.natalChart, labels, args.locale, requireYear(args.year));
}

/** Parsea el texto crudo del modelo según el tipo de informe. Lanza
 *  `ReportParseError` si la forma no calza (la cascada ya validó texto no
 *  vacío, pero no que sea el JSON esperado). */
function parseContent(kind: RunReportArgs["kind"], year: number | null, raw: string): ReportContent {
  return kind === "natal" ? parseNatalReport(raw) : parseSolarReport(raw, requireYear(year));
}

/**
 * Actualiza la fila `user_reports` ya existente (la crea la ruta en estado
 * 'generating' antes de disparar la generación) a su estado final. El match
 * es (user_id, kind, year, locale) — el mismo que la constraint única de la
 * migración 0006. `year` necesita trato especial: Postgrest traduce
 * `.eq("year", null)` a `year = null`, que en SQL NUNCA matchea (NULL no es
 * igual a NULL) — el caso natal (year NULL) necesita `.is("year", null)`.
 *
 * Nunca lanza: si Supabase devuelve error, o si algo revienta al armar/enviar
 * la query (p.ej. `supabase.from` lanzando en un cliente fake/roto), se deja
 * constancia con `console.error` y se vuelve sin propagar — es la última red
 * de seguridad de un orquestador que corre sin caller que reciba el throw.
 */
async function writeStatus(
  supabase: AlunaSupabaseClient,
  match: { userId: string; kind: RunReportArgs["kind"]; year: number | null; locale: RunReportArgs["locale"] },
  patch: { status: "ready" | "error"; content?: ReportContent; modelUsed?: string },
): Promise<void> {
  try {
    const payload: TablesUpdate<"user_reports"> = {
      status: patch.status,
      updated_at: new Date().toISOString(),
    };
    if (patch.content !== undefined) payload.content = patch.content as unknown as Json;
    if (patch.modelUsed !== undefined) payload.model_used = patch.modelUsed;

    const filtered = supabase
      .from("user_reports")
      .update(payload)
      .eq("user_id", match.userId)
      .eq("kind", match.kind)
      .eq("locale", match.locale);

    const { error } = match.year === null ? await filtered.is("year", null) : await filtered.eq("year", match.year);

    if (error) {
      console.error(
        `[reports] no se pudo actualizar user_reports a status=${patch.status} ` +
          `(user=${match.userId} kind=${match.kind} year=${match.year ?? "null"} locale=${match.locale}):`,
        error.message,
      );
    }
  } catch (err) {
    console.error(
      `[reports] excepción al escribir user_reports (user=${match.userId} kind=${match.kind} ` +
        `year=${match.year ?? "null"} locale=${match.locale}):`,
      err,
    );
  }
}

/**
 * Genera un informe evolutivo (natal o solar) y persiste el resultado final.
 * NUNCA lanza al caller: en producción corre dentro de `after()`, sin
 * conexión que reciba un throw. Todo el trabajo (armar prompt, llamar la
 * cascada, parsear) va envuelto en try/catch — cualquier fallo cae a
 * `status:'error'`.
 */
export async function runReportGeneration(args: RunReportArgs): Promise<void> {
  const match = { userId: args.userId, kind: args.kind, year: args.year, locale: args.locale };

  try {
    const spec = buildPrompt(args);
    const cascade = args.providers ?? resolveReportCascade();
    const { text, modelUsed } = await completeWithCascade(cascade, {
      system: spec.system,
      prompt: spec.prompt,
      maxTokens: spec.maxTokens,
    });
    const content = parseContent(args.kind, args.year, text);

    await writeStatus(args.supabase, match, { status: "ready", content, modelUsed });
  } catch (err) {
    console.error(
      `[reports] generación fallida (user=${args.userId} kind=${args.kind} ` +
        `year=${args.year ?? "null"} locale=${args.locale}):`,
      err,
    );
    await writeStatus(args.supabase, match, { status: "error" });
  }
}
