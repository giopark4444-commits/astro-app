import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { computeChart, computeDerivedChart, setEphePath, type DerivedKind } from "@aluna/ephemeris";
import type { HouseSystem, Zodiac } from "@aluna/core";
import { createClient } from "@/lib/supabase/server";
import { profileToChartInput, isSolarChart, type ChartInputOptions } from "@/lib/chart";

// Cómputo de la carta natal del perfil activo. Server-only (motor nativo sweph),
// runtime Node. El profileId se VALIDA contra birth_profiles del usuario
// autenticado (RLS), nunca se confía en lat/lng del body. Caché Supabase
// (getOrComputeChart) se sumará cuando llegue la service-role key.

export const runtime = "nodejs";

// Bajo el bundler de Next, import.meta.url del motor no resuelve a una ruta de
// archivo. Fijamos la carpeta de efemérides (.se1) explícitamente en runtime,
// relativa al cwd del server (apps/web → ../../packages/ephemeris/ephe).
setEphePath(path.join(process.cwd(), "..", "..", "packages", "ephemeris", "ephe"));

const HOUSE_SYSTEMS: readonly HouseSystem[] = [
  "placidus",
  "koch",
  "equal",
  "whole",
  "regiomontanus",
  "porphyry",
];
const ZODIACS: readonly Zodiac[] = ["tropical", "sidereal"];

export async function POST(request: NextRequest) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const body = (raw ?? {}) as Record<string, unknown>;
  const profileId = String(body.profileId ?? "");
  if (!profileId) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // RLS limita el SELECT al dueño: si vuelve fila, el perfil es de este usuario.
  const { data: profile } = await supabase
    .from("birth_profiles")
    .select("birth_date, birth_time, time_known, latitude, longitude, time_zone")
    .eq("id", profileId)
    .maybeSingle();
  if (!profile) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const opts: ChartInputOptions = {};
  if (typeof body.houseSystem === "string" && (HOUSE_SYSTEMS as readonly string[]).includes(body.houseSystem)) {
    opts.houseSystem = body.houseSystem as HouseSystem;
  }
  if (typeof body.zodiac === "string" && (ZODIACS as readonly string[]).includes(body.zodiac)) {
    opts.zodiac = body.zodiac as Zodiac;
  }
  if (typeof body.ayanamsha === "string") opts.ayanamsha = body.ayanamsha;

  const kind = String(body.kind ?? "natal");
  try {
    const input = profileToChartInput(profile, opts);
    const chart =
      kind === "transits" || kind === "progressed" || kind === "solar_return"
        ? computeDerivedChart(input, kind as DerivedKind)
        : computeChart(input);
    // Tránsitos y revolución solar usan una hora conocida (ahora / el regreso del
    // Sol) → casas fiables aunque no se sepa la hora de nacimiento. Natal y
    // progresada sí dependen de la hora natal.
    const solar = kind === "transits" || kind === "solar_return" ? false : isSolarChart(profile);
    return NextResponse.json({ chart, solar });
  } catch {
    return NextResponse.json({ error: "compute" }, { status: 500 });
  }
}
