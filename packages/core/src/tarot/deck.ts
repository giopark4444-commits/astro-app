// packages/core/src/tarot/deck.ts
import { reduce } from "../numerology/reduction";
import type { TarotCard, TarotCorrespondence, TarotDeckInfo, TarotSuit } from "./types";

/** Arcanos mayores en orden canónico 0-21, con correspondencia Golden Dawn VERBATIM. */
const MAJOR_DEFS: ReadonlyArray<{
  id: string;
  number: number;
  correspondence: Omit<TarotCorrespondence, "numerology">;
}> = [
  { id: "fool", number: 0, correspondence: { planet: "uranus", element: "air" } },
  { id: "magician", number: 1, correspondence: { planet: "mercury", element: "air" } },
  { id: "high-priestess", number: 2, correspondence: { planet: "moon", element: "water" } },
  { id: "empress", number: 3, correspondence: { planet: "venus", element: "earth" } },
  { id: "emperor", number: 4, correspondence: { sign: "aries", element: "fire" } },
  { id: "hierophant", number: 5, correspondence: { sign: "taurus", element: "earth" } },
  { id: "lovers", number: 6, correspondence: { sign: "gemini", element: "air" } },
  { id: "chariot", number: 7, correspondence: { sign: "cancer", element: "water" } },
  { id: "strength", number: 8, correspondence: { sign: "leo", element: "fire" } },
  { id: "hermit", number: 9, correspondence: { sign: "virgo", element: "earth" } },
  { id: "wheel-of-fortune", number: 10, correspondence: { planet: "jupiter", element: "fire" } },
  { id: "justice", number: 11, correspondence: { sign: "libra", element: "air" } },
  { id: "hanged-man", number: 12, correspondence: { planet: "neptune", element: "water" } },
  { id: "death", number: 13, correspondence: { sign: "scorpio", element: "water" } },
  { id: "temperance", number: 14, correspondence: { sign: "sagittarius", element: "fire" } },
  { id: "devil", number: 15, correspondence: { sign: "capricorn", element: "earth" } },
  { id: "tower", number: 16, correspondence: { planet: "mars", element: "fire" } },
  { id: "star", number: 17, correspondence: { sign: "aquarius", element: "air" } },
  { id: "moon", number: 18, correspondence: { sign: "pisces", element: "water" } },
  { id: "sun", number: 19, correspondence: { planet: "sun", element: "fire" } },
  { id: "judgement", number: 20, correspondence: { planet: "pluto", element: "fire" } },
  { id: "world", number: 21, correspondence: { planet: "saturn", element: "earth" } },
];

/** Palos en orden canónico, con su elemento Golden Dawn. */
const SUIT_ELEMENTS: Record<TarotSuit, TarotCorrespondence["element"]> = {
  wands: "fire",
  cups: "water",
  swords: "air",
  pentacles: "earth",
};

const SUITS: readonly TarotSuit[] = ["wands", "cups", "swords", "pentacles"];

/** Rango de la corte: page=11, knight=12, queen=13, king=14. */
const COURTS: ReadonlyArray<{ id: string; number: number }> = [
  { id: "page", number: 11 },
  { id: "knight", number: 12 },
  { id: "queen", number: 13 },
  { id: "king", number: 14 },
];

function buildMajors(): TarotCard[] {
  return MAJOR_DEFS.map(({ id, number, correspondence }) => ({
    id,
    arcana: "major",
    number,
    correspondence: { ...correspondence, numerology: reduce(number) },
  }));
}

function buildMinors(): TarotCard[] {
  const cards: TarotCard[] = [];
  for (const suit of SUITS) {
    const element = SUIT_ELEMENTS[suit];
    // Pips 1-10
    for (let n = 1; n <= 10; n += 1) {
      cards.push({
        id: `${suit}-${String(n).padStart(2, "0")}`,
        arcana: "minor",
        suit,
        number: n,
        correspondence: { element, numerology: reduce(n) },
      });
    }
    // Cortes: page, knight, queen, king
    for (const { id, number } of COURTS) {
      cards.push({
        id: `${suit}-${id}`,
        arcana: "minor",
        suit,
        number,
        correspondence: { element, numerology: reduce(number) },
      });
    }
  }
  return cards;
}

/** El mazo completo de 78 cartas (Rider-Waite-Smith como referencia estructural). */
export const TAROT_DECK: readonly TarotCard[] = [...buildMajors(), ...buildMinors()];

/** Registro de mazos disponibles (assets). RWS activo; Aluna en flag hasta que el arte esté verificado;
 *  custom (mazo propio por usuario, T4) habilitado — la VISIBILIDAD del selector se decide por-usuario. */
export const TAROT_DECKS: readonly TarotDeckInfo[] = [
  { id: "rws", enabled: true },
  { id: "aluna", enabled: false },
  { id: "custom", enabled: true },
];

const DECK_BY_ID: ReadonlyMap<string, TarotCard> = new Map(TAROT_DECK.map((c) => [c.id, c]));

export function cardById(id: string): TarotCard | undefined {
  return DECK_BY_ID.get(id);
}
