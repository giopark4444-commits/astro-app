// packages/core/src/tarot/types.ts
export type TarotArcana = "major" | "minor";
export type TarotSuit = "wands" | "cups" | "swords" | "pentacles";

/** Correspondencia Golden Dawn: los mayores llevan planeta O signo (uno de los
 *  dos); los menores llevan solo el elemento de su palo. El eco numerológico
 *  es el número reducido de la carta (puente con el mundo Números). */
export interface TarotCorrespondence {
  planet?: string; // key de PLANETS de @aluna/core cuando aplique ("mercury"…)
  sign?: string; // key de ZODIAC_SIGNS cuando aplique ("aries"…)
  element: "fire" | "water" | "air" | "earth";
  numerology: number; // 0-21 mayores reducido; 1-10 pips; courts: página=11,caballero=12,reina=13,rey=14 reducidos
}

export interface TarotCard {
  id: string; // slug estable: "fool", "wands-03", "cups-queen"
  arcana: TarotArcana;
  suit?: TarotSuit; // solo minor
  number: number; // major: 0-21 · pips: 1-10 · page=11 knight=12 queen=13 king=14
  correspondence: TarotCorrespondence;
}

export interface TarotDeckInfo {
  id: "rws" | "aluna" | "custom";
  enabled: boolean; // aluna: false hasta que el arte esté verificado; custom: visibilidad del selector se decide por-usuario, no por este flag
}
