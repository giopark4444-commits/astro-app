// apps/web/lib/timeline/assemble.ts
// "Camino de vida" — ensamblaje SERVER: perfil de nacimiento → TimelineResult
// completo (los 4 sistemas + confluencias). Reutiliza computeBaziNatal
// (bazi-natal.ts, ya usado por /api/bazi) para los pilares natales, y
// astroTimelineEvents (returns.ts) para los retornos astronómicos. El resto
// (numerología, bazi puro, confluencias, merge) es events.ts, cero efemérides.
import path from "node:path";
import { DateTime } from "luxon";
import { computeChart, setEphePath } from "@aluna/ephemeris";
import { luckPillars, annualPillars, type BirthDate, type PillarSet } from "@aluna/core";
import { profileToChartInput, type ChartProfileFields } from "@/lib/chart";
import { computeBaziNatal, type BaziNatalProfile } from "./bazi-natal";
import { numerologyEvents, baziEvents, confluenceEvents, mergeTimeline } from "./events";
import { astroTimelineEvents } from "./returns";
import type { TimelineResult } from "./types";

setEphePath(path.join(process.cwd(), "..", "..", "packages", "ephemeris", "ephe"));

export interface TimelineProfile extends ChartProfileFields, BaziNatalProfile {}

/**
 * Ensambla el "Camino de vida" completo para un perfil: nacimiento → año
 * actual + 10. `nowIso` decide el año actual (inyectable en tests; en la
 * ruta es `new Date().toISOString()`).
 */
export function assembleTimeline(profile: TimelineProfile, nowIso: string): TimelineResult {
  const [by, bm, bd] = profile.birth_date.split("-").map(Number);
  const birth: BirthDate = { year: by!, month: bm!, day: bd! };

  const currentYear = DateTime.fromISO(nowIso, { zone: "utc" }).year;
  const horizonYear = currentYear + 10;

  // Carta natal (para las longitudes que alimentan el buscador de retornos).
  const natal = computeChart(profileToChartInput(profile));

  // Momento de nacimiento como wall-clock estampado en UTC (misma convención
  // que returns.ts/sus tests: la hora civil de nacimiento, no una conversión
  // real de zona horaria — solo importan las longitudes natales + el reloj).
  const hasTime = profile.time_known && !!profile.birth_time;
  const clock = hasTime ? profile.birth_time! : "12:00";
  const birthIso = `${profile.birth_date}T${clock}:00.000Z`;
  const toIso = `${horizonYear}-12-31T23:59:59.000Z`;

  // Pilares natales (八字/사주) + secuencia de 大運 + pilares anuales, vía la
  // misma receta que /api/bazi. Género neutral → luckPillars() devuelve ambas
  // secuencias (forward primero); v1 se queda con la forward (decisión del plan).
  const baziNatal = computeBaziNatal(profile);
  const pillars: PillarSet = {
    year: baziNatal.year,
    month: baziNatal.month,
    day: baziNatal.day,
    hour: baziNatal.hour,
  };
  const luck = luckPillars({
    pillars,
    gender: baziNatal.gender,
    birthYear: baziNatal.birthYear,
    daysToPrevJie: baziNatal.daysToPrevJie,
    daysToNextJie: baziNatal.daysToNextJie,
  })[0]!;
  const annualCount = horizonYear - birth.year + 1;
  const annual = annualPillars(pillars, birth.year, annualCount);

  const birthEvent = {
    id: `life:birth:${birth.year}`,
    year: birth.year,
    system: "life" as const,
    kind: "birth" as const,
    weight: 3 as const,
  };

  const numerology = numerologyEvents(birth, birth.year, horizonYear);
  const bazi = baziEvents(luck, annual, birth.month, baziNatal.gender === "neutral");
  const astro = astroTimelineEvents(natal, birthIso, toIso);
  const base = mergeTimeline([[birthEvent], numerology, bazi, astro]);
  const confluences = confluenceEvents(base, currentYear, horizonYear);
  const events = mergeTimeline([base, confluences]);

  return {
    events,
    fromYear: birth.year,
    toYear: horizonYear,
    birthYear: birth.year,
    todayIso: nowIso,
  };
}
