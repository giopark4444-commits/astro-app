import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { computeChart, jieBoundaries, setEphePath } from "@aluna/ephemeris";
import { yearPillar, monthPillar, dayPillar, hourPillar, type Pillar } from "@aluna/core";
import { authenticateRoute } from "@/lib/supabase/route-auth";
import { isSolarChart, profileToChartInput } from "@/lib/chart";

// Cuatro Pilares (Ba Zi / Saju). Server-only: usa @aluna/ephemeris (sweph nativo) solo
// para la LONGITUD SOLAR del nacimiento — de ella salen el año solar (límite de Lichun)
// y la rama de mes (término solar). El resto es el sistema sexagenario puro de @aluna/core.
// profileId VALIDADO contra birth_profiles del usuario (RLS).

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
  const profileId = String(body.profileId ?? "");
  if (!profileId) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const { supabase, user } = await authenticateRoute(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("birth_profiles")
    .select("birth_date, birth_time, time_known, latitude, longitude, time_zone, gender")
    .eq("id", profileId)
    .maybeSingle();
  if (!profile) return NextResponse.json({ error: "not_found" }, { status: 404 });

  try {
    // input lleva la fecha civil LOCAL (year/month/day) y la hora real cuando se
    // conoce (mediodía si es carta solar). Derivamos todo de aquí + isSolarChart,
    // sin acceder campos del profile directo (igual que /api/chart).
    const input = profileToChartInput(profile, {});
    const sun = computeChart(input).bodies.find((b) => b.body === "sun");
    if (!sun) return NextResponse.json({ error: "compute" }, { status: 500 });
    const sunLongitude = sun.longitude;

    const cy = input.year;
    const cm = input.month;

    // Año solar Ba Zi: avanza en Lichun (Sol = 315°, ~4 feb), no en Año Nuevo civil.
    // Con la longitud solar exacta el límite es preciso; ene/feb son los únicos ambiguos.
    let solarYear = cy;
    if (cm === 1 || (cm === 2 && sunLongitude < 315)) solarYear -= 1;

    const year = yearPillar(solarYear);
    const month = monthPillar(year.stem, sunLongitude);
    const day = dayPillar(cy, cm, input.day);

    // Pilar de HORA solo si se conoce la hora (input.hour es la hora real entonces).
    const timeKnown = !isSolarChart(profile);
    const hour: Pillar | null = timeKnown ? hourPillar(day.stem, input.hour) : null;

    // Términos solares (jie) que delimitan el pilar de mes actual — para mostrar
    // "cuánto falta/pasó" en el Modo Pro. Género del perfil, normalizado a los tres
    // valores que entiende la UI (dato del usuario, no calculado).
    const { daysToPrevJie, daysToNextJie } = jieBoundaries(input);
    const rawGender = String((profile as { gender?: unknown }).gender ?? "");
    const gender =
      rawGender === "feminine" || rawGender === "masculine" ? rawGender : "neutral";

    return NextResponse.json({
      year, month, day, hour, solarYear, timeKnown,
      gender, birthYear: cy, daysToPrevJie, daysToNextJie,
    });
  } catch {
    return NextResponse.json({ error: "compute" }, { status: 500 });
  }
}
