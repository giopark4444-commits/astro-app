import { NextResponse } from "next/server";
import { after } from "next/server";
import { createServiceSupabaseClient } from "@aluna/supabase/server";
import type { ChartResult } from "@aluna/core";
import { computeChart, computeDerivedChart } from "@aluna/ephemeris";
import { profileToChartInput, type ChartProfileFields } from "@/lib/chart";
import { resolveReportCascade } from "@/lib/reading/provider";
import { runReportGeneration } from "@/lib/reports/generate";
import type { PlusGateOk } from "@/lib/reports/access";

// Lógica compartida por /generate y /regenerate: valida el cuerpo, comprueba la
// cascada, lee el perfil, computa las cartas (server-only), deja la fila en
// 'generating' de forma SÍNCRONA y dispara la generación en background con
// after(). La única diferencia entre ambas rutas es si respetan una fila
// 'ready' ya existente (generate sí; regenerate la sobreescribe siempre).

const STALE_MS = 150_000; // una fila 'generating' más vieja que esto = proceso muerto

export interface ReportRequestBody {
  profileId: string;
  kind: "natal" | "solar_return";
  year: number | null;
  locale: "es" | "en";
}

/** Valida y normaliza el cuerpo, o devuelve null si es inválido. */
export function parseReportBody(raw: unknown): ReportRequestBody | null {
  const body = (raw ?? {}) as Record<string, unknown>;
  const profileId = typeof body.profileId === "string" ? body.profileId : "";
  const kind = body.kind === "natal" || body.kind === "solar_return" ? body.kind : null;
  const locale = body.locale === "es" || body.locale === "en" ? body.locale : null;
  if (!profileId || !kind || !locale) return null;
  let year: number | null = null;
  if (kind === "solar_return") {
    if (typeof body.year !== "number" || !Number.isInteger(body.year)) return null;
    year = body.year;
  } else if (typeof body.year === "number" && Number.isInteger(body.year)) {
    year = body.year; // ignorado en la práctica para natal, pero se acepta
  }
  // Natal siempre usa year null (permanente), aunque el cuerpo mande uno.
  if (kind === "natal") year = null;
  return { profileId, kind, year, locale };
}

function serviceClient() {
  return createServiceSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

type ServiceClient = ReturnType<typeof serviceClient>;

/**
 * Cuerpo común de generate/regenerate. `respectReady` = generate (true) vs
 * regenerate (false). Devuelve la NextResponse a retornar.
 */
export async function handleReportRequest(
  gate: PlusGateOk,
  body: ReportRequestBody,
  respectReady: boolean,
): Promise<NextResponse> {
  // Sin llaves de proveedor → latente, cero gasto, no se ensucia el estado.
  const cascade = resolveReportCascade();
  if (cascade.length === 0) return NextResponse.json({ available: false });

  // Perfil por RLS (el select del usuario ya limita al dueño).
  const { data: profileRaw } = await gate.supabase
    .from("birth_profiles")
    .select("birth_date, birth_time, time_known, latitude, longitude, time_zone")
    .eq("id", body.profileId)
    .maybeSingle();
  const profile = profileRaw as ChartProfileFields | null;
  if (!profile) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const service = serviceClient();

  // Fila existente (con service-role; own-row igual por el filtro por user_id).
  const existing = await selectReport(service, gate.user.id, body);
  if (existing) {
    if (respectReady && existing.status === "ready") {
      return NextResponse.json({
        status: "ready",
        content: existing.content,
        model_used: existing.model_used,
      });
    }
    if (
      existing.status === "generating" &&
      Date.now() - new Date(existing.updated_at).getTime() < STALE_MS
    ) {
      return NextResponse.json({ error: "already_generating" }, { status: 409 });
    }
  }

  // Cómputo server-only de las cartas.
  const input = profileToChartInput(profile);
  const natalChart: ChartResult = computeChart(input);
  let solarChart: ChartResult | undefined;
  if (body.kind === "solar_return") {
    // El año se ancla a su mediodía de julio: el motor busca el regreso del Sol
    // a su longitud natal alrededor de esa fecha, quedando dentro del año pedido.
    const anchorIso = `${body.year}-07-01T00:00:00Z`;
    solarChart = computeDerivedChart(input, "solar_return", anchorIso);
  }

  // Marca 'generating' SÍNCRONO (antes de after) para que no haya carrera con el
  // primer GET. Fail-closed: si el upsert falla, no disparamos generación.
  const upsertError = await upsertGenerating(service, gate.user.id, body);
  if (upsertError) {
    console.error("[reports] upsert generating falló:", upsertError);
    return NextResponse.json({ error: "write_failed" }, { status: 500 });
  }

  after(() =>
    runReportGeneration({
      supabase: service,
      userId: gate.user.id,
      kind: body.kind,
      year: body.year,
      locale: body.locale,
      natalChart,
      // solarChart solo se incluye si existe (exactOptionalPropertyTypes).
      ...(solarChart ? { solarChart } : {}),
      providers: cascade,
    }),
  );

  return NextResponse.json({ status: "generating" });
}

interface ReportRow {
  status: string;
  content: unknown;
  model_used: string | null;
  updated_at: string;
}

/** Lee la fila (user_id, kind, year, locale) — .is para year null, .eq para número. */
export async function selectReport(
  service: ServiceClient,
  userId: string,
  body: Pick<ReportRequestBody, "kind" | "year" | "locale">,
): Promise<ReportRow | null> {
  let q = service
    .from("user_reports")
    .select("status, content, model_used, updated_at")
    .eq("user_id", userId)
    .eq("kind", body.kind)
    .eq("locale", body.locale);
  q = body.year === null ? q.is("year", null) : q.eq("year", body.year);
  const { data } = await q.maybeSingle();
  return (data as ReportRow | null) ?? null;
}

async function upsertGenerating(
  service: ServiceClient,
  userId: string,
  body: ReportRequestBody,
): Promise<string | null> {
  const row = {
    user_id: userId,
    kind: body.kind,
    year: body.year,
    locale: body.locale,
    content: {},
    status: "generating",
    model_used: null,
    updated_at: new Date().toISOString(),
  };
  const { error } = await service
    .from("user_reports")
    // onConflict cubre la clave única (nulls not distinct incluye el caso natal).
    .upsert(row as never, { onConflict: "user_id,kind,year,locale" });
  return error ? error.message : null;
}
