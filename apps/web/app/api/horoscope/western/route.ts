import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { computeChart, computeDerivedChart, setEphePath, exactAspectAt } from "@aluna/ephemeris";
import { detectAspectsBetween, ZODIAC_SIGNS, type Aspect, type ChartInput } from "@aluna/core";
import { authenticateRoute } from "@/lib/supabase/route-auth";
import { profileToChartInput } from "@/lib/chart";
import {
  cachedWesternHoroscope, isValidTz, HOROSCOPE_PERIODS, type HoroscopePeriod,
} from "@/lib/horoscope/western";

// Horóscopo occidental por signo. El payload es UNIVERSAL (cacheado por
// signo+periodo+fecha local); la capa personal (tránsitos que tocan la carta
// natal REAL) solo se computa si viene profileId y pasa RLS. Requiere sesión.

export const runtime = "nodejs";

setEphePath(path.join(process.cwd(), "..", "..", "packages", "ephemeris", "ephe"));

const SIGN_KEYS = new Set(ZODIAC_SIGNS.map((s) => s.key));
const WEATHER_BODIES = new Set(["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"]);
const HIT_ORBS: Record<string, number> = { conjunction: 3, opposition: 3, trine: 3, square: 3, sextile: 2 };

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
  let sign = typeof body.sign === "string" && SIGN_KEYS.has(body.sign) ? body.sign : null;
  const profileId = typeof body.profileId === "string" && body.profileId ? body.profileId : null;

  // Perfil (opcional): resuelve el signo por el Sol natal REAL y habilita los
  // hits. natalInput se conserva en variable LOCAL del handler (nunca de módulo:
  // dos requests concurrentes se pisarían).
  let natal: ReturnType<typeof computeChart> | null = null;
  let natalInput: ChartInput | null = null;
  if (profileId) {
    const { data: profile } = await supabase
      .from("birth_profiles")
      .select("birth_date, birth_time, time_known, latitude, longitude, time_zone")
      .eq("id", profileId)
      .maybeSingle();
    if (!profile) return NextResponse.json({ error: "not_found" }, { status: 404 });
    try {
      natalInput = profileToChartInput(profile, {});
      natal = computeChart(natalInput);
      if (!sign) sign = natal.bodies.find((b) => b.body === "sun")!.sign;
    } catch {
      return NextResponse.json({ error: "compute" }, { status: 500 });
    }
  }
  if (!sign) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  try {
    const payload = cachedWesternHoroscope(sign, period, tz);

    // Capa personal: tránsitos de AHORA a los planetas natales + fecha exacta.
    let natalHits: Array<Aspect & { exactIso: string | null }> | undefined;
    if (natal && natalInput) {
      const nowIso = new Date().toISOString();
      const transit = computeDerivedChart(natalInput, "transits", nowIso);
      const moving = transit.bodies.filter((b) => WEATHER_BODIES.has(b.body))
        .map((b) => ({ key: b.body, longitude: b.longitude, speed: b.speed }));
      const fixed = natal.bodies.filter((b) => WEATHER_BODIES.has(b.body))
        .map((b) => ({ key: b.body, longitude: b.longitude, speed: 0 }));
      natalHits = detectAspectsBetween(moving, fixed, { orbs: HIT_ORBS })
        .sort((a, b) => a.orb - b.orb)
        .slice(0, 8)
        .map((a) => {
          const natalLon = natal.bodies.find((b) => b.body === a.b)!.longitude;
          return { ...a, exactIso: exactAspectAt(a.a, natalLon, a.angle, nowIso, 20) };
        });
    }

    return NextResponse.json(natalHits ? { ...payload, natalHits } : payload);
  } catch {
    return NextResponse.json({ error: "compute" }, { status: 500 });
  }
}
