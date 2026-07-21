// packages/core/src/numerology/life-areas.ts
import type { PersonalCycles } from "./types";
import {
  type LifeArea,
  type LifeAreaScore,
  LIFE_AREAS,
  scoreTone,
} from "../astrology/life-areas";

/**
 * Correspondencia número→áreas fuertes (pitagórica, spec §5b). Cada dígito 1-9
 * "enciende" dos áreas de vida; los números maestros se reducen a 1-9 para el
 * lookup (`((v-1)%9)+1`), pero suman un extra por su intensidad de pico.
 */
const NUM_AFFINITY: Record<number, LifeArea[]> = {
  1: ["work", "mood"],
  2: ["love", "mood"],
  3: ["mood", "love"],
  4: ["work", "health"],
  5: ["luck", "mood"],
  6: ["love", "health"],
  7: ["mood", "health"],
  8: ["money", "work"],
  9: ["luck", "love"],
};

const BASE = 50;
const DAY_IMPACT = 18;
const MONTH_IMPACT = 8;
const YEAR_IMPACT = 4;
const MASTER_PEAK = 6;

/** Reduce cualquier valor (incl. maestros 11/22/33) a un dígito 1-9 para el lookup. */
function toDigit(value: number): number {
  return ((value - 1) % 9) + 1;
}

const clamp = (n: number) => Math.round(Math.min(100, Math.max(0, n)));

/**
 * Traduce la numerología del día (año/mes/día personal) a energía por área de vida.
 * DETERMINISTA: base 50 por área; el día personal aporta +18 a sus 2 áreas afines,
 * el mes +8, el año +4; un día maestro suma +6 extra a sus afines (pico). No es
 * predicción: es el "clima" numerológico de hoy. El "por qué" se teje en el texto
 * de la sección, no en la barra, así que `drivers` queda vacío (el `AreaDriver`
 * astro-específico no aplica aquí).
 */
export function scoreLifeAreasNumerology(cycles: PersonalCycles): LifeAreaScore[] {
  const raw: Record<LifeArea, number> = {
    love: BASE,
    money: BASE,
    work: BASE,
    health: BASE,
    mood: BASE,
    luck: BASE,
  };

  const boost = (value: number, amount: number) => {
    for (const area of NUM_AFFINITY[toDigit(value)] ?? []) raw[area] += amount;
  };

  boost(cycles.personalDay.value, DAY_IMPACT);
  boost(cycles.personalMonth.value, MONTH_IMPACT);
  boost(cycles.personalYear.value, YEAR_IMPACT);
  if (cycles.personalDay.isMaster) boost(cycles.personalDay.value, MASTER_PEAK);

  return LIFE_AREAS.map((area) => {
    const score = clamp(raw[area]);
    return { area, score, tone: scoreTone(score), drivers: [] };
  });
}
