import { describe, it, expect } from "vitest";
import { TAROT_DECK } from "@aluna/core";
import {
  positionsForTemplate,
  usedCardIds,
  filterManualCandidates,
  addMainCard,
  removeMainCard,
  toggleReversed,
  addJumperCard,
  removeJumperCard,
  cardMatchesSuit,
  MAX_JUMPERS,
  type PickedCard,
} from "../tarot-manual-picker";

describe("positionsForTemplate", () => {
  it("three → past/present/future", () => {
    expect(positionsForTemplate("three", 3)).toEqual(["past", "present", "future"]);
  });
  it("daily → [day], sin importar freeCount", () => {
    expect(positionsForTemplate("daily", 5)).toEqual(["day"]);
  });
  it("free → free-1..N según freeCount", () => {
    expect(positionsForTemplate("free", 4)).toEqual(["free-1", "free-2", "free-3", "free-4"]);
  });
});

describe("cardMatchesSuit", () => {
  const major = TAROT_DECK.find((c) => c.arcana === "major")!;
  const wand = TAROT_DECK.find((c) => c.suit === "wands")!;
  it("all acepta cualquier carta", () => {
    expect(cardMatchesSuit(major, "all")).toBe(true);
    expect(cardMatchesSuit(wand, "all")).toBe(true);
  });
  it("major solo acepta arcanos mayores", () => {
    expect(cardMatchesSuit(major, "major")).toBe(true);
    expect(cardMatchesSuit(wand, "major")).toBe(false);
  });
  it("un palo solo acepta esa suit", () => {
    expect(cardMatchesSuit(wand, "wands")).toBe(true);
    expect(cardMatchesSuit(wand, "cups")).toBe(false);
  });
});

describe("usedCardIds / filterManualCandidates: sin duplicados cruzando main+jumpers", () => {
  it("una carta ya elegida en main no aparece entre los candidatos para jumpers", () => {
    const main: PickedCard[] = [{ cardId: "fool", reversed: false, position: "past" }];
    const jumpers: PickedCard[] = [{ cardId: "sun", reversed: false, position: "jumper-1" }];
    const used = usedCardIds(main, jumpers);
    expect(used.has("fool")).toBe(true);
    expect(used.has("sun")).toBe(true);
    const candidates = filterManualCandidates(TAROT_DECK, used, "all", "", (id) => id);
    expect(candidates.some((c) => c.id === "fool")).toBe(false);
    expect(candidates.some((c) => c.id === "sun")).toBe(false);
  });

  it("filtra por nombre localizado (case-insensitive, con acentos tal cual el diccionario)", () => {
    const candidates = filterManualCandidates(TAROT_DECK, new Set(), "all", "FOO", (id) =>
      id === "fool" ? "The Fool" : id,
    );
    expect(candidates).toHaveLength(1);
    expect(candidates[0]!.id).toBe("fool");
  });

  it("filtra por palo", () => {
    const candidates = filterManualCandidates(TAROT_DECK, new Set(), "wands", "", (id) => id);
    expect(candidates.every((c) => c.suit === "wands")).toBe(true);
    expect(candidates.length).toBeGreaterThan(0);
  });
});

describe("addMainCard / removeMainCard", () => {
  const positions = ["past", "present", "future"];

  it("agrega cartas en orden hasta el límite de posiciones", () => {
    let main: PickedCard[] = [];
    main = addMainCard(main, "fool", positions);
    main = addMainCard(main, "sun", positions);
    main = addMainCard(main, "moon", positions);
    expect(main).toEqual([
      { cardId: "fool", reversed: false, position: "past" },
      { cardId: "sun", reversed: false, position: "present" },
      { cardId: "moon", reversed: false, position: "future" },
    ]);
  });

  it("no agrega más allá del límite de posiciones", () => {
    let main: PickedCard[] = [];
    for (const id of ["fool", "sun", "moon", "star"]) main = addMainCard(main, id, positions);
    expect(main).toHaveLength(3);
  });

  it("al quitar una carta, reindexa las posiciones restantes en orden", () => {
    let main: PickedCard[] = [];
    main = addMainCard(main, "fool", positions);
    main = addMainCard(main, "sun", positions);
    main = addMainCard(main, "moon", positions);
    main = removeMainCard(main, "sun", positions);
    expect(main).toEqual([
      { cardId: "fool", reversed: false, position: "past" },
      { cardId: "moon", reversed: false, position: "present" },
    ]);
  });
});

describe("toggleReversed", () => {
  it("invierte solo la carta indicada, sin tocar las demás", () => {
    const list: PickedCard[] = [
      { cardId: "fool", reversed: false, position: "past" },
      { cardId: "sun", reversed: false, position: "present" },
    ];
    const next = toggleReversed(list, "fool");
    expect(next[0]!.reversed).toBe(true);
    expect(next[1]!.reversed).toBe(false);
  });
});

describe("addJumperCard / removeJumperCard: máx 3", () => {
  it("agrega jumpers con position jumper-N", () => {
    let jumpers: PickedCard[] = [];
    jumpers = addJumperCard(jumpers, "fool");
    jumpers = addJumperCard(jumpers, "sun");
    expect(jumpers).toEqual([
      { cardId: "fool", reversed: false, position: "jumper-1" },
      { cardId: "sun", reversed: false, position: "jumper-2" },
    ]);
  });

  it("nunca supera MAX_JUMPERS (3)", () => {
    let jumpers: PickedCard[] = [];
    for (const id of ["fool", "sun", "moon", "star"]) jumpers = addJumperCard(jumpers, id);
    expect(jumpers).toHaveLength(MAX_JUMPERS);
    expect(jumpers.some((j) => j.cardId === "star")).toBe(false);
  });

  it("al quitar un jumper, reindexa jumper-N en orden", () => {
    let jumpers: PickedCard[] = [];
    jumpers = addJumperCard(jumpers, "fool");
    jumpers = addJumperCard(jumpers, "sun");
    jumpers = addJumperCard(jumpers, "moon");
    jumpers = removeJumperCard(jumpers, "fool");
    expect(jumpers).toEqual([
      { cardId: "sun", reversed: false, position: "jumper-1" },
      { cardId: "moon", reversed: false, position: "jumper-2" },
    ]);
  });
});
