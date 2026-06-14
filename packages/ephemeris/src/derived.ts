// packages/ephemeris/src/derived.ts
import { DateTime } from "luxon";
import type { ChartInput, ChartResult } from "@aluna/core";
import { computeChart } from "./chart";

export type DerivedKind = "transits" | "progressed" | "solar_return";

const SUN_DEG_PER_DAY = 0.98563; // velocidad media del Sol (°/día)

/** ChartInput igual al natal pero en otra fecha/hora civil. */
function inputAt(natal: ChartInput, dt: DateTime): ChartInput {
  return { ...natal, year: dt.year, month: dt.month, day: dt.day, hour: dt.hour, minute: dt.minute };
}

function sunLongitude(input: ChartInput): number {
  return computeChart(input).bodies.find((b) => b.body === "sun")!.longitude;
}

/**
 * Carta derivada = el mismo cómputo en OTRO momento, sobre el mismo lugar/zona.
 * - transits ("Tu Clima"): el cielo de AHORA sobre el lugar natal.
 * - progressed (progresión secundaria, día-por-año): la carta natal avanzada
 *   tantos días como años tiene la persona.
 * - solar_return (revolución solar): el instante del año en que el Sol regresa a
 *   su longitud natal exacta; carta de ese momento sobre el lugar natal.
 * `nowIso` permite fijar el instante de referencia (tests); por defecto, ahora.
 */
export function computeDerivedChart(natal: ChartInput, kind: DerivedKind, nowIso?: string): ChartResult {
  const now = nowIso ? DateTime.fromISO(nowIso, { zone: "utc" }) : DateTime.utc();

  if (kind === "transits") {
    const local = now.setZone(natal.timeZone);
    return computeChart(inputAt(natal, local));
  }

  if (kind === "progressed") {
    const natalDt = DateTime.fromObject(
      { year: natal.year, month: natal.month, day: natal.day, hour: natal.hour, minute: natal.minute },
      { zone: natal.timeZone },
    );
    const ageYears = now.diff(natalDt, "years").years;
    return computeChart(inputAt(natal, natalDt.plus({ days: ageYears })));
  }

  // solar_return: busca el regreso del Sol a su longitud natal en el año actual.
  const natalSunLon = sunLongitude(natal);
  const localNow = now.setZone(natal.timeZone);
  let dt = DateTime.fromObject(
    { year: localNow.year, month: natal.month, day: natal.day, hour: natal.hour, minute: natal.minute },
    { zone: natal.timeZone },
  );
  for (let i = 0; i < 8; i++) {
    const diff = ((natalSunLon - sunLongitude(inputAt(natal, dt)) + 540) % 360) - 180; // -180..180
    if (Math.abs(diff) < 1e-4) break;
    dt = dt.plus({ days: diff / SUN_DEG_PER_DAY });
  }
  return computeChart(inputAt(natal, dt));
}
