import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { setEphePath } from "@aluna/ephemeris";
import { HORIZONS, type ChartInput, type Horizon } from "@aluna/core";
import { authenticateRoute } from "@/lib/supabase/route-auth";
import { profileToChartInput } from "@/lib/chart";
import { resolveHorizonDate } from "@/lib/manifestations/horizon";
import type { Tables, TablesInsert } from "@aluna/supabase";

// CRUD de manifestaciones. user_id SIEMPRE de la sesión verificada
// (authenticateRoute) — nunca del body, aunque el cliente intente colar uno.
// Escribe con el cliente de SESIÓN (RLS), no service-role: PostgREST valida
// los tokens ES256 (probado en R4b-1). target_date se calcula server-side
// (efemérides es solo-servidor) al crear.

export const runtime = "nodejs";

// Bajo el bundler de Next, import.meta.url del motor no resuelve a una ruta de
// archivo. Fijamos la carpeta de efemérides (.se1) explícitamente en runtime,
// relativa al cwd del server (apps/web → ../../packages/ephemeris/ephe).
setEphePath(path.join(process.cwd(), "..", "..", "packages", "ephemeris", "ephe"));

const MAX_INTENTION_LEN = 280;

// exactOptionalPropertyTypes hace que postgrest-js infiera el arg de insert() como
// `never` (mismo shim que avatar-upload.tsx / app/onboarding/actions.ts).
type ManifestationInsertBuilder = {
  insert: (v: TablesInsert<"manifestations">) => {
    select: () => {
      maybeSingle: () => Promise<{ data: Tables<"manifestations"> | null; error: { message: string } | null }>;
    };
  };
};

export async function POST(request: NextRequest) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const body = (raw ?? {}) as Record<string, unknown>;

  const { supabase, user } = await authenticateRoute(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const horizon = String(body.horizon ?? "");
  if (!(HORIZONS as readonly string[]).includes(horizon)) {
    return NextResponse.json({ error: "invalid_horizon" }, { status: 400 });
  }

  const intention = typeof body.intention === "string" ? body.intention : "";
  if (intention.length < 1 || intention.length > MAX_INTENTION_LEN) {
    return NextResponse.json({ error: "invalid_intention" }, { status: 400 });
  }

  // profileId (para solar_return) se valida contra birth_profiles del propio
  // usuario vía RLS — si no vuelve fila (ajeno, inexistente o no provisto),
  // natal queda null y resolveHorizonDate cae a +1 año (fallback documentado).
  let natal: ChartInput | null = null;
  const profileId = typeof body.profileId === "string" ? body.profileId : "";
  if (horizon === "solar_return" && profileId) {
    const { data: profile } = await supabase
      .from("birth_profiles")
      .select("birth_date, birth_time, time_known, latitude, longitude, time_zone")
      .eq("id", profileId)
      .maybeSingle();
    if (profile) natal = profileToChartInput(profile);
  }

  const targetDate = resolveHorizonDate(horizon as Horizon, natal, new Date().toISOString());

  const row: TablesInsert<"manifestations"> = {
    user_id: user.id, // ← de la sesión verificada, no del body
    intention,
    horizon,
    target_date: targetDate,
  };
  const builder = supabase.from("manifestations") as unknown as ManifestationInsertBuilder;
  const { data, error } = await builder.insert(row).select().maybeSingle();
  if (error) {
    console.error("[manifestations] insert failed", error); // observabilidad; no se filtra al cliente
    return NextResponse.json({ error: "db" }, { status: 500 });
  }
  return NextResponse.json({ manifestation: data });
}

export async function GET(request: NextRequest) {
  const { supabase, user } = await authenticateRoute(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // RLS ya scopea al dueño; el .eq es defensivo (segunda capa, cero costo).
  const { data, error } = await supabase
    .from("manifestations")
    .select("*")
    .eq("user_id", user.id)
    .order("target_date", { ascending: true });
  if (error) {
    console.error("[manifestations] list failed", error);
    return NextResponse.json({ error: "db" }, { status: 500 });
  }
  return NextResponse.json({ manifestations: data ?? [] });
}
