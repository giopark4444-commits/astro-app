// packages/ephemeris/src/lunar.ts
import { DateTime } from "luxon";
import type { ChartInput } from "@aluna/core";
import { computeBodies } from "./bodies";
import { localToJulianDay } from "./time";
import { computeChart } from "./chart";

const MOON_SUN_DEG_PER_DAY = 12.19; // elongación media Luna-Sol
const SUN_DEG_PER_DAY = 0.98563;
const SYNODIC_DAYS = 29.53; // mes sinódico medio (un ciclo lunar)

function elongationAt(dt: DateTime): number {
  const { julianDayEt } = localToJulianDay({
    year: dt.year, month: dt.month, day: dt.day, hour: dt.hour, minute: dt.minute, timeZone: "utc",
  });
  const b = computeBodies(julianDayEt);
  const sun = b.find((x) => x.body === "sun")!.longitude;
  const moon = b.find((x) => x.body === "moon")!.longitude;
  return (((moon - sun) % 360) + 360) % 360;
}

/** Newton sobre la elongación: refina el instante del cruce partiendo de un seed. */
function refineLunar(target: number, seed: DateTime): DateTime {
  let dt = seed;
  for (let i = 0; i < 10; i++) {
    const resid = ((((target - elongationAt(dt)) % 360) + 540) % 360) - 180; // -180..180
    if (Math.abs(resid) < 0.02) break;
    dt = dt.plus({ days: resid / MOON_SUN_DEG_PER_DAY });
  }
  return dt;
}

/** ISO UTC del próximo instante ESTRICTAMENTE posterior a fromIso donde la Luna
 *  está en conjunción (new, elong 0°) u oposición (full, 180°) con el Sol. */
export function nextLunarPhase(phase: "new" | "full", fromIso?: string): string {
  const target = phase === "new" ? 0 : 180;
  const from = fromIso ? DateTime.fromISO(fromIso, { zone: "utc" }) : DateTime.utc();
  // salto inicial hacia adelante hasta el cruce más cercano (delta crudo [0,360):
  // "justo antes" del cruce → delta pequeño → el cruce INMINENTE, no el del mes
  // que viene; "justo después" → delta ~360 → el próximo ciclo). Sin buffer de
  // grados (ese buffer se saltaba una luna a horas de distancia).
  const delta = (((target - elongationAt(from)) % 360) + 360) % 360;
  let dt = refineLunar(target, from.plus({ days: delta / MOON_SUN_DEG_PER_DAY }));
  // garantía de "posterior a from": si `from` cae en el propio cruce, Newton lo
  // re-encuentra a ~2-3 min (la conversión tiempo→DíaJuliano del repo tiene
  // resolución de minuto, así que un cruce converge con ±~2.4 min de fuzz) → hay
  // que tomar el del siguiente ciclo. El umbral de 5 min separa "mismo cruce
  // re-hallado" (~2-3 min) de un cruce genuino (~29 días), y solo descarta cruces
  // a <5 min de `from` (una ventana de 10 min por lunación — despreciable, y muy
  // por debajo de la hora que se saltaba lunas inminentes en la versión anterior).
  if (dt <= from.plus({ minutes: 5 })) dt = refineLunar(target, dt.plus({ days: SYNODIC_DAYS }));
  return dt.toUTC().toISO()!;
}

/** Newton sobre la longitud del Sol: refina el instante del regreso solar. */
function refineSolar(natal: ChartInput, natalSunLon: number, seed: DateTime): DateTime {
  let dt = seed;
  for (let i = 0; i < 8; i++) {
    const sunNow = computeChart({ ...natal, year: dt.year, month: dt.month, day: dt.day, hour: dt.hour, minute: dt.minute })
      .bodies.find((b) => b.body === "sun")!.longitude;
    const diff = ((natalSunLon - sunNow + 540) % 360) - 180;
    if (Math.abs(diff) < 1e-4) break;
    dt = dt.plus({ days: diff / SUN_DEG_PER_DAY });
  }
  return dt;
}

/** ISO UTC del regreso del Sol a su longitud natal (revolución solar), buscando
 *  hacia adelante desde fromIso. La revolución real se desvía hasta ~12-20h del
 *  cumpleaños civil (sierra bisiesta), así que el chequeo "posterior a from" va
 *  DESPUÉS de Newton, no solo sobre el candidato inicial. */
export function solarReturnDate(natal: ChartInput, fromIso?: string): string {
  const natalSunLon = computeChart(natal).bodies.find((b) => b.body === "sun")!.longitude;
  const from = fromIso ? DateTime.fromISO(fromIso, { zone: "utc" }) : DateTime.utc();
  const local = from.setZone(natal.timeZone);
  const seed = DateTime.fromObject(
    { year: local.year, month: natal.month, day: natal.day, hour: natal.hour, minute: natal.minute },
    { zone: natal.timeZone },
  );
  let dt = refineSolar(natal, natalSunLon, seed);
  if (dt.toUTC() < from) dt = refineSolar(natal, natalSunLon, dt.plus({ years: 1 }));
  return dt.toUTC().toISO()!;
}
