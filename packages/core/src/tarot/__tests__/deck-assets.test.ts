import { describe, expect, it } from "vitest";
import { cardBackUrl, cardImageUrl, rwsCtx, type DeckAssetCtx } from "../deck-assets";

describe("rwsCtx", () => {
  it("builds a pure rws context from a base", () => {
    expect(rwsCtx("")).toEqual({ base: "", activeDeck: "rws" });
    expect(rwsCtx("https://api.example.com")).toEqual({
      base: "https://api.example.com",
      activeDeck: "rws",
    });
  });
});

describe("cardImageUrl", () => {
  it("reproduces today's web URL (base '') for the default rws deck", () => {
    expect(cardImageUrl("fool", rwsCtx(""))).toBe("/tarot/rws/fool.webp");
    expect(cardImageUrl("wands-01", rwsCtx(""))).toBe("/tarot/rws/wands-01.webp");
  });

  it("reproduces today's mobile URL (base = apiUrl()) for the default rws deck", () => {
    const base = "https://api.example.com";
    expect(cardImageUrl("fool", rwsCtx(base))).toBe(
      "https://api.example.com/tarot/rws/fool.webp",
    );
  });

  it("uses customBase when activeDeck is custom and the card is in the custom set", () => {
    const ctx: DeckAssetCtx = {
      base: "",
      activeDeck: "custom",
      customCardIds: new Set(["fool"]),
      customBase: "https://storage.example.com/user123",
    };
    expect(cardImageUrl("fool", ctx)).toBe("https://storage.example.com/user123/fool.webp");
  });

  it("falls back to rws when activeDeck is custom but the card is not in the custom set", () => {
    const ctx: DeckAssetCtx = {
      base: "",
      activeDeck: "custom",
      customCardIds: new Set(["magician"]),
      customBase: "https://storage.example.com/user123",
    };
    expect(cardImageUrl("fool", ctx)).toBe("/tarot/rws/fool.webp");
  });

  it("falls back to rws when activeDeck is custom but customCardIds is missing", () => {
    const ctx: DeckAssetCtx = {
      base: "",
      activeDeck: "custom",
      customBase: "https://storage.example.com/user123",
    };
    expect(cardImageUrl("fool", ctx)).toBe("/tarot/rws/fool.webp");
  });
});

describe("cardBackUrl", () => {
  it("reproduces today's rws back URL for web (base '')", () => {
    expect(cardBackUrl(rwsCtx(""))).toBe("/tarot/rws/back.webp");
  });

  it("reproduces today's rws back URL for mobile (base = apiUrl())", () => {
    expect(cardBackUrl(rwsCtx("https://api.example.com"))).toBe(
      "https://api.example.com/tarot/rws/back.webp",
    );
  });

  it("uses customBack when activeDeck is custom and customBack is set", () => {
    const ctx: DeckAssetCtx = {
      base: "",
      activeDeck: "custom",
      customBack: "https://storage.example.com/user123/back.webp",
    };
    expect(cardBackUrl(ctx)).toBe("https://storage.example.com/user123/back.webp");
  });

  it("falls back to rws back when activeDeck is custom but customBack is null", () => {
    const ctx: DeckAssetCtx = {
      base: "",
      activeDeck: "custom",
      customBack: null,
    };
    expect(cardBackUrl(ctx)).toBe("/tarot/rws/back.webp");
  });

  it("falls back to rws back when activeDeck is custom but customBack is undefined", () => {
    const ctx: DeckAssetCtx = { base: "", activeDeck: "custom" };
    expect(cardBackUrl(ctx)).toBe("/tarot/rws/back.webp");
  });
});
