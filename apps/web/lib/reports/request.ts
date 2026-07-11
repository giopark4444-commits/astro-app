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
// cascada, lee el perfil, hace un CLAIM ATÓMICO de la generación (función
// Postgres con row lock — ver claim_report_generation en
// supabase/migrations/0007_claim_report_generation.sql), computa las cartas
// (server-only) y dispara la generación en background con after(). La única
// diferencia entre ambas rutas es si respetan una fila 'ready' ya existente
// (generate sí; regenerate la sobreescribe siempre).

// una fila 'generating' más vieja que esto = proceso muerto. Compartida entre
// el GET (app/api/reports/route.ts, decide si reportar 'error'+stale) y el
// claim atómico (p_stale_seconds, ver abajo) para que ambos usen el mismo umbral.
export const STALE_MS = 150_000;

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

  // Claim atómico (evita la carrera doble-tap): una sola transacción con row
  // lock decide si esta request debe generar, si ya hay un informe listo, o si
  // hay otra generación en curso. Antes esto era "leer estado (selectReport) →
  // upsert generating" en 2 viajes sin lock: dos requests concurrentes del
  // mismo usuario (doble-tap) podían ambas pasar la guarda y ambas disparar
  // after(runReportGeneration) = dos generaciones de IA pagadas para el mismo
  // informe. La constraint unique de user_reports evita filas duplicadas, NO
  // generaciones duplicadas — de ahí el claim en Postgres con `for update`.
  const { data: claim, error: claimError } = await service.rpc("claim_report_generation", {
    p_user_id: gate.user.id,
    p_kind: body.kind,
    p_year: body.year,
    p_locale: body.locale,
    p_stale_seconds: STALE_MS / 1000,
    p_respect_ready: respectReady,
  });
  if (claimError) {
    console.error("[reports] claim falló:", claimError.message);
    return NextResponse.json({ error: "write_failed" }, { status: 500 });
  }
  if (claim === "ready") {
    const row = await selectReport(service, gate.user.id, body); // fila terminal, sin carrera
    return NextResponse.json({ status: "ready", content: row?.content, model_used: row?.model_used });
  }
  if (claim === "generating") return NextResponse.json({ error: "already_generating" }, { status: 409 });
  // claim === "claimed": la función YA dejó la fila en 'generating' dentro de
  // su propia transacción. Ahora sí computamos las cartas y disparamos after().

  // Cómputo server-only de las cartas. Igual que /api/chart/route.ts: si el
  // motor revienta (fecha/hora fuera de rango, efemérides faltantes, etc.), no
  // dejamos que el 500 sin capturar tumbe la request — respondemos {error:
  // "compute"} 500. La fila queda en 'generating'; se recupera sola como
  // "stale" pasado STALE_MS (mismo mecanismo que un proceso muerto).
  let natalChart: ChartResult;
  let solarChart: ChartResult | undefined;
  try {
    const input = profileToChartInput(profile);
    natalChart = computeChart(input);
    if (body.kind === "solar_return") {
      // El año se ancla a la medianoche UTC del 1 de julio: el motor busca el
      // regreso del Sol a su longitud natal alrededor de esa fecha, quedando
      // dentro del año pedido.
      const anchorIso = `${body.year}-07-01T00:00:00Z`;
      solarChart = computeDerivedChart(input, "solar_return", anchorIso);
    }
  } catch (err) {
    console.error("[reports] cómputo de carta falló:", err);
    return NextResponse.json({ error: "compute" }, { status: 500 });
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

/**
 * Lee la fila (user_id, kind, year, locale) — .is para year null, .eq para
 * número. Fail-closed ante error de Supabase: NO lo confunde silenciosamente
 * con "no hay fila" — lo loguea antes de devolver null. Sigue devolviendo null
 * en ambos casos (fila inexistente o error de lectura) porque ninguno de los
 * dos llamadores actuales gatea gasto de IA aquí: el guard anti-doble-
 * generación vive en claim_report_generation() (ver handleReportRequest, que
 * ya NO depende de selectReport para decidir ready/409/claimed). GET
 * (app/api/reports/route.ts) y la rama 'ready' de handleReportRequest solo
 * LEEN para mostrar el contenido de una fila cuyo estado terminal ya decidió
 * la función atómica, así que un error de lectura aquí degrada a "no
 * disponible" en vez de un 500 — pero queda logueado para diagnóstico.
 */
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
  const { data, error } = await q.maybeSingle();
  if (error) {
    console.error("[reports] selectReport falló:", error.message);
    return null;
  }
  return (data as ReportRow | null) ?? null;
}
