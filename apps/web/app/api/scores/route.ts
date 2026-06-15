import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { computeChart, computeDerivedChart, setEphePath } from "@aluna/ephemeris";
import {
  detectAspectsBetween,
  scoreLifeAreas,
  scoreTone,
  LIFE_AREAS,
  type LifeArea,
  type AreaDriver,
} from "@aluna/core";
import { createClient } from "@/lib/supabase/server";
import { profileToChartInput } from "@/lib/chart";

// "Tu energía de hoy" (Fase 2): puntúa 6 áreas de vida (0..100) a partir de los
// tránsitos al natal. Determinista (motor scoreLifeAreas de @aluna/core), server-only
// por el motor nativo sweph. profileId VALIDADO contra birth_profiles del usuario
// autenticado (RLS); nunca se confía en lat/lng del body.

export const runtime = "nodejs";

setEphePath(path.join(process.cwd(), "..", "..", "packages", "ephemeris", "ephe"));

const WEATHER_BODIES = new Set([
  "sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto",
]);
// Orbes intermedios: más amplios que "Tu Clima" (que solo muestra lo exactísimo)
// para que el puntaje capte el clima, pero sin ruido.
const SCORE_ORBS: Record<string, number> = {
  conjunction: 6, opposition: 6, trine: 5, square: 5, sextile: 4,
};

type Period = "today" | "week" | "month" | "year";
const PERIODS: readonly Period[] = ["today", "week", "month", "year"];

const DAY_MS = 86_400_000;

/**
 * Fechas (ISO) que muestrean el periodo. Cuanto más largo, muestras más espaciadas:
 * los planetas LENTOS (cuyos aspectos persisten en todas las muestras) marcan el
 * clima; los rápidos (Luna) se promedian hacia neutro. Día = solo ahora.
 */
function sampleDates(period: Period, from = Date.now()): string[] {
  const at = (days: number) => new Date(from + days * DAY_MS).toISOString();
  if (period === "today") return [at(0)];
  if (period === "week") return Array.from({ length: 7 }, (_, i) => at(i));
  if (period === "month") return Array.from({ length: 6 }, (_, i) => at(i * 5));
  return Array.from({ length: 12 }, (_, i) => at(i * 30)); // year
}

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
  const period: Period = (PERIODS as readonly string[]).includes(String(body.period))
    ? (body.period as Period)
    : "today";

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

  try {
    const input = profileToChartInput(profile, {});
    const natal = computeChart(input);
    const fixed = natal.bodies
      .filter((b) => WEATHER_BODIES.has(b.body))
      .map((b) => ({ key: b.body, longitude: b.longitude, speed: 0 }));

    const dates = sampleDates(period);
    const totals: Record<LifeArea, number> = {
      love: 0, money: 0, work: 0, health: 0, mood: 0, luck: 0,
    };
    // Cuenta cuántas muestras incluye cada driver: los persistentes (planetas lentos)
    // aparecen en muchas → afloran como los verdaderos motores del periodo.
    const drivers = new Map<string, { area: LifeArea; driver: AreaDriver; count: number }>();

    for (const iso of dates) {
      const transit = computeDerivedChart(input, "transits", iso);
      const moving = transit.bodies
        .filter((b) => WEATHER_BODIES.has(b.body))
        .map((b) => ({ key: b.body, longitude: b.longitude, speed: b.speed }));
      const aspects = detectAspectsBetween(moving, fixed, { orbs: SCORE_ORBS });
      for (const s of scoreLifeAreas(aspects)) {
        totals[s.area] += s.score;
        for (const d of s.drivers) {
          const key = `${s.area}:${d.transit}:${d.natal}:${d.aspect}`;
          const prev = drivers.get(key);
          if (prev) prev.count += 1;
          else drivers.set(key, { area: s.area, driver: d, count: 1 });
        }
      }
    }

    const n = dates.length;
    const all = [...drivers.values()];
    const areas = LIFE_AREAS.map((area) => {
      const score = Math.round(totals[area] / n);
      return {
        area,
        score,
        tone: scoreTone(score),
        drivers: all
          .filter((x) => x.area === area)
          .sort((a, b) => b.count - a.count)
          .slice(0, 3)
          .map((x) => x.driver),
      };
    });

    return NextResponse.json({ period, areas });
  } catch {
    return NextResponse.json({ error: "compute" }, { status: 500 });
  }
}
