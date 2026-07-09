// Etiquetas de la carta astral (ES/EN), espejo de apps/web/lib/content/astrology-labels.ts.
// Los glifos de signos/planetas viven en @aluna/core (ZODIAC_SIGNS/PLANETS, RN-safe);
// aquí solo los nombres traducidos + los glifos de aspecto (no están en el dominio).

import type { Locale } from "../lib/i18n-context";

export interface AstroLabelMaps {
  signs: Record<string, string>;
  bodies: Record<string, string>;
  aspects: Record<string, string>;
  dignities: Record<string, string>;
  elements: Record<string, string>;
  modalities: Record<string, string>;
  patterns: Record<string, string>;
  houses: Record<string, string>;
}

export const ASPECT_GLYPHS: Record<string, string> = {
  conjunction: "☌",
  sextile: "⚹",
  square: "□",
  trine: "△",
  opposition: "☍",
  semisextile: "⚺",
  semisquare: "∠",
  sesquisquare: "⚼",
  quincunx: "⚻",
  quintile: "Q",
};

const ES: AstroLabelMaps = {
  signs: {
    aries: "Aries", taurus: "Tauro", gemini: "Géminis", cancer: "Cáncer",
    leo: "Leo", virgo: "Virgo", libra: "Libra", scorpio: "Escorpio",
    sagittarius: "Sagitario", capricorn: "Capricornio", aquarius: "Acuario", pisces: "Piscis",
  },
  bodies: {
    sun: "Sol", moon: "Luna", mercury: "Mercurio", venus: "Venus", mars: "Marte",
    jupiter: "Júpiter", saturn: "Saturno", uranus: "Urano", neptune: "Neptuno", pluto: "Plutón",
    chiron: "Quirón", north_node: "Nodo Norte", south_node: "Nodo Sur", lilith: "Lilith",
  },
  aspects: {
    conjunction: "Conjunción", sextile: "Sextil", square: "Cuadratura", trine: "Trígono",
    opposition: "Oposición", semisextile: "Semisextil", semisquare: "Semicuadratura",
    sesquisquare: "Sesquicuadratura", quincunx: "Quincuncio", quintile: "Quintil",
  },
  dignities: { domicile: "Domicilio", exaltation: "Exaltación", exile: "Exilio", fall: "Caída" },
  elements: { fire: "Fuego", earth: "Tierra", air: "Aire", water: "Agua" },
  modalities: { cardinal: "Cardinal", fixed: "Fijo", mutable: "Mutable" },
  patterns: { stellium: "Stellium", grand_trine: "Gran Trígono", t_square: "T-Cuadrada" },
  houses: {
    placidus: "Placidus", koch: "Koch", equal: "Iguales", whole: "Signo entero",
    regiomontanus: "Regiomontano", porphyry: "Porfirio",
  },
};

const EN: AstroLabelMaps = {
  signs: {
    aries: "Aries", taurus: "Taurus", gemini: "Gemini", cancer: "Cancer",
    leo: "Leo", virgo: "Virgo", libra: "Libra", scorpio: "Scorpio",
    sagittarius: "Sagittarius", capricorn: "Capricorn", aquarius: "Aquarius", pisces: "Pisces",
  },
  bodies: {
    sun: "Sun", moon: "Moon", mercury: "Mercury", venus: "Venus", mars: "Mars",
    jupiter: "Jupiter", saturn: "Saturn", uranus: "Uranus", neptune: "Neptune", pluto: "Pluto",
    chiron: "Chiron", north_node: "North Node", south_node: "South Node", lilith: "Lilith",
  },
  aspects: {
    conjunction: "Conjunction", sextile: "Sextile", square: "Square", trine: "Trine",
    opposition: "Opposition", semisextile: "Semisextile", semisquare: "Semisquare",
    sesquisquare: "Sesquisquare", quincunx: "Quincunx", quintile: "Quintile",
  },
  dignities: { domicile: "Domicile", exaltation: "Exaltation", exile: "Exile", fall: "Fall" },
  elements: { fire: "Fire", earth: "Earth", air: "Air", water: "Water" },
  modalities: { cardinal: "Cardinal", fixed: "Fixed", mutable: "Mutable" },
  patterns: { stellium: "Stellium", grand_trine: "Grand Trine", t_square: "T-Square" },
  houses: {
    placidus: "Placidus", koch: "Koch", equal: "Equal", whole: "Whole sign",
    regiomontanus: "Regiomontanus", porphyry: "Porphyry",
  },
};

export function astroLabels(locale: Locale): AstroLabelMaps {
  return locale === "en" ? EN : ES;
}
