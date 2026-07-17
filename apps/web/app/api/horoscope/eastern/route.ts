import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { computeChart, setEphePath } from "@aluna/ephemeris";
import { yearPillar, monthPillar, dayPillar, hourPillar, EARTHLY_BRANCHES, type Pillar, type PillarSet } from "@aluna/core";
import { authenticateRoute } from "@/lib/supabase/route-auth";
import { isSolarChart, profileToChartInput } from "@/lib/chart";
import {
  cachedEasternHoroscope, computeEasternNatalHits, isEasternAnimal,
  type EasternAnimal,
} from "@/lib/horoscope/eastern";
import { isValidTz, HOROSCOPE_PERIODS, type HoroscopePeriod } from "@/lib/horoscope/western";

// Horóscopo oriental por animal. El payload es UNIVERSAL (cacheado por
// animal+periodo+fecha local); la capa personal (pilares natales REALES cruzados
// con el periodo) solo se computa si viene profileId y pasa RLS. Requiere sesión.

export const runtime = "nodejs";

setEphePath(path.join(process.cwd(), "..", "..", "packages", "ephemeris", "ephe"));

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

  const period: HoroscopePeriod = (HOROSCOPE_PERIODS as readonly string[]).includes(String(body.period))
    ? (body.period as HoroscopePeriod)
    : "today";
  const tz = isValidTz(String(body.tz ?? "")) ? String(body.tz) : "utc";
  let animal: EasternAnimal | null =
    typeof body.animal === "string" && isEasternAnimal(body.animal) ? body.animal : null;
  const profileId = typeof body.profileId === "string" && body.profileId ? body.profileId : null;

  // Perfil (opcional): resuelve el animal por el pilar de año (Lichun) REAL y
  // habilita los cruces natales. natalPillars se conserva en variable LOCAL del
  // handler (nunca de módulo: dos requests concurrentes se pisarían).
  let natalPillars: PillarSet | null = null;
  if (profileId) {
    const { data: profile } = await supabase
      .from("birth_profiles")
      .select("birth_date, birth_time, time_known, latitude, longitude, time_zone")
      .eq("id", profileId)
      .maybeSingle();
    if (!profile) return NextResponse.json({ error: "not_found" }, { status: 404 });
    try {
      const input = profileToChartInput(profile, {});
      const sun = computeChart(input).bodies.find((b) => b.body === "sun");
      if (!sun) return NextResponse.json({ error: "compute" }, { status: 500 });
      const sunLongitude = sun.longitude;

      const cy = input.year;
      const cm = input.month;
      // Año solar Ba Zi: avanza en Lichun (Sol = 315°), no en Año Nuevo civil.
      let solarYear = cy;
      if (cm === 1 || (cm === 2 && sunLongitude < 315)) solarYear -= 1;

      const yearP = yearPillar(solarYear);
      const monthP = monthPillar(yearP.stem, sunLongitude);
      const dayP = dayPillar(cy, cm, input.day);
      const timeKnown = !isSolarChart(profile);
      const hourP: Pillar | null = timeKnown ? hourPillar(dayP.stem, input.hour) : null;

      natalPillars = { year: yearP, month: monthP, day: dayP, hour: hourP };
      if (!animal) animal = EARTHLY_BRANCHES[yearP.branch]!.animal as EasternAnimal;
    } catch {
      return NextResponse.json({ error: "compute" }, { status: 500 });
    }
  }
  if (!animal) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  try {
    // Payload universal SIEMPRE desde la caché (patrón western: con perfil no
    // se bypasea la caché); la capa natal se computa aparte y se fusiona en la
    // respuesta — jamás entra a la caché compartida.
    const payload = cachedEasternHoroscope(animal, period, tz);
    const natalHits = natalPillars ? computeEasternNatalHits(natalPillars, payload.pillars) : undefined;

    return NextResponse.json(natalHits ? { ...payload, natalHits } : payload);
  } catch {
    return NextResponse.json({ error: "compute" }, { status: 500 });
  }
}
