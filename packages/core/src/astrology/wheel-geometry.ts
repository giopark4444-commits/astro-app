// packages/core/src/astrology/wheel-geometry.ts
// Geometría de la rueda de la carta (extraída VERBATIM de la web, donde está
// validada al arcominuto). Puro y RN-safe: genera coordenadas y strings de path
// SVG que renderizan igual en <svg> web y react-native-svg.
// Geometría astrológica estándar: Ascendente a la IZQUIERDA (9 en punto),
// longitud creciente en sentido ANTIHORARIO, Medio Cielo arriba. SVG con y
// hacia abajo → invertimos seno para que el antihorario se vea bien.
import type { BodyPosition } from "./types";

/** Radios y centro de la rueda (viewBox 0 0 360 360). */
export const WHEEL = {
  CX: 180,
  CY: 180,
  R_SIGN_OUT: 166,
  R_SIGN_IN: 136,
  R_SIGN_GLYPH: 151,
  R_HOUSE_IN: 58,
  R_HOUSE_NUM: 66,
  R_BODY: 114,
  R_ASPECT: 94,
} as const;

/** longitud eclíptica → punto en pantalla, con el Ascendente a la izquierda. */
export function pointAt(r: number, lon: number, asc: number): [number, number] {
  const a = ((180 + (lon - asc)) * Math.PI) / 180;
  return [WHEEL.CX + r * Math.cos(a), WHEEL.CY - r * Math.sin(a)];
}

/** Sector anular (anillo de signo) como path SVG cerrado. */
export function annularSector(
  rOut: number,
  rIn: number,
  lonA: number,
  lonB: number,
  asc: number,
): string {
  const [x1o, y1o] = pointAt(rOut, lonA, asc);
  const [x2o, y2o] = pointAt(rOut, lonB, asc);
  const [x2i, y2i] = pointAt(rIn, lonB, asc);
  const [x1i, y1i] = pointAt(rIn, lonA, asc);
  // Antihorario en pantalla = sweep-flag 0 (arco exterior), 1 al volver (interior).
  return `M ${x1o} ${y1o} A ${rOut} ${rOut} 0 0 0 ${x2o} ${y2o} L ${x2i} ${y2i} A ${rIn} ${rIn} 0 0 1 ${x1i} ${y1i} Z`;
}

/** Reparte cuerpos muy juntos para que sus glifos no se encimen. */
export function spreadBodies(bodies: BodyPosition[], gap: number): Map<string, number> {
  const sorted = [...bodies].sort((a, b) => a.longitude - b.longitude);
  const out = new Map<string, number>();
  let last = -1000;
  for (const b of sorted) {
    const a = b.longitude - last < gap ? last + gap : b.longitude;
    out.set(b.body, a);
    last = a;
  }
  return out;
}
