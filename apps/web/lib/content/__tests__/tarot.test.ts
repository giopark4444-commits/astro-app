import { describe, expect, it } from "vitest";
import { TAROT_DECK } from "@aluna/core";
import { TAROT_CARDS_ES, composeReadingProse } from "../tarot-es";
import { TAROT_CARDS_EN } from "../tarot-en";

describe("contenido tarot", () => {
  it("cada carta cubierta existe en ES y EN con todos los campos no vacíos", () => {
    for (const card of TAROT_DECK) {
      for (const dict of [TAROT_CARDS_ES, TAROT_CARDS_EN]) {
        const c = dict[card.id];
        expect(c, card.id).toBeDefined();
        expect(c!.keywords.length).toBeGreaterThanOrEqual(3);
        for (const s of [c!.name, c!.essence, c!.bridge,
          c!.upright.love, c!.upright.work, c!.upright.path,
          c!.reversed.love, c!.reversed.work, c!.reversed.path]) {
          expect(s.trim().length, card.id).toBeGreaterThan(0);
        }
      }
    }
  });
  it("EN no es copia de ES (voz propia, no placeholder)", () => {
    for (const card of TAROT_DECK) {
      expect(TAROT_CARDS_EN[card.id]!.essence).not.toBe(TAROT_CARDS_ES[card.id]!.essence);
    }
  });
});

describe("composeReadingProse", () => {
  const threeCards = [
    { cardId: "fool", reversed: false, position: "past" },
    { cardId: "magician", reversed: false, position: "present" },
    { cardId: "empress", reversed: false, position: "future" },
  ];

  it("three: menciona los 3 nombres localizados (ES)", () => {
    const paras = composeReadingProse("es", "three", threeCards);
    const joined = paras.join(" ");
    expect(joined).toContain(TAROT_CARDS_ES.fool!.name);
    expect(joined).toContain(TAROT_CARDS_ES.magician!.name);
    expect(joined).toContain(TAROT_CARDS_ES.empress!.name);
  });

  it("three: menciona los 3 nombres localizados (EN)", () => {
    const paras = composeReadingProse("en", "three", threeCards);
    const joined = paras.join(" ");
    expect(joined).toContain(TAROT_CARDS_EN.fool!.name);
    expect(joined).toContain(TAROT_CARDS_EN.magician!.name);
    expect(joined).toContain(TAROT_CARDS_EN.empress!.name);
  });

  it("con question, la apertura la integra", () => {
    const question = "¿Debo cambiar de trabajo?";
    const paras = composeReadingProse("es", "three", threeCards, question);
    expect(paras[0]).toContain(question);
  });

  it("con 2/3 cartas invertidas, el cierre trae la señal de revisar antes de avanzar", () => {
    const mostlyReversed = [
      { cardId: "fool", reversed: true, position: "past" },
      { cardId: "magician", reversed: true, position: "present" },
      { cardId: "empress", reversed: false, position: "future" },
    ];
    const paras = composeReadingProse("es", "three", mostlyReversed);
    const closing = paras[paras.length - 1]!;
    expect(closing).toMatch(/revisar/i);
  });

  it("daily produce al menos 2 párrafos", () => {
    const paras = composeReadingProse("es", "daily", [
      { cardId: "sun", reversed: false, position: "day" },
    ]);
    expect(paras.length).toBeGreaterThanOrEqual(2);
  });
});
