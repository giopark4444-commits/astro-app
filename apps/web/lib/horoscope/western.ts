// Payload UNIVERSAL del horóscopo occidental por signo: no depende del usuario,
// solo de (signo, periodo, fecha local). Server-only (importa @aluna/ephemeris).
// La capa personal (hits natales) vive en la ruta, no aquí.
import { DateTime } from "luxon";
import {
  ZODIAC_SIGNS, solarPlacements, signAspectsToSign, scoreLifeAreasBySolarHouse,
  type SolarHousePlacement, type SignAspect, type SolarLifeAreaScore, type SolarHouseDriver,
  LIFE_AREAS, scoreTone, type LifeArea,
} from "@aluna/core";
import {
  computeBodies, localToJulianDay, lunations, stations, ingresses, type SkyEvent,
} from "@aluna/ephemeris";

export type HoroscopePeriod = "today" | "week" | "month" | "year";
export const HOROSCOPE_PERIODS: readonly HoroscopePeriod[] = ["today", "week", "month", "year"];

export interface PeriodRange {
  fromIso: string;
  toIso: string;
  sampleIsos: string[];
  localDate: string; // YYYY-MM-DD en la tz pedida (clave de caché)
  offsetMinutes: number;
}

export interface WesternPayload {
  sign: string;
  period: HoroscopePeriod;
  tz: string;
  range: { fromIso: string; toIso: string };
  houses: SolarHousePlacement[];
  signAspects: SignAspect[];
  events: SkyEvent[];
  areas: SolarLifeAreaScore[];
}

const SIGN_KEYS = new Set(ZODIAC_SIGNS.map((s) => s.key));

export function isValidTz(tz: string): boolean {
  return typeof tz === "string" && tz.length <= 64 && DateTime.now().setZone(tz).isValid;
}

/** Periodos ANCLADOS a calendario en la tz local; muestras deterministas a mediodía. */
export function resolvePeriodRange(period: HoroscopePeriod, tz: string, nowIso?: string): PeriodRange {
  const zone = isValidTz(tz) ? tz : "utc";
  const now = (nowIso ? DateTime.fromISO(nowIso, { zone: "utc" }) : DateTime.utc()).setZone(zone);
  const noon = (d: DateTime) => d.set({ hour: 12, minute: 0, second: 0, millisecond: 0 });
  let from: DateTime, to: DateTime, samples: DateTime[];
  if (period === "today") {
    from = now.startOf("day"); to = now.endOf("day"); samples = [noon(now)];
  } else if (period === "week") {
    from = now.startOf("week"); to = now.endOf("week"); // luxon: lunes-domingo
    samples = Array.from({ length: 7 }, (_, i) => noon(from.plus({ days: i })));
  } else if (period === "month") {
    from = now.startOf("month"); to = now.endOf("month");
    samples = [1, 6, 11, 16, 21, 26].map((d) => noon(from.set({ day: d })));
  } else {
    from = now.startOf("year"); to = now.endOf("year");
    samples = Array.from({ length: 12 }, (_, i) => noon(from.set({ month: i + 1, day: 15 })));
  }
  return {
    fromIso: from.toUTC().toISO()!,
    toIso: to.toUTC().toISO()!,
    sampleIsos: samples.map((s) => s.toUTC().toISO()!),
    localDate: now.toISODate()!,
    offsetMinutes: now.offset,
  };
}

function bodiesAtIso(iso: string) {
  const d = DateTime.fromISO(iso, { zone: "utc" });
  const { julianDayEt } = localToJulianDay({
    year: d.year, month: d.month, day: d.day, hour: d.hour, minute: d.minute, timeZone: "utc",
  });
  return computeBodies(julianDayEt);
}

export function computeWesternHoroscope(
  sign: string, period: HoroscopePeriod, tz: string, nowIso?: string,
): WesternPayload {
  if (!SIGN_KEYS.has(sign)) throw new Error(`Signo desconocido: ${sign}`);
  const range = resolvePeriodRange(period, tz, nowIso);

  // Posiciones representativas (para mostrar): hoy = la única muestra;
  // periodos largos = la muestra del medio (el "clima central" del periodo).
  const repIso = range.sampleIsos[Math.floor((range.sampleIsos.length - 1) / 2)]!;
  const rep = bodiesAtIso(repIso);
  const houses = solarPlacements(sign, rep);
  const signAspects = signAspectsToSign(sign, rep);

  // Eventos del rango: Luna solo en vistas cortas (en mes/año es ruido).
  const includeMoon = period === "today" || period === "week";
  const events = [
    ...lunations(range.fromIso, range.toIso),
    ...stations(range.fromIso, range.toIso),
    ...ingresses(range.fromIso, range.toIso, { includeMoon }),
  ].sort((a, b) => a.atIso.localeCompare(b.atIso));

  // Barras: promedio de las muestras + drivers por frecuencia (patrón /api/scores).
  const totals: Record<LifeArea, number> = { love: 0, money: 0, work: 0, health: 0, mood: 0, luck: 0 };
  const driverCount = new Map<string, { area: LifeArea; driver: SolarHouseDriver; count: number }>();
  for (const iso of range.sampleIsos) {
    const placements = solarPlacements(sign, bodiesAtIso(iso));
    for (const s of scoreLifeAreasBySolarHouse(placements)) {
      totals[s.area] += s.score;
      for (const d of s.drivers) {
        const key = `${s.area}:${d.body}:${d.house}`;
        const prev = driverCount.get(key);
        if (prev) prev.count += 1;
        else driverCount.set(key, { area: s.area, driver: d, count: 1 });
      }
    }
  }
  const n = range.sampleIsos.length;
  const all = [...driverCount.values()];
  const areas: SolarLifeAreaScore[] = LIFE_AREAS.map((area) => {
    const score = Math.round(totals[area] / n);
    return {
      area, score, tone: scoreTone(score),
      drivers: all.filter((x) => x.area === area).sort((a, b) => b.count - a.count).slice(0, 3).map((x) => x.driver),
    };
  });

  return { sign, period, tz: isValidTz(tz) ? tz : "utc", range: { fromIso: range.fromIso, toIso: range.toIso }, houses, signAspects, events, areas };
}

// LRU mínima universal: 12 signos × 4 periodos × pocos offsets/día.
const CACHE_MAX = 512;
const cache = new Map<string, WesternPayload>();

export function cachedWesternHoroscope(
  sign: string, period: HoroscopePeriod, tz: string, nowIso?: string,
): WesternPayload {
  const r = resolvePeriodRange(period, tz, nowIso);
  const key = `${sign}:${period}:${r.localDate}:${r.offsetMinutes}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const payload = computeWesternHoroscope(sign, period, tz, nowIso);
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, payload);
  return payload;
}
