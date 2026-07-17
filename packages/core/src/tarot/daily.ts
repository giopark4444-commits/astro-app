// packages/core/src/tarot/daily.ts
import { drawCards, mulberry32, type DrawnCard } from "./shuffle";

/**
 * FNV-1a de 32 bits (offset 2166136261, prime 16777619) sobre un string arbitrario.
 * Determinista y estable entre plataformas/ejecuciones: base de la semilla del día.
 */
export function fnv1a32(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Semilla determinista para (userId, localDate): FNV-1a 32-bit de `${userId}|${localDate}`.
 * `localDate` en formato "YYYY-MM-DD" (fecha local del usuario, no UTC).
 */
export function dailySeed(userId: string, localDate: string): number {
  return fnv1a32(`${userId}|${localDate}`);
}

/**
 * Carta del día: determinista por (userId, localDate) — misma carta e inversión
 * siempre que se repita el par, distinta semilla ante cualquier cambio de usuario o fecha.
 */
export function dailyCard(userId: string, localDate: string): DrawnCard {
  const rng = mulberry32(dailySeed(userId, localDate));
  return drawCards(1, rng)[0]!;
}
