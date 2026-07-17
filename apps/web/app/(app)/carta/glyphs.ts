// Glifos compartidos de la carta (planetas y signos) con presentación de texto
// (U+FE0E: nunca emoji). Antes vivían en carta-view; ahora los comparten la
// vista, el panel de interpretación y las tablas extraídas.
import { ZODIAC_SIGNS, PLANETS } from "@aluna/core";

export const TEXT_VS = "︎"; // U+FE0E
export const SIGN_GLYPH: Record<string, string> = Object.fromEntries(
  ZODIAC_SIGNS.map((s) => [s.key, s.glyph + TEXT_VS]),
);
export const PLANET_GLYPH: Record<string, string> = Object.fromEntries(
  PLANETS.map((p) => [p.key, p.glyph + TEXT_VS]),
);
