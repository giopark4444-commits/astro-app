export type Element = "fire" | "earth" | "air" | "water";
export type Modality = "cardinal" | "fixed" | "mutable";
export type Polarity = "yang" | "yin";

export interface SignDef {
  key: string;
  element: Element;
  modality: Modality;
  polarity: Polarity;
  glyph: string;
}

export const ZODIAC_SIGNS: readonly SignDef[] = [
  { key: "aries", element: "fire", modality: "cardinal", polarity: "yang", glyph: "♈" },
  { key: "taurus", element: "earth", modality: "fixed", polarity: "yin", glyph: "♉" },
  { key: "gemini", element: "air", modality: "mutable", polarity: "yang", glyph: "♊" },
  { key: "cancer", element: "water", modality: "cardinal", polarity: "yin", glyph: "♋" },
  { key: "leo", element: "fire", modality: "fixed", polarity: "yang", glyph: "♌" },
  { key: "virgo", element: "earth", modality: "mutable", polarity: "yin", glyph: "♍" },
  { key: "libra", element: "air", modality: "cardinal", polarity: "yang", glyph: "♎" },
  { key: "scorpio", element: "water", modality: "fixed", polarity: "yin", glyph: "♏" },
  { key: "sagittarius", element: "fire", modality: "mutable", polarity: "yang", glyph: "♐" },
  { key: "capricorn", element: "earth", modality: "cardinal", polarity: "yin", glyph: "♑" },
  { key: "aquarius", element: "air", modality: "fixed", polarity: "yang", glyph: "♒" },
  { key: "pisces", element: "water", modality: "mutable", polarity: "yin", glyph: "♓" },
] as const;

export interface PlanetDef {
  key: string;
  glyph: string;
  domicile?: string[];
  exaltation?: string[];
}

export const PLANETS: readonly PlanetDef[] = [
  { key: "sun", glyph: "☉", domicile: ["leo"], exaltation: ["aries"] },
  { key: "moon", glyph: "☽", domicile: ["cancer"], exaltation: ["taurus"] },
  { key: "mercury", glyph: "☿", domicile: ["gemini", "virgo"], exaltation: ["virgo"] },
  { key: "venus", glyph: "♀", domicile: ["taurus", "libra"], exaltation: ["pisces"] },
  { key: "mars", glyph: "♂", domicile: ["aries", "scorpio"], exaltation: ["capricorn"] },
  { key: "jupiter", glyph: "♃", domicile: ["sagittarius", "pisces"], exaltation: ["cancer"] },
  { key: "saturn", glyph: "♄", domicile: ["capricorn", "aquarius"], exaltation: ["libra"] },
  { key: "uranus", glyph: "♅", domicile: ["aquarius"] },
  { key: "neptune", glyph: "♆", domicile: ["pisces"] },
  { key: "pluto", glyph: "♇", domicile: ["scorpio"] },
  { key: "chiron", glyph: "⚷" },
  { key: "north_node", glyph: "☊" },
  { key: "south_node", glyph: "☋" },
  { key: "lilith", glyph: "⚸" },
] as const;

export type AspectHarmony = "hard" | "soft" | "neutral";

export interface AspectDef {
  key: string;
  angle: number;
  harmony: AspectHarmony;
  major: boolean;
}

export const ASPECTS: readonly AspectDef[] = [
  { key: "conjunction", angle: 0, harmony: "neutral", major: true },
  { key: "sextile", angle: 60, harmony: "soft", major: true },
  { key: "square", angle: 90, harmony: "hard", major: true },
  { key: "trine", angle: 120, harmony: "soft", major: true },
  { key: "opposition", angle: 180, harmony: "hard", major: true },
  { key: "semisextile", angle: 30, harmony: "neutral", major: false },
  { key: "semisquare", angle: 45, harmony: "hard", major: false },
  { key: "sesquisquare", angle: 135, harmony: "hard", major: false },
  { key: "quincunx", angle: 150, harmony: "neutral", major: false },
  { key: "quintile", angle: 72, harmony: "soft", major: false },
] as const;

export const DEFAULT_ORBS: Readonly<Record<string, number>> = {
  conjunction: 8, opposition: 8, trine: 7, square: 7, sextile: 6,
  semisextile: 2, semisquare: 2, sesquisquare: 2, quincunx: 3, quintile: 1.5,
};
