// packages/core/src/astrology/distribution.ts
import { ZODIAC_SIGNS } from "../constants/astrology";
import type { Element, Modality, Polarity } from "../constants/astrology";
import type { Distribution } from "./types";
import { signOfLongitude } from "./signs";

export interface DistributionBody {
  key: string;
  longitude: number;
}

export function computeDistribution(bodies: DistributionBody[]): Distribution {
  const elements: Record<Element, number> = { fire: 0, earth: 0, air: 0, water: 0 };
  const modalities: Record<Modality, number> = { cardinal: 0, fixed: 0, mutable: 0 };
  const polarities: Record<Polarity, number> = { yang: 0, yin: 0 };
  for (const b of bodies) {
    const { signIndex } = signOfLongitude(b.longitude);
    const sign = ZODIAC_SIGNS[signIndex]!;
    elements[sign.element] += 1;
    modalities[sign.modality] += 1;
    polarities[sign.polarity] += 1;
  }
  return {
    elements,
    modalities,
    polarities,
    dominantElement: maxKey(elements),
    dominantModality: maxKey(modalities),
  };
}

/** Cuadrante (1-4) a partir del número de casa (1-12). */
export function quadrantOfHouse(house: number): number {
  return Math.floor((house - 1) / 3) + 1;
}

function maxKey<T extends string>(rec: Record<T, number>): T {
  return (Object.entries(rec) as Array<[T, number]>).reduce((a, b) => (b[1] > a[1] ? b : a))[0];
}
