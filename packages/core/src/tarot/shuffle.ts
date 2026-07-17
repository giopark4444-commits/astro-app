// packages/core/src/tarot/shuffle.ts
import { TAROT_DECK } from "./deck";
import type { TarotCard } from "./types";

/** Generador de números pseudo-aleatorios: retorna x tal que 0 <= x < 1. */
export type Rng = () => number;

/** Carta resultante de una tirada, con su estado de inversión. */
export interface DrawnCard {
  card: TarotCard;
  reversed: boolean;
}

/**
 * mulberry32: PRNG determinista de 32 bits.
 * Misma semilla → misma secuencia siempre; usado para tests y para la carta del día.
 */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Baraja TAROT_DECK con Fisher-Yates (de atrás hacia adelante) sobre una copia.
 * TAROT_DECK nunca se muta.
 */
export function shuffleDeck(rng: Rng): TarotCard[] {
  const deck = [...TAROT_DECK];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = deck[i]!;
    deck[i] = deck[j]!;
    deck[j] = tmp;
  }
  return deck;
}

/**
 * Baraja el mazo y toma las primeras `count` cartas, decidiendo inversión
 * al 50% con el MISMO rng (para determinismo con semilla).
 * `reversals: false` fuerza todas las cartas derechas.
 */
export function drawCards(
  count: number,
  rng: Rng,
  opts?: { reversals?: boolean }
): DrawnCard[] {
  const reversalsEnabled = opts?.reversals ?? true;
  const shuffled = shuffleDeck(rng);
  return shuffled.slice(0, count).map((card) => ({
    card,
    reversed: reversalsEnabled ? rng() < 0.5 : false,
  }));
}
