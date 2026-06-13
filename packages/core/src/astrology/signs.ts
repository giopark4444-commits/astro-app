// packages/core/src/astrology/signs.ts
import { ZODIAC_SIGNS } from "../constants/astrology";

export function normalizeAngle(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

export interface SignPosition {
  sign: string;
  signIndex: number;
  signDegree: number;
  degree: number;
  minute: number;
  second: number;
}

export function signOfLongitude(longitude: number): SignPosition {
  const lon = normalizeAngle(longitude);
  const signIndex = Math.floor(lon / 30);
  const signDegree = lon - signIndex * 30;
  const degree = Math.floor(signDegree);
  const minuteFloat = (signDegree - degree) * 60;
  const minute = Math.floor(minuteFloat);
  const second = Math.min(59, Math.round((minuteFloat - minute) * 60));
  const sign = ZODIAC_SIGNS[signIndex]!.key;
  return { sign, signIndex, signDegree, degree, minute, second };
}

/** Separación angular mínima (0-180) entre dos longitudes. */
export function angularSeparation(a: number, b: number): number {
  const diff = Math.abs(normalizeAngle(a) - normalizeAngle(b)) % 360;
  return diff > 180 ? 360 - diff : diff;
}
