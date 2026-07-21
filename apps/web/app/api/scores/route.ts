import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { computeChart, computeDerivedChart, setEphePath } from "@aluna/ephemeris";
import {
  detectAspectsBetween,
  scoreLifeAreas,
  scoreTone,
  personalCycles,
  dayPillar,
  LIFE_AREAS,
  type ChartInput,
  type LifeArea,
  type LifeAreaScore,
  type AreaDriver,
} from "@aluna/core";
import { authenticateRoute } from "@/lib/supabase/route-auth";
import { profileToChartInput } from "@/lib/chart";
import { computeBaziNatal } from "@/lib/timeline/bazi-natal";
import { assembleHoyScores } from "@/lib/hoy/scores";
import { todayCivilInZone } from "@/lib/hoy/today-birth";

// "Tu energía de hoy" (dashboard): puntúa 6 áreas de vida (0..100) por las cuatro
// disciplinas. `astros` = clima de tránsitos al natal, y responde al PERIODO
// (today/week/month/year, como antes). `numeros`, `pilares` y `general` son SIEMPRE
// del día (no dependen del periodo): numerología del día, pilares (八字/사주) con el
// pilar de hoy, y el promedio de las tres. Determinista; server-only por el motor
// nativo sweph. profileId VALIDADO contra birth_profiles del usuario autenticado
// (RLS); nunca se confía en lat/lng del body.

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

type FixedBody = { key: string; longitude: number; speed: number };

/** Aspectos tránsito→natal en un instante (ISO): planetas móviles vs. natal fijo. */
function aspectsAt(input: ChartInput, fixed: FixedBody[], iso: string) {
  const moving = computeDerivedChart(input, "transits", iso).bodies
    .filter((b) => WEATHER_BODIES.has(b.body))
    .map((b) => ({ key: b.body, longitude: b.longitude, speed: b.speed }));
  return detectAspectsBetween(moving, fixed, { orbs: SCORE_ORBS });
}

/**
 * Astros por periodo: promedia el puntaje de cada área sobre las muestras del periodo
 * y ordena los drivers por PERSISTENCIA (cuántas muestras los incluyen) — así afloran
 * los planetas lentos, verdaderos motores del clima. (El día usa el ensamblador puro,
 * que ordena drivers por magnitud; aquí importa la persistencia multi-muestra.)
 */
function scoreAstrosOverDates(
  input: ChartInput,
  fixed: FixedBody[],
  dates: string[],
): LifeAreaScore[] {
  const totals: Record<LifeArea, number> = {
    love: 0, money: 0, work: 0, health: 0, mood: 0, luck: 0,
  };
  const drivers = new Map<string, { area: LifeArea; driver: AreaDriver; count: number }>();

  for (const iso of dates) {
    for (const s of scoreLifeAreas(aspectsAt(input, fixed, iso))) {
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
  return LIFE_AREAS.map((area) => {
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

  const { supabase, user } = await authenticateRoute(request);
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
    const natalChart = computeChart(input);
    const fixed = natalChart.bodies
      .filter((b) => WEATHER_BODIES.has(b.body))
      .map((b) => ({ key: b.body, longitude: b.longitude, speed: 0 }));

    // Disciplinas del DÍA (no dependen del periodo). La fecha civil de hoy alimenta
    // numerología y el pilar del día; los aspectos de ahora, los astros del día. Se
    // resuelve en la tz del PERFIL (no la del proceso server, que en Vercel es UTC) —
    // si no, un usuario en UTC-5 ve el día siguiente desde ~19:00 hora local.
    const asOf = todayCivilInZone(profile.time_zone);
    const birth = { year: input.year, month: input.month, day: input.day };
    const cycles = personalCycles(birth, asOf);
    const natal = computeBaziNatal(profile);
    const todayPillar = dayPillar(asOf.year, asOf.month, asOf.day);
    const todayAspects = aspectsAt(input, fixed, new Date().toISOString());

    const day = assembleHoyScores({
      aspects: todayAspects,
      cycles,
      natal,
      dayPillar: todayPillar,
    });

    // El periodo aplica SOLO a astros. Para "today" reusamos los astros del día ya
    // computados (mismos aspectos); para periodos más largos, muestreamos.
    const astros =
      period === "today" ? day.astros : scoreAstrosOverDates(input, fixed, sampleDates(period));

    // `areas` es alias de `astros` por retrocompatibilidad con el móvil (apps/mobile)
    // hasta que migre a los sets por disciplina (general/astros/numeros/pilares).
    return NextResponse.json({
      period,
      areas: astros,
      general: day.general,
      astros,
      numeros: day.numeros,
      pilares: day.pilares,
    });
  } catch {
    return NextResponse.json({ error: "compute" }, { status: 500 });
  }
}
