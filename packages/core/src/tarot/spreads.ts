// packages/core/src/tarot/spreads.ts

/** Posición de una carta en el lienzo de la tirada. x/y en [0,1] (relativos al
 *  lienzo), rotate en grados (para la carta "que cruza" de la cruz celta). */
export interface TarotLayoutPoint {
  x: number;
  y: number;
  rotate?: number;
}

/** Una posición dentro de una tirada: clave estable, rol semántico y su lugar en
 *  el diagrama (los textos i18n viven aparte, mapeados por `key`). */
export interface TarotSpreadPosition {
  key: string;
  role: string;
  layout: TarotLayoutPoint;
}

export type TarotSpreadId =
  | "daily"
  | "three"
  | "celtic-cross"
  | "relationship"
  | "year-wheel"
  | "decision"
  | "horseshoe"
  | "simple-cross"
  | "chakras"
  | "elements"
  | "yes-no";

/** Grupo del selector: destacadas (van con la voz de Aluna) vs secundarias. */
export type TarotSpreadGroup = "primary" | "secondary";

/** Plantilla de tirada: cuántas cartas, qué posición ocupa cada una y su grupo. */
export interface TarotSpread {
  id: TarotSpreadId;
  cardCount: number;
  group: TarotSpreadGroup;
  positions: readonly TarotSpreadPosition[];
}

// Doce meses de la Rueda del año en círculo (enero arriba, horario), radio 0.4.
const YEAR_WHEEL_MONTHS: readonly TarotSpreadPosition[] = (
  [
    ["month-1", 0.5, 0.1],
    ["month-2", 0.7, 0.15],
    ["month-3", 0.85, 0.3],
    ["month-4", 0.9, 0.5],
    ["month-5", 0.85, 0.7],
    ["month-6", 0.7, 0.85],
    ["month-7", 0.5, 0.9],
    ["month-8", 0.3, 0.85],
    ["month-9", 0.15, 0.7],
    ["month-10", 0.1, 0.5],
    ["month-11", 0.15, 0.3],
    ["month-12", 0.3, 0.15],
  ] as const
).map(([key, x, y]) => ({ key, role: "month", layout: { x, y } }));

/** Todas las tiradas soportadas, como datos puros. */
export const TAROT_SPREADS: readonly TarotSpread[] = [
  // ---- básicas ----
  {
    id: "daily",
    cardCount: 1,
    group: "primary",
    positions: [{ key: "day", role: "message", layout: { x: 0.5, y: 0.5 } }],
  },
  {
    id: "three",
    cardCount: 3,
    group: "primary",
    positions: [
      { key: "past", role: "past", layout: { x: 0.2, y: 0.5 } },
      { key: "present", role: "present", layout: { x: 0.5, y: 0.5 } },
      { key: "future", role: "future", layout: { x: 0.8, y: 0.5 } },
    ],
  },

  // ---- destacadas ----
  {
    id: "celtic-cross",
    cardCount: 10,
    group: "primary",
    positions: [
      { key: "heart", role: "heart", layout: { x: 0.28, y: 0.5 } },
      // I3: nudge deliberado (y 0.5→0.52) para que "crossing" no comparta
      // coords EXACTAS con "heart" — antes ambas cajas quedaban centradas en
      // el mismo punto y solo se distinguían por el rotate de la carta.
      { key: "crossing", role: "crossing", layout: { x: 0.28, y: 0.52, rotate: 90 } },
      { key: "foundation", role: "foundation", layout: { x: 0.28, y: 0.82 } },
      { key: "past", role: "past", layout: { x: 0.1, y: 0.5 } },
      { key: "crown", role: "crown", layout: { x: 0.28, y: 0.18 } },
      { key: "future", role: "future", layout: { x: 0.46, y: 0.5 } },
      { key: "self", role: "self", layout: { x: 0.78, y: 0.86 } },
      { key: "environment", role: "environment", layout: { x: 0.78, y: 0.62 } },
      { key: "hopes-fears", role: "hopes-fears", layout: { x: 0.78, y: 0.38 } },
      { key: "outcome", role: "outcome", layout: { x: 0.78, y: 0.14 } },
    ],
  },
  {
    id: "relationship",
    cardCount: 7,
    group: "primary",
    positions: [
      { key: "you", role: "you", layout: { x: 0.22, y: 0.4 } },
      { key: "other", role: "other", layout: { x: 0.78, y: 0.4 } },
      { key: "connection", role: "connection", layout: { x: 0.5, y: 0.4 } },
      { key: "your-feelings", role: "your-feelings", layout: { x: 0.22, y: 0.75 } },
      { key: "their-feelings", role: "their-feelings", layout: { x: 0.78, y: 0.75 } },
      { key: "challenge", role: "challenge", layout: { x: 0.5, y: 0.75 } },
      { key: "tendency", role: "tendency", layout: { x: 0.5, y: 0.08 } },
    ],
  },
  {
    id: "year-wheel",
    cardCount: 13,
    group: "primary",
    positions: [...YEAR_WHEEL_MONTHS, { key: "theme", role: "theme", layout: { x: 0.5, y: 0.5 } }],
  },
  {
    id: "decision",
    cardCount: 7,
    group: "primary",
    positions: [
      { key: "situation", role: "situation", layout: { x: 0.5, y: 0.08 } },
      { key: "option-a", role: "option-a", layout: { x: 0.24, y: 0.36 } },
      { key: "brings-a", role: "brings-a", layout: { x: 0.24, y: 0.64 } },
      { key: "option-b", role: "option-b", layout: { x: 0.76, y: 0.36 } },
      { key: "brings-b", role: "brings-b", layout: { x: 0.76, y: 0.64 } },
      { key: "unseen", role: "unseen", layout: { x: 0.5, y: 0.5 } },
      { key: "advice", role: "advice", layout: { x: 0.5, y: 0.92 } },
    ],
  },

  // ---- secundarias ----
  {
    id: "horseshoe",
    cardCount: 7,
    group: "secondary",
    positions: [
      { key: "past", role: "past", layout: { x: 0.1, y: 0.7 } },
      { key: "present", role: "present", layout: { x: 0.22, y: 0.35 } },
      { key: "hidden", role: "hidden", layout: { x: 0.38, y: 0.13 } },
      { key: "obstacle", role: "obstacle", layout: { x: 0.5, y: 0.06 } },
      { key: "environment", role: "environment", layout: { x: 0.62, y: 0.13 } },
      { key: "advice", role: "advice", layout: { x: 0.78, y: 0.35 } },
      { key: "tendency", role: "tendency", layout: { x: 0.9, y: 0.7 } },
    ],
  },
  {
    id: "simple-cross",
    cardCount: 5,
    group: "secondary",
    positions: [
      { key: "situation", role: "situation", layout: { x: 0.5, y: 0.5 } },
      { key: "cause", role: "cause", layout: { x: 0.5, y: 0.16 } },
      { key: "past", role: "past", layout: { x: 0.18, y: 0.5 } },
      { key: "future", role: "future", layout: { x: 0.82, y: 0.5 } },
      { key: "synthesis", role: "synthesis", layout: { x: 0.5, y: 0.84 } },
    ],
  },
  {
    id: "chakras",
    cardCount: 7,
    group: "secondary",
    positions: [
      { key: "chakra-crown", role: "chakra-crown", layout: { x: 0.5, y: 0.06 } },
      { key: "third-eye", role: "third-eye", layout: { x: 0.5, y: 0.2 } },
      { key: "throat", role: "throat", layout: { x: 0.5, y: 0.34 } },
      { key: "chakra-heart", role: "chakra-heart", layout: { x: 0.5, y: 0.5 } },
      { key: "solar", role: "solar", layout: { x: 0.5, y: 0.66 } },
      { key: "sacral", role: "sacral", layout: { x: 0.5, y: 0.8 } },
      { key: "root", role: "root", layout: { x: 0.5, y: 0.94 } },
    ],
  },
  {
    id: "elements",
    cardCount: 5,
    group: "secondary",
    positions: [
      { key: "spirit", role: "spirit", layout: { x: 0.5, y: 0.08 } },
      { key: "air", role: "air", layout: { x: 0.9, y: 0.42 } },
      { key: "fire", role: "fire", layout: { x: 0.74, y: 0.92 } },
      { key: "water", role: "water", layout: { x: 0.26, y: 0.92 } },
      { key: "earth", role: "earth", layout: { x: 0.1, y: 0.42 } },
    ],
  },
  {
    id: "yes-no",
    cardCount: 1,
    group: "secondary",
    positions: [{ key: "answer", role: "answer", layout: { x: 0.5, y: 0.5 } }],
  },
];

/** Busca una tirada por id. Retorna undefined si no existe. */
export function spreadById(id: TarotSpreadId): TarotSpread | undefined {
  return TAROT_SPREADS.find((s) => s.id === id);
}

/** Tiradas de un grupo (para el selector: destacadas vs secundarias). */
export function spreadsByGroup(group: TarotSpreadGroup): readonly TarotSpread[] {
  return TAROT_SPREADS.filter((s) => s.group === group);
}
