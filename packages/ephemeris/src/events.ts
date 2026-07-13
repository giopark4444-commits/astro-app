// packages/ephemeris/src/events.ts
// Eventos astronómicos de un rango: lunaciones (+eclipse), estaciones, ingresos.
// Técnica: muestreo + bisección sobre f(t) continua (mismo espíritu Newton que
// derived.ts/jie.ts, pero con bracket garantizado). Server-only (sweph).
import { DateTime } from "luxon";
import sweph from "sweph";
import { normalizeAngle, signOfLongitude } from "@aluna/core";
import { computeBodies, type RawBody } from "./bodies";
import { localToJulianDay } from "./time";
import { initEphemeris } from "./init";

export type SkyEvent =
  | { kind: "lunation"; atIso: string; phase: "new" | "full"; sign: string; longitude: number; eclipse: "solar" | "lunar" | null }
  | { kind: "station"; atIso: string; body: string; direction: "retrograde" | "direct"; sign: string }
  | { kind: "ingress"; atIso: string; body: string; fromSign: string; toSign: string };

interface Jd { et: number; ut: number; }

function jdAt(dt: DateTime): Jd {
  const u = dt.toUTC();
  const r = localToJulianDay({ year: u.year, month: u.month, day: u.day, hour: u.hour, minute: u.minute, timeZone: "utc" });
  return { et: r.julianDayEt, ut: r.julianDayUt };
}

function bodiesAt(dt: DateTime): RawBody[] {
  return computeBodies(jdAt(dt).et);
}

function bodyAt(dt: DateTime, key: string): RawBody {
  const b = bodiesAt(dt).find((x) => x.body === key);
  if (!b) throw new Error(`cuerpo desconocido: ${key}`);
  return b;
}

/** Delta con signo hacia el objetivo, en (-180, 180] — continua salvo en la antípoda. */
function signedDelta(target: number, value: number): number {
  return ((target - value + 540) % 360) - 180;
}

/**
 * Raíces de f en [from,to]: muestrea cada stepDays; donde f cambia de signo SIN
 * salto de discontinuidad (|f1-f0| < jumpGuard), bisecta 40 veces (~µs de precisión
 * temporal sobra; nos quedamos a ~seg). Devuelve los DateTime de las raíces.
 */
function findCrossings(
  from: DateTime, to: DateTime, stepDays: number,
  f: (dt: DateTime) => number, jumpGuard = 180,
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

const ECLIPSE_FLAGS = () => sweph.constants.SEFLG_SWIEPH;

/** ¿Hay eclipse cuyo máximo cae a <2 días del instante? (funciones nativas de sweph). */
function eclipseNear(jdUt: number, phase: "new" | "full"): "solar" | "lunar" | null {
  initEphemeris();
  try {
    // El .d.ts del binding tipa el 4º parámetro de sol_eclipse_when_glob como
    // `number`, pero es un bug de esa declaración: contradice su propio comentario
    // ("backwards: boolean") y el ejemplo del propio .d.ts, y en runtime el
    // binding nativo LANZA "TypeError: Argument 4 should be a boolean" si se le
    // pasa un number (verificado). false es el valor real y correcto; solo
    // silenciamos el tipo, no cambiamos el comportamiento.
    const r = phase === "new"
      ? sweph.sol_eclipse_when_glob(jdUt - 2, ECLIPSE_FLAGS(), 0, false as unknown as number)
      : sweph.lun_eclipse_when(jdUt - 2, ECLIPSE_FLAGS(), 0, false);
    if (r.flag < 0) return null;
    const maxJd = r.data[0]!;
    if (Math.abs(maxJd - jdUt) < 2) return phase === "new" ? "solar" : "lunar";
    return null;
  } catch {
    return null; // defensivo: sin bandera antes que bandera falsa (anti-funa)
  }
}

/** Lunas Nuevas y Llenas del rango, con bandera de eclipse, ordenadas. */
export function lunations(fromIso: string, toIso: string): SkyEvent[] {
  const from = DateTime.fromISO(fromIso, { zone: "utc" });
  const to = DateTime.fromISO(toIso, { zone: "utc" });
  const elong = (dt: DateTime) => {
    const bs = bodiesAt(dt);
    const sun = bs.find((b) => b.body === "sun")!.longitude;
    const moon = bs.find((b) => b.body === "moon")!.longitude;
    return normalizeAngle(moon - sun);
  };
  const out: SkyEvent[] = [];
  for (const phase of ["new", "full"] as const) {
    const target = phase === "new" ? 0 : 180;
    // elongación crece ~12.2°/día; paso 1d = ~12° por muestra, seguro con guard 90
    const roots = findCrossings(from, to, 1, (dt) => signedDelta(target, elong(dt)), 90);
    for (const dt of roots) {
      const moon = bodyAt(dt, "moon");
      out.push({
        kind: "lunation",
        atIso: dt.toUTC().toISO()!,
        phase,
        sign: signOfLongitude(moon.longitude).sign,
        longitude: moon.longitude,
        eclipse: eclipseNear(jdAt(dt).ut, phase),
      });
    }
  }
  return out.sort((a, b) => a.atIso.localeCompare(b.atIso));
}
