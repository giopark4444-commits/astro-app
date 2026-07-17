// packages/ephemeris/src/jie.ts
// Distancia (en días, con fracción) del nacimiento a los términos solares de MES
// (節): cruces de longitud solar múltiplo de 30° partiendo de 315° (Lichun). Los usa
// la edad de inicio de los 大運 (regla 3 días = 1 año). Newton sobre la longitud
// solar, mismo patrón que la revolución solar en derived.ts.
import { DateTime } from "luxon";
import type { ChartInput } from "@aluna/core";
import { normalizeAngle } from "@aluna/core";
import { computeChart } from "./chart";
import { computeBodies } from "./bodies";
import { localToJulianDay } from "./time";

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

// --- jieDatesInRange -------------------------------------------------------
// Fechas exactas de los 節 (múltiplos de 30° desde 315°/Lichun) dentro de un
// rango [fromIso, toIso], sin depender de una carta natal (no hay observador:
// la longitud solar eclíptica no depende de lat/long). Sun longitude se saca
// directo de computeBodies (mismo camino que bodyAt en events.ts), evitando
// computeChart (que exige ChartInput con tz/lat/long innecesarios aquí).

/** Longitud eclíptica del Sol en el instante UTC dado. */
function sunLongitudeAtUtc(dt: DateTime): number {
  const u = dt.toUTC();
  const jd = localToJulianDay({ year: u.year, month: u.month, day: u.day, hour: u.hour, minute: u.minute, timeZone: "utc" });
  return computeBodies(jd.julianDayEt).find((b) => b.body === "sun")!.longitude;
}

/** Sector de 節 (0-11) al que pertenece `lon`: múltiplos de 30° desde 315°. */
function jieSector(lon: number): number {
  return Math.floor((((lon - 315) % 360) + 360) % 360 / 30);
}

/**
 * Raíces de f en [from,to]: muestrea cada stepDays; donde f cambia de signo
 * SIN salto de discontinuidad (|f1-f0| < jumpGuard), bisecta 40 veces.
 * Réplica local de la técnica de `findCrossings` en events.ts (no exportada
 * desde ese módulo, así que no se puede importar directamente).
 */
function findCrossings(
  from: DateTime, to: DateTime, stepDays: number,
  f: (dt: DateTime) => number, jumpGuard = 90,
): DateTime[] {
  const out: DateTime[] = [];
  let t0 = from;
  let f0 = f(t0);
  while (t0 < to) {
    const t1 = DateTime.min(t0.plus({ days: stepDays }), to);
    const f1 = f(t1);
    if (f0 === 0) out.push(t0);
    else if (Math.sign(f0) !== Math.sign(f1) && Math.abs(f1 - f0) < jumpGuard) {
      let a = t0, b = t1, fa = f0;
      for (let i = 0; i < 40; i++) {
        const m = DateTime.fromMillis((a.toMillis() + b.toMillis()) / 2, { zone: "utc" });
        const fm = f(m);
        if (Math.sign(fm) === Math.sign(fa)) { a = m; fa = fm; } else { b = m; }
      }
      out.push(a);
    }
    if (t1.equals(to)) break;
    t0 = t1;
    f0 = f1;
  }
  return out;
}

/** Delta con signo hacia el objetivo, en (-180, 180]. */
function signedDeltaTo(target: number, lon: number): number {
  return ((target - lon + 540) % 360) - 180;
}

/**
 * Fechas exactas de los 節 (cruces de longitud solar por múltiplos de 30° en
 * fase Lichun 315°) dentro de [fromIso, toIso]. Paso de muestreo de 1 día
 * (el Sol recorre ~1°/día, muy por debajo del jumpGuard de 90°). Un rango
 * de un año calendario devuelve los 12 節.
 */
export function jieDatesInRange(fromIso: string, toIso: string): Array<{ atIso: string; solarLongitude: number }> {
  const from = DateTime.fromISO(fromIso, { zone: "utc" });
  const to = DateTime.fromISO(toIso, { zone: "utc" });
  const out: Array<{ atIso: string; solarLongitude: number }> = [];
  let t0 = from;
  let lon0 = sunLongitudeAtUtc(t0);
  while (t0 < to) {
    const t1 = DateTime.min(t0.plus({ days: 1 }), to);
    const lon1 = sunLongitudeAtUtc(t1);
    const s0 = jieSector(lon0);
    const s1 = jieSector(lon1);
    if (s0 !== s1) {
      // El Sol solo avanza: la frontera cruzada es el inicio del sector nuevo.
      const target = normalizeAngle(315 + s1 * 30);
      const root = findCrossings(t0, t1, 1, (dt) => signedDeltaTo(target, sunLongitudeAtUtc(dt)))[0];
      if (root) {
        out.push({ atIso: root.toUTC().toISO()!, solarLongitude: sunLongitudeAtUtc(root) });
      }
    }
    if (t1.equals(to)) break;
    t0 = t1;
    lon0 = lon1;
  }
  return out;
}
