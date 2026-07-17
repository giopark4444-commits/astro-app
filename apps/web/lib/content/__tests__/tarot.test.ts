import { describe, expect, it } from "vitest";
import { TAROT_DECK } from "@aluna/core";
import { TAROT_CARDS_ES } from "../tarot-es";
import { TAROT_CARDS_EN } from "../tarot-en";

const DONE: ReadonlyArray<(typeof TAROT_DECK)[number]["arcana"] | string> = ["major", "wands", "cups"]; // task 6-7 añaden swords/pentacles

const cardsDone = TAROT_DECK.filter((c) => DONE.includes(c.arcana) || DONE.includes(c.suit ?? ""));

describe("contenido tarot", () => {
  it("cada carta cubierta existe en ES y EN con todos los campos no vacíos", () => {
    for (const card of cardsDone) {
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
    for (const card of cardsDone) {
      expect(TAROT_CARDS_EN[card.id]!.essence).not.toBe(TAROT_CARDS_ES[card.id]!.essence);
    }
  });
});
