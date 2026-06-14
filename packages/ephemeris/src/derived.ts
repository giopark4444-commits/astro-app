// packages/ephemeris/src/derived.ts
import { DateTime } from "luxon";
import type { ChartInput, ChartResult } from "@aluna/core";
import { computeChart } from "./chart";

export type DerivedKind = "transits" | "progressed";

/**
 * Carta derivada = el mismo cómputo en OTRO momento, sobre el mismo lugar/zona.
 * - transits ("Tu Clima"): el cielo de AHORA sobre el lugar natal.
 * - progressed (progresión secundaria, día-por-año): la carta natal avanzada
 *   tantos días como años tiene la persona.
 * `nowIso` permite fijar el instante de referencia (tests); por defecto, ahora.
 */
export function computeDerivedChart(natal: ChartInput, kind: DerivedKind, nowIso?: string): ChartResult {
  const now = nowIso ? DateTime.fromISO(nowIso, { zone: "utc" }) : DateTime.utc();

  if (kind === "transits") {
    const local = now.setZone(natal.timeZone);
    return computeChart({
      ...natal,
      year: local.year,
      month: local.month,
      day: local.day,
      hour: local.hour,
      minute: local.minute,
    });
  }

  // progressed: instante natal + (edad en años) días
  const natalDt = DateTime.fromObject(
    {
      year: natal.year,
      month: natal.month,
      day: natal.day,
      hour: natal.hour,
      minute: natal.minute,
    },
    { zone: natal.timeZone },
  );
  const ageYears = now.diff(natalDt, "years").years;
  const progressed = natalDt.plus({ days: ageYears });
  return computeChart({
    ...natal,
    year: progressed.year,
    month: progressed.month,
    day: progressed.day,
    hour: progressed.hour,
    minute: progressed.minute,
  });
}
