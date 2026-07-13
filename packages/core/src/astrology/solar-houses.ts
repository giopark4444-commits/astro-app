// packages/core/src/astrology/solar-houses.ts
// Horóscopo por signo, técnica profesional: el signo elegido ES la casa 1
// (whole-sign) y los tránsitos se leen por la casa solar que ocupan, más los
// aspectos SIGNO-A-SIGNO (whole-sign, sin grados inventados — anti-funa).
import { ZODIAC_SIGNS, ASPECTS, type AspectHarmony } from "../constants/astrology";
import { signOfLongitude } from "./signs";
import {
  LIFE_AREAS, scoreTone, TRANSIT_WEIGHT, BENEFIC, MALEFIC,
  type LifeArea, type ScoreTone,
} from "./life-areas";

export interface SolarBodyInput { body: string; longitude: number; retrograde: boolean; }
export interface SolarHousePlacement { body: string; sign: string; house: number; retrograde: boolean; }
export interface SignAspect { body: string; sign: string; aspect: string; harmony: AspectHarmony; }
export interface SolarHouseDriver { body: string; house: number; favorable: boolean; }
export interface SolarLifeAreaScore { area: LifeArea; score: number; tone: ScoreTone; drivers: SolarHouseDriver[]; }

const SIGN_INDEX: Record<string, number> = Object.fromEntries(ZODIAC_SIGNS.map((s, i) => [s.key, i]));

/** Casa solar whole-sign: el signo base es la casa 1. */
export function solarHouseOf(baseSign: string, longitude: number): number {
  const base = SIGN_INDEX[baseSign];
  if (base === undefined) throw new Error(`Signo desconocido: ${baseSign}`);
  const idx = SIGN_INDEX[signOfLongitude(longitude).sign]!;
  return ((idx - base + 12) % 12) + 1;
}

export function solarPlacements(baseSign: string, bodies: SolarBodyInput[]): SolarHousePlacement[] {
  return bodies.map((b) => ({
    body: b.body,
    sign: signOfLongitude(b.longitude).sign,
    house: solarHouseOf(baseSign, b.longitude),
    retrograde: b.retrograde,
  }));
}

/** Aspectos por signo (mayores): distancia entre signos × 30° comparada exacta. */
export function signAspectsToSign(baseSign: string, bodies: SolarBodyInput[]): SignAspect[] {
  const base = SIGN_INDEX[baseSign];
  if (base === undefined) throw new Error(`Signo desconocido: ${baseSign}`);
  const majors = ASPECTS.filter((a) => a.major);
  const out: SignAspect[] = [];
  for (const b of bodies) {
    const sign = signOfLongitude(b.longitude).sign;
    const d = (SIGN_INDEX[sign]! - base + 12) % 12;
    const sep = Math.min(d, 12 - d) * 30;
    const asp = majors.find((a) => a.angle === sep);
    if (asp) out.push({ body: b.body, sign, aspect: asp.key, harmony: asp.harmony });
  }
  return out;
}

// Regencias por casa solar (tradición helenística simplificada y defendible):
// 5/7 amor · 2/8 recurso propio/compartido · 6/10 oficio/vocación ·
// 1/6/12 cuerpo-hábitos-descanso · 3/4 mente-raíz · 9/11 fortuna/buen espíritu.
export const SOLAR_HOUSE_AREAS: Record<LifeArea, readonly number[]> = {
  love: [5, 7],
  money: [2, 8],
  work: [6, 10],
  health: [1, 6, 12],
  mood: [3, 4],
  luck: [9, 11],
};

const BASE = 50;
const HOUSE_IMPACT = 12; // presencia en casa: más suave que un aspecto exacto (18)

function valenceOf(body: string): number {
  if (BENEFIC.has(body)) return 1;
  if (MALEFIC.has(body)) return -0.6;
  return 0.3; // activación suave
}

/** Puntúa las 6 áreas por PRESENCIA en casas solares. Determinista y explicable. */
export function scoreLifeAreasBySolarHouse(placements: SolarHousePlacement[]): SolarLifeAreaScore[] {
  const raw: Record<LifeArea, number> = { love: BASE, money: BASE, work: BASE, health: BASE, mood: BASE, luck: BASE };
  const contribs: Record<LifeArea, Array<{ delta: number; p: SolarHousePlacement }>> = {
    love: [], money: [], work: [], health: [], mood: [], luck: [],
  };
  for (const p of placements) {
    const delta = valenceOf(p.body) * HOUSE_IMPACT * (TRANSIT_WEIGHT[p.body] ?? 0.8);
    if (delta === 0) continue;
    for (const area of LIFE_AREAS) {
      if (SOLAR_HOUSE_AREAS[area].includes(p.house)) {
        raw[area] += delta;
        contribs[area].push({ delta, p });
      }
    }
  }
  return LIFE_AREAS.map((area) => {
    const score = Math.round(Math.min(100, Math.max(0, raw[area])));
    return {
      area,
      score,
      tone: scoreTone(score),
      drivers: contribs[area]
        .slice()
        .sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta))
        .slice(0, 3)
        .map((c) => ({ body: c.p.body, house: c.p.house, favorable: c.delta > 0 })),
    };
  });
}
