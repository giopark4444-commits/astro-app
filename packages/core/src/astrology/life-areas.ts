// packages/core/src/astrology/life-areas.ts
import type { Aspect } from "./types";

/** Las seis áreas de vida que puntúa el "clima" de Aluna. */
export type LifeArea = "love" | "money" | "work" | "health" | "mood" | "luck";

export const LIFE_AREAS: readonly LifeArea[] = [
  "love",
  "money",
  "work",
  "health",
  "mood",
  "luck",
];

export type ScoreTone = "low" | "mixed" | "high";

/** Un aspecto que mueve un área (para mostrar el "por qué" sin que parezca arbitrario). */
export interface AreaDriver {
  transit: string; // planeta en tránsito
  natal: string; // punto natal tocado
  aspect: string;
  favorable: boolean;
}

export interface LifeAreaScore {
  area: LifeArea;
  /** 0..100; 50 = neutral (sin tránsitos relevantes). */
  score: number;
  tone: ScoreTone;
  /** Los aspectos que más mueven el área (máx 3, por magnitud). */
  drivers: AreaDriver[];
}

// Qué puntos natales "rigen" cada área: un tránsito que los aspecta mueve esa
// energía. Regencias tradicionales, simplificadas a lo esencial y defendible.
const AREA_RULERS: Record<LifeArea, readonly string[]> = {
  love: ["venus", "moon", "mars"],
  money: ["venus", "jupiter", "saturn"],
  work: ["mars", "saturn", "sun", "mercury"],
  health: ["sun", "mars", "saturn", "moon"],
  mood: ["moon", "sun", "mercury", "venus"],
  luck: ["jupiter", "sun", "north_node"],
};

// Peso del planeta EN TRÁNSITO: los lentos pesan más (su influencia dura y marca
// el clima de fondo); la Luna es veloz y fugaz (cuenta para "hoy", se promedia en
// periodos largos).
const TRANSIT_WEIGHT: Record<string, number> = {
  moon: 0.5,
  sun: 1,
  mercury: 1,
  venus: 1,
  mars: 1,
  jupiter: 1.3,
  saturn: 1.5,
  uranus: 1.5,
  neptune: 1.5,
  pluto: 1.5,
  chiron: 0.8,
  north_node: 0.6,
  south_node: 0.6,
  lilith: 0.6,
};

const BENEFIC = new Set(["venus", "jupiter"]);
const MALEFIC = new Set(["mars", "saturn", "pluto"]);

// Orbe máximo por aspecto (mismo criterio que DEFAULT_ORBS): normaliza la cercanía.
const MAX_ORB: Record<string, number> = {
  conjunction: 8,
  opposition: 8,
  trine: 7,
  square: 7,
  sextile: 6,
  semisextile: 2,
  semisquare: 2,
  sesquisquare: 2,
  quincunx: 3,
  quintile: 1.5,
};

const BASE = 50;
const IMPACT = 18;

/** Valencia (-1..+1) del aspecto: armónico = luz, tenso = reto; la conjunción (y
 *  neutros) dependen del planeta en tránsito (benéfico, maléfico o activación suave). */
function valence(asp: Aspect): number {
  if (asp.harmony === "soft") return 1;
  if (asp.harmony === "hard") return -1;
  if (BENEFIC.has(asp.a)) return 1;
  if (MALEFIC.has(asp.a)) return -0.6;
  return 0.3;
}

/** Cubeta de tono por score (única fuente de los umbrales; la usa el motor y la API
 *  al promediar periodos). */
export function scoreTone(score: number): ScoreTone {
  if (score >= 60) return "high";
  if (score <= 40) return "low";
  return "mixed";
}

/**
 * Puntúa las 6 áreas de vida (0..100, 50 = neutral) a partir de los aspectos
 * tránsito→natal de un momento. DETERMINISTA y explicable: cada aspecto a un
 * regente del área la mueve según su armonía, la cercanía del orbe y el peso del
 * planeta en tránsito. No es predicción ni fortuna: es el "clima" energético del
 * momento. Para periodos (semana/mes/año) el llamador promedia varias instantáneas.
 */
export function scoreLifeAreas(aspects: Aspect[]): LifeAreaScore[] {
  const raw: Record<LifeArea, number> = {
    love: BASE,
    money: BASE,
    work: BASE,
    health: BASE,
    mood: BASE,
    luck: BASE,
  };
  const contribs: Record<LifeArea, Array<{ delta: number; asp: Aspect }>> = {
    love: [],
    money: [],
    work: [],
    health: [],
    mood: [],
    luck: [],
  };

  for (const asp of aspects) {
    const maxOrb = MAX_ORB[asp.aspect] ?? 0;
    if (maxOrb <= 0) continue;
    const orbWeight = Math.max(0, 1 - asp.orb / maxOrb);
    if (orbWeight <= 0) continue;
    const planetWeight = TRANSIT_WEIGHT[asp.a] ?? 0.8;
    const delta = valence(asp) * IMPACT * orbWeight * planetWeight;
    if (delta === 0) continue;
    for (const area of LIFE_AREAS) {
      if (AREA_RULERS[area].includes(asp.b)) {
        raw[area] += delta;
        contribs[area].push({ delta, asp });
      }
    }
  }

  return LIFE_AREAS.map((area) => {
    const score = Math.round(Math.min(100, Math.max(0, raw[area])));
    const tone = scoreTone(score);
    const drivers: AreaDriver[] = contribs[area]
      .slice()
      .sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta))
      .slice(0, 3)
      .map((c) => ({
        transit: c.asp.a,
        natal: c.asp.b,
        aspect: c.asp.aspect,
        favorable: c.delta > 0,
      }));
    return { area, score, tone, drivers };
  });
}
