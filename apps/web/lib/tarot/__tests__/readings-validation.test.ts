import { describe, it, expect } from "vitest";
import { validateReadingPayload } from "../validate-reading";

// Tres cartas reales del mazo RWS (deck.ts): "fool", "magician", "wands-01".
function validThreePayload(overrides: Record<string, unknown> = {}) {
  return {
    spread: "three",
    deck: "rws",
    cards: [
      { cardId: "fool", reversed: false, position: "past" },
      { cardId: "magician", reversed: true, position: "present" },
      { cardId: "wands-01", reversed: false, position: "future" },
    ],
    ...overrides,
  };
}

describe("validateReadingPayload", () => {
  it("three válido → ok", () => {
    const result = validateReadingPayload(validThreePayload());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.spread).toBe("three");
      expect(result.value.cards).toHaveLength(3);
      expect(result.value.deck).toBe("rws");
    }
  });

  it("celtic-cross → error (T2 no lo expone)", () => {
    const result = validateReadingPayload(
      validThreePayload({
        spread: "celtic-cross",
        cards: [
          { cardId: "fool", reversed: false, position: "heart" },
          { cardId: "magician", reversed: false, position: "crossing" },
        ],
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("invalid_spread");
  });

  it("cardId inventado → error", () => {
    const result = validateReadingPayload(
      validThreePayload({
        cards: [
          { cardId: "not-a-real-card", reversed: false, position: "past" },
          { cardId: "magician", reversed: true, position: "present" },
          { cardId: "wands-01", reversed: false, position: "future" },
        ],
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("invalid_cards");
  });

  it("posición repetida → error", () => {
    const result = validateReadingPayload(
      validThreePayload({
        cards: [
          { cardId: "fool", reversed: false, position: "past" },
          { cardId: "magician", reversed: true, position: "past" },
          { cardId: "wands-01", reversed: false, position: "future" },
        ],
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("invalid_cards");
  });

  it("2 cartas para three → error", () => {
    const result = validateReadingPayload(
      validThreePayload({
        cards: [
          { cardId: "fool", reversed: false, position: "past" },
          { cardId: "magician", reversed: true, position: "present" },
        ],
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("invalid_cards");
  });

  it("question de 281 caracteres → error", () => {
    const result = validateReadingPayload(validThreePayload({ question: "x".repeat(281) }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("invalid_question");
  });

  it("question de 280 caracteres exactos → ok (límite inclusivo)", () => {
    const result = validateReadingPayload(validThreePayload({ question: "x".repeat(280) }));
    expect(result.ok).toBe(true);
  });

  it("deck 'aluna' (disabled) → error", () => {
    const result = validateReadingPayload(validThreePayload({ deck: "aluna" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("invalid_deck");
  });

  it("deck desconocido → error", () => {
    const result = validateReadingPayload(validThreePayload({ deck: "tarot-de-marsella" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("invalid_deck");
  });

  it("spread daily con 1 carta válida → ok", () => {
    const result = validateReadingPayload({
      spread: "daily",
      deck: "rws",
      cards: [{ cardId: "sun", reversed: false, position: "day" }],
    });
    expect(result.ok).toBe(true);
  });

  it("body no-objeto → bad_request", () => {
    const result = validateReadingPayload("no soy un objeto");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("bad_request");
  });

  it("cards no es array → invalid_cards", () => {
    const result = validateReadingPayload(validThreePayload({ cards: "no-array" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("invalid_cards");
  });
});

// Mazo RWS: 22 arcanos mayores reales (deck.ts) para armar tiradas libres
// de hasta 11 cartas sin repetir cardId.
const MAJORS = [
  "fool", "magician", "high-priestess", "empress", "emperor", "hierophant",
  "lovers", "chariot", "strength", "hermit", "wheel-of-fortune", "justice",
];

function freeCard(i: number, overrides: Record<string, unknown> = {}) {
  return { cardId: MAJORS[i], reversed: false, position: `free-${i + 1}`, ...overrides };
}

function validFreePayload(count: number, overrides: Record<string, unknown> = {}) {
  return {
    spread: "free",
    deck: "rws",
    cards: Array.from({ length: count }, (_, i) => freeCard(i)),
    ...overrides,
  };
}

describe("validateReadingPayload — free y jumpers (T3)", () => {
  it("free con 5 cartas válido → ok", () => {
    const result = validateReadingPayload(validFreePayload(5));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.spread).toBe("free");
      expect(result.value.cards).toHaveLength(5);
    }
  });

  it("free con 1 carta (mínimo) → ok", () => {
    const result = validateReadingPayload(validFreePayload(1));
    expect(result.ok).toBe(true);
  });

  it("free con 10 cartas (máximo) → ok", () => {
    const result = validateReadingPayload({
      spread: "free",
      deck: "rws",
      cards: [...MAJORS, "hanged-man"].slice(0, 10).map((cardId, i) => ({
        cardId,
        reversed: false,
        position: `free-${i + 1}`,
      })),
    });
    expect(result.ok).toBe(true);
  });

  it("free con 11 cartas → invalid_cards (excede el máximo)", () => {
    const cards = [...MAJORS, "hanged-man"].slice(0, 11).map((cardId, i) => ({
      cardId,
      reversed: false,
      position: `free-${i + 1}`,
    }));
    expect(cards).toHaveLength(11);
    const result = validateReadingPayload({ spread: "free", deck: "rws", cards });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("invalid_cards");
  });

  it("free con 0 cartas → invalid_cards (bajo el mínimo)", () => {
    const result = validateReadingPayload(validFreePayload(0));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("invalid_cards");
  });

  it("free con positions no consecutivas (free-1,free-2,free-4) → invalid_cards", () => {
    const result = validateReadingPayload({
      spread: "free",
      deck: "rws",
      cards: [
        { cardId: MAJORS[0], reversed: false, position: "free-1" },
        { cardId: MAJORS[1], reversed: false, position: "free-2" },
        { cardId: MAJORS[2], reversed: false, position: "free-4" },
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("invalid_cards");
  });

  it("free con 1 jumper válido → ok, cardId único en todo el conjunto", () => {
    const result = validateReadingPayload({
      spread: "free",
      deck: "rws",
      cards: [
        ...Array.from({ length: 3 }, (_, i) => freeCard(i)),
        { cardId: MAJORS[3], reversed: true, position: "jumper-1", jumper: true },
      ],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.cards).toHaveLength(4);
      expect(result.value.cards.find((c) => c.position === "jumper-1")).toEqual({
        cardId: MAJORS[3],
        reversed: true,
        position: "jumper-1",
        jumper: true,
      });
    }
  });

  it("free con jumper duplicando un cardId ya usado en la tirada → invalid_cards", () => {
    const result = validateReadingPayload({
      spread: "free",
      deck: "rws",
      cards: [
        ...Array.from({ length: 3 }, (_, i) => freeCard(i)),
        { cardId: MAJORS[0], reversed: false, position: "jumper-1", jumper: true },
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("invalid_cards");
  });

  it("free con 4 jumpers (excede el máximo de 3) → invalid_cards", () => {
    const result = validateReadingPayload({
      spread: "free",
      deck: "rws",
      cards: [
        ...Array.from({ length: 3 }, (_, i) => freeCard(i)),
        { cardId: MAJORS[3], reversed: false, position: "jumper-1", jumper: true },
        { cardId: MAJORS[4], reversed: false, position: "jumper-2", jumper: true },
        { cardId: MAJORS[5], reversed: false, position: "jumper-3", jumper: true },
        { cardId: MAJORS[6], reversed: false, position: "jumper-4", jumper: true },
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("invalid_cards");
  });

  it("free con jumper sin flag jumper:true (aunque la position sea jumper-1) → invalid_cards", () => {
    const result = validateReadingPayload({
      spread: "free",
      deck: "rws",
      cards: [
        ...Array.from({ length: 3 }, (_, i) => freeCard(i)),
        { cardId: MAJORS[3], reversed: false, position: "jumper-1" },
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("invalid_cards");
  });

  it("free con jumper positions no consecutivas (jumper-1, jumper-3) → invalid_cards", () => {
    const result = validateReadingPayload({
      spread: "free",
      deck: "rws",
      cards: [
        ...Array.from({ length: 3 }, (_, i) => freeCard(i)),
        { cardId: MAJORS[3], reversed: false, position: "jumper-1", jumper: true },
        { cardId: MAJORS[4], reversed: false, position: "jumper-3", jumper: true },
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("invalid_cards");
  });

  it("three + 2 jumpers válido → ok (modo manual con plantilla)", () => {
    const result = validateReadingPayload({
      spread: "three",
      deck: "rws",
      cards: [
        { cardId: "fool", reversed: false, position: "past" },
        { cardId: "magician", reversed: true, position: "present" },
        { cardId: "wands-01", reversed: false, position: "future" },
        { cardId: MAJORS[2], reversed: false, position: "jumper-1", jumper: true },
        { cardId: MAJORS[3], reversed: true, position: "jumper-2", jumper: true },
      ],
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.cards).toHaveLength(5);
  });

  it("daily + 1 jumper válido → ok", () => {
    const result = validateReadingPayload({
      spread: "daily",
      deck: "rws",
      cards: [
        { cardId: "sun", reversed: false, position: "day" },
        { cardId: MAJORS[0], reversed: false, position: "jumper-1", jumper: true },
      ],
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.cards).toHaveLength(2);
  });

  it("three con cardId repetido entre carta principal y jumper → invalid_cards", () => {
    const result = validateReadingPayload({
      spread: "three",
      deck: "rws",
      cards: [
        { cardId: "fool", reversed: false, position: "past" },
        { cardId: "magician", reversed: true, position: "present" },
        { cardId: "wands-01", reversed: false, position: "future" },
        { cardId: "fool", reversed: false, position: "jumper-1", jumper: true },
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("invalid_cards");
  });
});
