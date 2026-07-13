// packages/ephemeris/src/lunar.ts
import { DateTime } from "luxon";
import type { ChartInput } from "@aluna/core";
import { computeBodies } from "./bodies";
import { localToJulianDay } from "./time";
import { computeChart } from "./chart";

const MOON_SUN_DEG_PER_DAY = 12.19; // elongación media Luna-Sol
const SUN_DEG_PER_DAY = 0.98563;

function elongationAt(dt: DateTime): number {
  const { julianDayEt } = localToJulianDay({
    year: dt.year, month: dt.month, day: dt.day, hour: dt.hour, minute: dt.minute, timeZone: "utc",
  });
  const b = computeBodies(julianDayEt);
  const sun = b.find((x) => x.body === "sun")!.longitude;
  const moon = b.find((x) => x.body === "moon")!.longitude;
  return (((moon - sun) % 360) + 360) % 360;
}

/** ISO UTC del próximo instante (posterior a fromIso) donde la Luna está en
 *  conjunción (new, elong 0°) u oposición (full, 180°) con el Sol. */
export function nextLunarPhase(phase: "new" | "full", fromIso?: string): string {
  const target = phase === "new" ? 0 : 180;
  let dt = fromIso ? DateTime.fromISO(fromIso, { zone: "utc" }) : DateTime.utc();
  // salto inicial hacia adelante hasta el próximo cruce
  let delta = (((target - elongationAt(dt)) % 360) + 360) % 360; // 0..360 adelante
  if (delta < 0.5) delta += 360; // ya en el target → la SIGUIENTE, no esta
  dt = dt.plus({ days: delta / MOON_SUN_DEG_PER_DAY });
  for (let i = 0; i < 10; i++) {
    const resid = ((((target - elongationAt(dt)) % 360) + 540) % 360) - 180; // -180..180
    if (Math.abs(resid) < 0.02) break;
    dt = dt.plus({ days: resid / MOON_SUN_DEG_PER_DAY });
  }
  return dt.toUTC().toISO()!;
}

/** ISO UTC del regreso del Sol a su longitud natal (revolución solar), buscando
 *  hacia adelante desde fromIso. Reusa la técnica de derived.ts. */
export function solarReturnDate(natal: ChartInput, fromIso?: string): string {
  const natalSunLon = computeChart(natal).bodies.find((b) => b.body === "sun")!.longitude;
  const from = fromIso ? DateTime.fromISO(fromIso, { zone: "utc" }) : DateTime.utc();
  const local = from.setZone(natal.timeZone);
  // candidato: el cumpleaños solar de ESTE año; si ya pasó, el del próximo
  let dt = DateTime.fromObject(
    { year: local.year, month: natal.month, day: natal.day, hour: natal.hour, minute: natal.minute },
    { zone: natal.timeZone },
  );
  if (dt.toUTC() < from) dt = dt.plus({ years: 1 });
  for (let i = 0; i < 8; i++) {
    const sunNow = computeChart({ ...natal, year: dt.year, month: dt.month, day: dt.day, hour: dt.hour, minute: dt.minute })
      .bodies.find((b) => b.body === "sun")!.longitude;
    const diff = (((natalSunLon - sunNow + 540) % 360)) - 180;
    if (Math.abs(diff) < 1e-4) break;
    dt = dt.plus({ days: diff / SUN_DEG_PER_DAY });
  }
  return dt.toUTC().toISO()!;
}
