// packages/core/src/tarot/spreads.ts

/** Una posición dentro de una tirada: su clave estable y su rol semántico (los textos i18n viven aparte). */
export interface TarotSpreadPosition {
  key: string;
  role: string;
}

/** Plantilla de tirada: cuántas cartas y qué posición ocupa cada una. */
export interface TarotSpread {
  id: "daily" | "three" | "celtic-cross";
  cardCount: number;
  positions: readonly TarotSpreadPosition[];
}

/** Las 3 tiradas soportadas, como datos puros. */
export const TAROT_SPREADS: readonly TarotSpread[] = [
  {
    id: "daily",
    cardCount: 1,
    positions: [{ key: "day", role: "message" }],
  },
  {
    id: "three",
    cardCount: 3,
    positions: [
      { key: "past", role: "past" },
      { key: "present", role: "present" },
      { key: "future", role: "future" },
    ],
  },
  {
    id: "celtic-cross",
    cardCount: 10,
    positions: [
      { key: "heart", role: "heart" },
      { key: "crossing", role: "crossing" },
      { key: "foundation", role: "foundation" },
      { key: "past", role: "past" },
      { key: "crown", role: "crown" },
      { key: "future", role: "future" },
      { key: "self", role: "self" },
      { key: "environment", role: "environment" },
      { key: "hopes-fears", role: "hopes-fears" },
      { key: "outcome", role: "outcome" },
    ],
  },
];

/** Busca una tirada por id. Retorna undefined si no existe. */
export function spreadById(id: TarotSpread["id"]): TarotSpread | undefined {
  return TAROT_SPREADS.find((s) => s.id === id);
}
