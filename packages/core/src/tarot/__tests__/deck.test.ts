// packages/core/src/tarot/__tests__/deck.test.ts
import { describe, expect, it } from "vitest";
import { TAROT_DECK, TAROT_DECKS, cardById } from "../deck";

describe("TAROT_DECK", () => {
  it("tiene exactamente 78 cartas con ids únicos", () => {
    expect(TAROT_DECK).toHaveLength(78);
    expect(new Set(TAROT_DECK.map((c) => c.id)).size).toBe(78);
  });
  it("22 mayores (0-21) y 56 menores (14 por palo)", () => {
    const majors = TAROT_DECK.filter((c) => c.arcana === "major");
    expect(majors).toHaveLength(22);
    expect(majors.map((c) => c.number).sort((a, b) => a - b)).toEqual(
      Array.from({ length: 22 }, (_, i) => i),
    );
    for (const suit of ["wands", "cups", "swords", "pentacles"] as const) {
      expect(TAROT_DECK.filter((c) => c.suit === suit)).toHaveLength(14);
    }
  });
  it("correspondencias canónicas Golden Dawn (anclas)", () => {
    expect(cardById("emperor")!.correspondence.sign).toBe("aries");
    expect(cardById("magician")!.correspondence.planet).toBe("mercury");
    expect(cardById("wands-03")!.correspondence.element).toBe("fire");
    expect(cardById("cups-queen")!.correspondence.element).toBe("water");
  });
  it("todo mayor lleva planet O sign (exactamente uno); ningún menor lleva ninguno", () => {
    for (const c of TAROT_DECK) {
      const n = Number(!!c.correspondence.planet) + Number(!!c.correspondence.sign);
      expect(n, c.id).toBe(c.arcana === "major" ? 1 : 0);
    }
  });
  it("registro de mazos: rws activo, aluna registrado pero apagado", () => {
    expect(TAROT_DECKS.find((d) => d.id === "rws")!.enabled).toBe(true);
    expect(TAROT_DECKS.find((d) => d.id === "aluna")!.enabled).toBe(false);
  });
});
