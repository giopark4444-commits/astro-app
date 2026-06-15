import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { computeChart, setEphePath } from "@aluna/ephemeris";
import { synastryReport } from "@aluna/core";
import { createClient } from "@/lib/supabase/server";
import { profileToChartInput, type ChartProfileFields } from "@/lib/chart";

// Sinastría / Compatibilidad: compara dos perfiles del MISMO usuario. Server-only
// (motor nativo sweph), runtime Node. AMBOS profileId se VALIDAN contra
// birth_profiles del usuario autenticado (RLS); nunca se confía en lat/lng del
// body. La carta se computa a partir de los datos del perfil validado.

export const runtime = "nodejs";

// Como en /api/chart: bajo el bundler de Next, import.meta.url del motor no
// resuelve a una ruta de archivo. Fijamos la carpeta de efemérides (.se1) en
// runtime, relativa al cwd del server (apps/web → ../../packages/ephemeris/ephe).
setEphePath(path.join(process.cwd(), "..", "..", "packages", "ephemeris", "ephe"));

const PROFILE_FIELDS = "birth_date, birth_time, time_known, latitude, longitude, time_zone";

export async function POST(request: NextRequest) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const body = (raw ?? {}) as Record<string, unknown>;
  const profileIdA = String(body.profileIdA ?? "");
  const profileIdB = String(body.profileIdB ?? "");
  if (!profileIdA || !profileIdB || profileIdA === profileIdB) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // RLS limita el SELECT al dueño: si vuelven ambas filas, los dos perfiles son
  // de este usuario. Un solo SELECT con .in() y se valida que vengan los dos ids.
  const { data: rows } = await supabase
    .from("birth_profiles")
    .select(`id, ${PROFILE_FIELDS}`)
    .in("id", [profileIdA, profileIdB]);
  const list = (rows ?? []) as Array<ChartProfileFields & { id: string }>;
  const profA = list.find((p) => p.id === profileIdA);
  const profB = list.find((p) => p.id === profileIdB);
  if (!profA || !profB) return NextResponse.json({ error: "not_found" }, { status: 404 });

  try {
    // Tomamos los ids de los perfiles VALIDADOS, nunca del body crudo.
    const chartA = computeChart(profileToChartInput(profA));
    const chartB = computeChart(profileToChartInput(profB));
    const report = synastryReport(chartA.bodies, chartB.bodies);
    return NextResponse.json({
      overall: report.overall,
      tone: report.tone,
      themes: report.themes,
      aspects: report.aspects,
    });
  } catch {
    return NextResponse.json({ error: "compute" }, { status: 500 });
  }
}
