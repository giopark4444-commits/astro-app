import { NextResponse, type NextRequest } from "next/server";
import { createServiceSupabaseClient } from "@aluna/supabase/server";
import { requirePlus, isGateResponse } from "@/lib/reports/access";
import { selectReport } from "@/lib/reports/request";

// Lee el informe guardado del usuario. NO genera ni gasta — solo devuelve el
// estado actual de la fila. Una fila 'generating' vieja (proceso muerto) se
// reporta como 'error' + stale (sin mutar desde una ruta de lectura); el
// usuario la recupera con /regenerate.

export const runtime = "nodejs";

const STALE_MS = 150_000;

export async function GET(request: NextRequest) {
  const gate = await requirePlus(request);
  if (isGateResponse(gate)) return gate;

  const url = new URL(request.url);
  const kind = url.searchParams.get("kind");
  const locale = url.searchParams.get("locale");
  const yearParam = url.searchParams.get("year");
  if ((kind !== "natal" && kind !== "solar_return") || (locale !== "es" && locale !== "en")) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  let year: number | null = null;
  if (kind === "solar_return") {
    const n = Number(yearParam);
    if (!yearParam || !Number.isInteger(n)) {
      return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }
    year = n;
  }

  const service = createServiceSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const row = await selectReport(service, gate.user.id, { kind, year, locale });
  if (!row) return NextResponse.json({ status: "none" });

  if (
    row.status === "generating" &&
    Date.now() - new Date(row.updated_at).getTime() >= STALE_MS
  ) {
    return NextResponse.json({ status: "error", stale: true });
  }
  return NextResponse.json({ status: row.status, content: row.content, model_used: row.model_used });
}
