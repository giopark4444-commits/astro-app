// packages/core/src/astrology/dignity.ts
import { PLANETS, ZODIAC_SIGNS } from "../constants/astrology";
import type { Dignity } from "./types";

function oppositeSign(signKey: string): string {
  const idx = ZODIAC_SIGNS.findIndex((s) => s.key === signKey);
  if (idx < 0) return signKey;
  return ZODIAC_SIGNS[(idx + 6) % 12]!.key;
}

/** Dignidad esencial de un cuerpo en un signo: domicilio/exaltación/exilio/caída/null. */
export function dignityOf(bodyKey: string, signKey: string): Dignity {
  const planet = PLANETS.find((p) => p.key === bodyKey);
  if (!planet) return null;
  if (planet.domicile?.includes(signKey)) return "domicile";
  if (planet.exaltation?.includes(signKey)) return "exaltation";
  if (planet.domicile?.some((d) => oppositeSign(d) === signKey)) return "exile";
  if (planet.exaltation?.some((e) => oppositeSign(e) === signKey)) return "fall";
  return null;
}
