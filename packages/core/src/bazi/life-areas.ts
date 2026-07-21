// packages/core/src/bazi/life-areas.ts
// Motor "Pilares → áreas de vida": traduce los Cuatro Pilares natales + el pilar del
// DÍA de hoy al clima energético de las 6 áreas (0..100). Gemelo del motor numerológico
// (numerology/life-areas). Puro y determinista; el "por qué" se teje en el texto de la
// sección, no en la barra, así que `drivers` queda vacío (igual que en numerología).
import { HEAVENLY_STEMS, type Pillar, type WuXingElement } from "./bazi";
import type { PillarSet } from "./interactions";
import { dayMasterStrength, favorableElements } from "./strength";
import {
  type LifeArea,
  type LifeAreaScore,
  LIFE_AREAS,
  scoreTone,
} from "../astrology/life-areas";

/**
 * Correspondencia elemento Wu Xing → áreas de vida (spec §5c). Cada uno de los cinco
 * elementos "enciende" dos áreas: madera=salud/ánimo, fuego=amor/ánimo,
 * tierra=trabajo/salud, metal=dinero/trabajo, agua=suerte/amor.
 */
const ELEMENT_AFFINITY: Record<WuXingElement, LifeArea[]> = {
  wood: ["health", "mood"],
  fire: ["love", "mood"],
  earth: ["work", "health"],
  metal: ["money", "work"],
  water: ["luck", "love"],
};

const BASE = 50;
const FAVOR = 16; // elemento del día es 喜用神 (favorable)
const AVOID = -14; // elemento del día es 忌神 (conviene evitarlo)
const NEUTRAL = 6; // ni favor ni avoid: activación suave

const mod = (n: number, m: number) => ((n % m) + m) % m;
const clamp = (n: number) => Math.round(Math.min(100, Math.max(0, n)));

/**
 * Puntúa las 6 áreas de vida (0..100, 50 = neutral) a partir de los Cuatro Pilares
 * natales y el pilar del DÍA de hoy. DETERMINISTA y explicable:
 *  1) Se computa la fuerza del Maestro del Día del natal (`dayMasterStrength`) y de ahí
 *     los elementos favorables (喜用神) / a evitar (忌神) según su verdicto.
 *  2) El elemento del TRONCO del día de hoy mueve SUS dos áreas afines (`ELEMENT_AFFINITY`):
 *     +16 si es favorable, -14 si conviene evitarlo, +6 si es neutro. (La rama del día
 *     se deja fuera de arranque — el tronco domina; combinarla es una mejora futura.)
 * No es predicción ni fortuna: es el "clima" de los pilares para hoy.
 */
export function scoreLifeAreasBazi(natal: PillarSet, dayPillar: Pillar): LifeAreaScore[] {
  const { verdict } = dayMasterStrength(natal);
  const { favor, avoid } = favorableElements(verdict, natal.day.stem);

  const dayElement = HEAVENLY_STEMS[mod(dayPillar.stem, 10)]!.element;
  const delta = favor.includes(dayElement)
    ? FAVOR
    : avoid.includes(dayElement)
      ? AVOID
      : NEUTRAL;

  const raw: Record<LifeArea, number> = {
    love: BASE,
    money: BASE,
    work: BASE,
    health: BASE,
    mood: BASE,
    luck: BASE,
  };
  for (const area of ELEMENT_AFFINITY[dayElement]) raw[area] += delta;

  return LIFE_AREAS.map((area) => {
    const score = clamp(raw[area]);
    return { area, score, tone: scoreTone(score), drivers: [] };
  });
}

/**
 * Combina varios conjuntos de puntajes por área (p. ej. astros + números + pilares) en
 * un único "General": para cada área, promedio simple de todos los sets que la incluyen
 * (pesos iguales de arranque — el spec permite reponderar), redondeado; `tone` recomputado
 * desde el promedio; `drivers` vacío. Determinista. Un área sin datos vuelve al neutral 50.
 */
export function combineLifeAreas(sets: LifeAreaScore[][]): LifeAreaScore[] {
  return LIFE_AREAS.map((area) => {
    const scores = sets
      .map((set) => set.find((s) => s.area === area)?.score)
      .filter((v): v is number => typeof v === "number");
    const score = scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : BASE;
    return { area, score, tone: scoreTone(score), drivers: [] };
  });
}
