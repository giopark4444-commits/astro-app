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

// Los aspectos del motor (detectAspects, packages/core/src/astrology/aspects.ts)
// incluyen los ángulos AC/MC como participantes (claves "ascendant"/"midheaven",
// ver packages/ephemeris/src/chart.ts) — PLANET_GLYPH no los cubre.
/** Glifo de cualquier participante de un aspecto (planetas + ángulos AC/MC). */
export const pointGlyph = (k: string): string =>
  PLANET_GLYPH[k] ?? (k === "ascendant" ? "Asc" : k === "midheaven" ? "MC" : "•");
