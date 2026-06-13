// packages/core/src/astrology/houses.ts
import { normalizeAngle } from "./signs";

/** Casa (1-12) en la que cae una longitud, dadas las 12 cúspides (cusps[0]=casa1). */
export function houseOfLongitude(longitude: number, cusps: number[]): number {
  const lon = normalizeAngle(longitude);
  for (let i = 0; i < 12; i++) {
    const start = normalizeAngle(cusps[i]!);
    const end = normalizeAngle(cusps[(i + 1) % 12]!);
    if (start <= end) {
      if (lon >= start && lon < end) return i + 1;
    } else if (lon >= start || lon < end) {
      return i + 1;
    }
  }
  return 1;
}
