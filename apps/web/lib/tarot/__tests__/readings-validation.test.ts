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
