// packages/core/src/astrology/moon-phase.ts
import { normalizeAngle } from "./signs";

export type MoonPhase =
  | "new"
  | "waxingCrescent"
  | "firstQuarter"
  | "waxingGibbous"
  | "full"
  | "waningGibbous"
  | "lastQuarter"
  | "waningCrescent";

const PHASE_BY_OCTANT: readonly MoonPhase[] = [
  "new",
  "waxingCrescent",
  "firstQuarter",
  "waxingGibbous",
  "full",
  "waningGibbous",
  "lastQuarter",
  "waningCrescent",
];

/** Fase lunar por la elongación Luna-Sol (0°=nueva, 180°=llena), en 8 octantes
 *  de 45° centrados en cada fase (p.ej. "nueva" = -22.5°..22.5°). */
export function moonPhase(sunLongitude: number, moonLongitude: number): MoonPhase {
  const elongation = normalizeAngle(moonLongitude - sunLongitude);
  const octant = Math.floor((elongation + 22.5) / 45) % 8;
  return PHASE_BY_OCTANT[octant]!;
}
