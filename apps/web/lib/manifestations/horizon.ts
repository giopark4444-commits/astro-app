import { DateTime } from "luxon";
import type { ChartInput, Horizon } from "@aluna/core";
import { nextLunarPhase, solarReturnDate } from "@aluna/ephemeris";

/** Resuelve el horizonte a una fecha YYYY-MM-DD. Lunares/solar via efemérides
 *  (server-only); relativos por aritmética de fecha. `nowIso` fija el "ahora". */
export function resolveHorizonDate(horizon: Horizon, natal: ChartInput | null, nowIso: string): string {
  const now = DateTime.fromISO(nowIso, { zone: "utc" });
  switch (horizon) {
    case "new_moon": return nextLunarPhase("new", nowIso).slice(0, 10);
    case "full_moon": return nextLunarPhase("full", nowIso).slice(0, 10);
    case "solar_return":
      // sin carta (perfil sin hora igual sirve: la longitud del Sol no depende de la hora al día)
      return natal ? solarReturnDate(natal, nowIso).slice(0, 10) : now.plus({ years: 1 }).toISODate()!;
    case "three_months": return now.plus({ months: 3 }).toISODate()!;
    case "one_year": return now.plus({ years: 1 }).toISODate()!;
  }
}
