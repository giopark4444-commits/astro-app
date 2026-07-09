// packages/ephemeris/src/jie.ts
// Distancia (en días, con fracción) del nacimiento a los términos solares de MES
// (節): cruces de longitud solar múltiplo de 30° partiendo de 315° (Lichun). Los usa
// la edad de inicio de los 大運 (regla 3 días = 1 año). Newton sobre la longitud
// solar, mismo patrón que la revolución solar en derived.ts.
import { DateTime } from "luxon";
import type { ChartInput } from "@aluna/core";
import { computeChart } from "./chart";

const SUN_DEG_PER_DAY = 0.98563;

function inputAt(natal: ChartInput, dt: DateTime): ChartInput {
  return { ...natal, year: dt.year, month: dt.month, day: dt.day, hour: dt.hour, minute: dt.minute };
}
function sunLongitude(input: ChartInput): number {
  return computeChart(input).bodies.find((b) => b.body === "sun")!.longitude;
}
/** Diferencia angular con signo hacia el objetivo, en (-180, 180]. */
function signedDelta(target: number, lon: number): number {
  return ((target - lon + 540) % 360) - 180;
}

/** Busca (Newton) el instante en que el Sol cruza `target`; devuelve el DateTime. */
function findCrossing(natal: ChartInput, from: DateTime, target: number): DateTime {
  let dt = from;
  for (let i = 0; i < 12; i++) {
    const diff = signedDelta(target, sunLongitude(inputAt(natal, dt)));
    if (Math.abs(diff) < 1e-5) break;
    dt = dt.plus({ days: diff / SUN_DEG_PER_DAY });
  }
  return dt;
}

export function jieBoundaries(input: ChartInput): { daysToPrevJie: number; daysToNextJie: number } {
  const birth = DateTime.fromObject(
    { year: input.year, month: input.month, day: input.day, hour: input.hour, minute: input.minute },
    { zone: input.timeZone },
  );
  const lon = sunLongitude(input);
  // Sector de mes: 節 anterior = múltiplo de 30° (desde 315) alcanzado; siguiente = +30°.
  const sector = Math.floor((((lon - 315) % 360) + 360) % 360 / 30);
  const prevTarget = (315 + sector * 30) % 360;
  const nextTarget = (prevTarget + 30) % 360;

  // Semillas: el Sol recorre ~30° en ~30 días.
  const prevSeed = birth.minus({ days: signedDelta(lon, prevTarget) / SUN_DEG_PER_DAY });
  const nextSeed = birth.plus({ days: signedDelta(nextTarget, lon) / SUN_DEG_PER_DAY });

  const prev = findCrossing(input, prevSeed, prevTarget);
  const next = findCrossing(input, nextSeed, nextTarget);
  return {
    daysToPrevJie: Math.max(0, birth.diff(prev, "days").days),
    daysToNextJie: Math.max(0, next.diff(birth, "days").days),
  };
}
