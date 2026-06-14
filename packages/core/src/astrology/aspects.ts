// packages/core/src/astrology/aspects.ts
import { ASPECTS, DEFAULT_ORBS } from "../constants/astrology";
import type { Aspect } from "./types";
import { angularSeparation, normalizeAngle } from "./signs";

export interface AspectPoint {
  key: string;
  longitude: number;
  speed?: number; // °/día; omitir para ángulos (AC/MC)
}

export interface AspectOptions {
  orbs?: Record<string, number>;
  includeMinor?: boolean;
}

export function detectAspects(points: AspectPoint[], opts: AspectOptions = {}): Aspect[] {
  const orbs = opts.orbs ?? DEFAULT_ORBS;
  const includeMinor = opts.includeMinor ?? false;
  const usable = ASPECTS.filter((a) => a.major || includeMinor);
  const result: Aspect[] = [];
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const p = points[i]!;
      const q = points[j]!;
      const sep = angularSeparation(p.longitude, q.longitude);
      for (const asp of usable) {
        const maxOrb = orbs[asp.key] ?? 0;
        const orb = Math.abs(sep - asp.angle);
        if (orb <= maxOrb) {
          result.push({
            a: p.key,
            b: q.key,
            aspect: asp.key,
            angle: asp.angle,
            orb: Number(orb.toFixed(2)),
            applying: isApplying(p, q, asp.angle),
            harmony: asp.harmony,
          });
          break; // un aspecto por par (el más ajustado por orden de ASPECTS)
        }
      }
    }
  }
  return result;
}

/** Aspectos entre DOS conjuntos (p.ej. tránsito × natal). Solo pares cruzados;
 *  el segundo conjunto (natal) se trata como fijo: pásalo con speed 0 para que
 *  aplicativo/separativo dependa solo del movimiento del primero (el tránsito).
 *  `a` = clave del primer conjunto, `b` = clave del segundo. */
export function detectAspectsBetween(
  moving: AspectPoint[],
  fixed: AspectPoint[],
  opts: AspectOptions = {},
): Aspect[] {
  const orbs = opts.orbs ?? DEFAULT_ORBS;
  const includeMinor = opts.includeMinor ?? false;
  const usable = ASPECTS.filter((a) => a.major || includeMinor);
  const result: Aspect[] = [];
  for (const p of moving) {
    for (const q of fixed) {
      const sep = angularSeparation(p.longitude, q.longitude);
      for (const asp of usable) {
        const maxOrb = orbs[asp.key] ?? 0;
        const orb = Math.abs(sep - asp.angle);
        if (orb <= maxOrb) {
          result.push({
            a: p.key,
            b: q.key,
            aspect: asp.key,
            angle: asp.angle,
            orb: Number(orb.toFixed(2)),
            applying: isApplying(p, q, asp.angle),
            harmony: asp.harmony,
          });
          break;
        }
      }
    }
  }
  return result;
}

function isApplying(p: AspectPoint, q: AspectPoint, idealAngle: number): boolean {
  if (p.speed === undefined || q.speed === undefined) return false;
  const dt = 0.02; // pequeño paso en días
  const sepNow = angularSeparation(p.longitude, q.longitude);
  const sepNext = angularSeparation(
    normalizeAngle(p.longitude + p.speed * dt),
    normalizeAngle(q.longitude + q.speed * dt),
  );
  return Math.abs(sepNext - idealAngle) < Math.abs(sepNow - idealAngle);
}
