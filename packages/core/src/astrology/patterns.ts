// packages/core/src/astrology/patterns.ts
import { ZODIAC_SIGNS } from "../constants/astrology";
import type { Pattern } from "./types";
import { signOfLongitude, angularSeparation } from "./signs";

export interface PatternBody {
  key: string;
  longitude: number;
}

const TRINE_ORB = 8;
const OPP_ORB = 8;
const SQUARE_ORB = 7;

export function detectPatterns(bodies: PatternBody[]): Pattern[] {
  return [...stelliums(bodies), ...grandTrines(bodies), ...tSquares(bodies)];
}

function stelliums(bodies: PatternBody[]): Pattern[] {
  const bySign = new Map<string, string[]>();
  for (const b of bodies) {
    const { signIndex } = signOfLongitude(b.longitude);
    const key = ZODIAC_SIGNS[signIndex]!.key;
    bySign.set(key, [...(bySign.get(key) ?? []), b.key]);
  }
  const out: Pattern[] = [];
  for (const members of bySign.values()) {
    if (members.length >= 3) out.push({ type: "stellium", bodies: members });
  }
  return out;
}

function isAspect(a: PatternBody, b: PatternBody, angle: number, orb: number): boolean {
  return Math.abs(angularSeparation(a.longitude, b.longitude) - angle) <= orb;
}

function grandTrines(bodies: PatternBody[]): Pattern[] {
  const out: Pattern[] = [];
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      for (let k = j + 1; k < bodies.length; k++) {
        const [a, b, c] = [bodies[i]!, bodies[j]!, bodies[k]!];
        if (isAspect(a, b, 120, TRINE_ORB) && isAspect(b, c, 120, TRINE_ORB) && isAspect(a, c, 120, TRINE_ORB)) {
          out.push({ type: "grand_trine", bodies: [a.key, b.key, c.key] });
        }
      }
    }
  }
  return out;
}

function tSquares(bodies: PatternBody[]): Pattern[] {
  const out: Pattern[] = [];
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const a = bodies[i]!;
      const b = bodies[j]!;
      if (!isAspect(a, b, 180, OPP_ORB)) continue;
      for (let k = 0; k < bodies.length; k++) {
        if (k === i || k === j) continue;
        const c = bodies[k]!;
        if (isAspect(a, c, 90, SQUARE_ORB) && isAspect(b, c, 90, SQUARE_ORB)) {
          out.push({ type: "t_square", bodies: [a.key, b.key, c.key] });
        }
      }
    }
  }
  return out;
}
