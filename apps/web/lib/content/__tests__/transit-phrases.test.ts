import { describe, it, expect } from "vitest";
import { TRANSIT_PHRASES as ES, transitPhrase as phraseEs } from "../transit-phrases-es";
import { TRANSIT_PHRASES as EN, transitPhrase as phraseEn } from "../transit-phrases-en";

// Literales verificados contra el dominio real:
// - aspectos mayores de ASPECTS (packages/core/src/constants/astrology.ts) —
//   los únicos con orbe en TRANSIT_ORBS (app/api/chart/route.ts:35)
// - cuerpos de WEATHER_BODIES (app/api/chart/route.ts:32)
const ASPECTS = ["conjunction", "sextile", "square", "trine", "opposition"] as const;
const BODIES = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"] as const;

describe("frases de tránsito", () => {
  it("cubre aspecto×cuerpo en ambos idiomas, no vacía, ≤120 chars", () => {
    for (const a of ASPECTS) {
      for (const b of BODIES) {
        for (const M of [ES, EN]) {
          const s = M[`${a}:${b}`];
          expect(s, `${a}:${b}`).toBeTruthy();
          expect(s!.length, `${a}:${b} demasiado larga`).toBeLessThanOrEqual(120);
        }
      }
    }
  });

  it("trae fallback genérico por aspecto en ambos idiomas", () => {
    for (const a of ASPECTS) {
      for (const M of [ES, EN]) {
        const s = M[a];
        expect(s, `genérico ${a}`).toBeTruthy();
        expect(s!.length).toBeLessThanOrEqual(120);
      }
    }
  });

  it("fallback genérico por aspecto si el cuerpo no está", () => {
    expect(phraseEs("square", "chiron")).toBe(ES["square"]);
    expect(phraseEn("trine", "chiron")).toBe(EN["trine"]);
  });

  it("no repite frases (cada una se sostiene sola)", () => {
    for (const M of [ES, EN]) {
      const values = Object.values(M);
      expect(new Set(values).size).toBe(values.length);
    }
  });
});
