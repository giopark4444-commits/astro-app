import { describe, expect, it } from "vitest";
import {
  cardBackUrl,
  cardImageUrl,
  deckCtxFromManifest,
  presetCtx,
  PRESET_DECKS,
  rwsCtx,
  type DeckAssetCtx,
} from "../deck-assets";

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

describe("deckCtxFromManifest", () => {
  it("falls back to rws when the manifest is latente (available:false)", () => {
    expect(deckCtxFromManifest({ available: false }, "")).toEqual(rwsCtx(""));
  });

  it("falls back to rws when the manifest is null/undefined", () => {
    expect(deckCtxFromManifest(null, "")).toEqual(rwsCtx(""));
    expect(deckCtxFromManifest(undefined, "https://api.example.com")).toEqual(
      rwsCtx("https://api.example.com"),
    );
  });

  it("falls back to rws when available but inactive", () => {
    expect(
      deckCtxFromManifest(
        { available: true, active: false, cardIds: ["fool"], cardBase: "https://storage.example.com/u1" },
        "",
      ),
    ).toEqual(rwsCtx(""));
  });

  it("falls back to rws when active but without cardIds (sin contenido)", () => {
    expect(
      deckCtxFromManifest({ available: true, active: true, cardIds: [], cardBase: "https://storage.example.com/u1" }, ""),
    ).toEqual(rwsCtx(""));
    expect(deckCtxFromManifest({ available: true, active: true, cardBase: "https://storage.example.com/u1" }, "")).toEqual(
      rwsCtx(""),
    );
  });

  it("falls back to rws when active with cardIds but without cardBase (sin contenido)", () => {
    expect(deckCtxFromManifest({ available: true, active: true, cardIds: ["fool"] }, "")).toEqual(rwsCtx(""));
  });

  it("builds a custom ctx when active with cardIds and cardBase", () => {
    const ctx = deckCtxFromManifest(
      {
        available: true,
        active: true,
        cardIds: ["fool", "wands-01"],
        cardBase: "https://storage.example.com/u1",
        backUrl: "https://storage.example.com/u1/back.webp",
      },
      "",
    );
    expect(ctx).toEqual({
      base: "",
      activeDeck: "custom",
      customCardIds: new Set(["fool", "wands-01"]),
      customBase: "https://storage.example.com/u1",
      customBack: "https://storage.example.com/u1/back.webp",
    });
    expect(cardImageUrl("fool", ctx)).toBe("https://storage.example.com/u1/fool.webp");
    expect(cardImageUrl("magician", ctx)).toBe("/tarot/rws/magician.webp");
    expect(cardBackUrl(ctx)).toBe("https://storage.example.com/u1/back.webp");
  });

  it("builds a custom ctx for a back-only deck (reverso propio, sin cartas) — el dorso se usa, las cartas caen a rws", () => {
    const ctx = deckCtxFromManifest(
      { available: true, active: true, cardIds: [], cardBase: null, backUrl: "https://storage.example.com/u1/back.webp" },
      "",
    );
    expect(ctx.activeDeck).toBe("custom");
    expect(ctx.customCardIds).toEqual(new Set());
    expect(cardImageUrl("fool", ctx)).toBe("/tarot/rws/fool.webp"); // sin cartas custom → rws
    expect(cardBackUrl(ctx)).toBe("https://storage.example.com/u1/back.webp"); // el reverso propio SÍ se usa
  });

  it("propagates a null backUrl (rws back) into the custom ctx", () => {
    const ctx = deckCtxFromManifest(
      { available: true, active: true, cardIds: ["fool"], cardBase: "https://storage.example.com/u1", backUrl: null },
      "",
    );
    expect(cardBackUrl(ctx)).toBe("/tarot/rws/back.webp");
  });

  it("preserves base for the mobile apiUrl() prefix", () => {
    expect(deckCtxFromManifest({ available: false }, "https://api.example.com")).toEqual(
      rwsCtx("https://api.example.com"),
    );
  });

  it("falls back to the chosen preset (not rws) when latente and presetDeck is given", () => {
    expect(deckCtxFromManifest({ available: false }, "", "marseille")).toEqual(presetCtx("", "marseille"));
  });

  it("falls back to the chosen preset when inactive with a presetDeck", () => {
    expect(
      deckCtxFromManifest({ available: true, active: false, cardIds: ["fool"], cardBase: "u1" }, "", "visconti"),
    ).toEqual(presetCtx("", "visconti"));
  });

  it("falls back to the chosen preset when active without content", () => {
    expect(
      deckCtxFromManifest({ available: true, active: true, cardIds: [], cardBase: null }, "", "aluna-noche"),
    ).toEqual(presetCtx("", "aluna-noche"));
  });

  it("passing presetDeck: 'rws' is byte-identical to no presetDeck at all (no-op)", () => {
    expect(deckCtxFromManifest({ available: false }, "", "rws")).toEqual(rwsCtx(""));
  });

  it("without a 3rd argument, behavior is 100% unchanged (back-compat)", () => {
    expect(deckCtxFromManifest({ available: false }, "")).toEqual(rwsCtx(""));
  });

  it("carries presetDeck as the fallback layer inside a custom-active ctx, and omits it entirely when the preset is rws", () => {
    const withPreset = deckCtxFromManifest(
      { available: true, active: true, cardIds: ["fool"], cardBase: "https://storage.example.com/u1" },
      "",
      "marseille",
    );
    expect(withPreset).toEqual({
      base: "",
      activeDeck: "custom",
      customCardIds: new Set(["fool"]),
      customBase: "https://storage.example.com/u1",
      customBack: null,
      presetDeck: "marseille",
    });
    // "fool" está en el custom → gana el custom; "magician" no está → cae al
    // preset "marseille" (no directo a rws).
    expect(cardImageUrl("fool", withPreset)).toBe("https://storage.example.com/u1/fool.webp");
    expect(cardImageUrl("magician", withPreset)).toBe("/tarot/marseille/magician.webp");

    const withRwsPreset = deckCtxFromManifest(
      { available: true, active: true, cardIds: ["fool"], cardBase: "https://storage.example.com/u1" },
      "",
      "rws",
    );
    // Mismo shape EXACTO que sin 3er argumento — "rws" no ensucia el ctx.
    expect(withRwsPreset).toEqual({
      base: "",
      activeDeck: "custom",
      customCardIds: new Set(["fool"]),
      customBase: "https://storage.example.com/u1",
      customBack: null,
    });
  });
});

describe("PRESET_DECKS / presetCtx", () => {
  it("lists exactly the 4 preset decks, rws first", () => {
    expect(PRESET_DECKS).toEqual(["rws", "aluna-noche", "marseille", "visconti"]);
  });

  it("presetCtx('rws', ...) is shape-identical to rwsCtx", () => {
    expect(presetCtx("", "rws")).toEqual(rwsCtx(""));
    expect(presetCtx("https://api.example.com", "rws")).toEqual(rwsCtx("https://api.example.com"));
  });

  it.each(["aluna-noche", "marseille", "visconti"] as const)(
    "resolves card + back URLs under /tarot/%s/ for a preset ctx",
    (deck) => {
      const ctx = presetCtx("", deck);
      expect(ctx).toEqual({ base: "", activeDeck: deck });
      expect(cardImageUrl("fool", ctx)).toBe(`/tarot/${deck}/fool.webp`);
      expect(cardImageUrl("wands-01", ctx)).toBe(`/tarot/${deck}/wands-01.webp`);
      expect(cardBackUrl(ctx)).toBe(`/tarot/${deck}/back.webp`);
    },
  );

  it("preserves base (mobile apiUrl prefix) for preset decks too", () => {
    const ctx = presetCtx("https://api.example.com", "marseille");
    expect(cardImageUrl("fool", ctx)).toBe("https://api.example.com/tarot/marseille/fool.webp");
    expect(cardBackUrl(ctx)).toBe("https://api.example.com/tarot/marseille/back.webp");
  });

  it("a custom ctx with no presetDeck falls straight to rws for uncovered cards/back (unchanged precedence)", () => {
    const ctx: DeckAssetCtx = {
      base: "",
      activeDeck: "custom",
      customCardIds: new Set(["fool"]),
      customBase: "https://storage.example.com/u1",
    };
    expect(cardImageUrl("magician", ctx)).toBe("/tarot/rws/magician.webp");
    expect(cardBackUrl(ctx)).toBe("/tarot/rws/back.webp");
  });

  it("a custom ctx with presetDeck: 'rws' behaves exactly like no presetDeck at all", () => {
    const ctx: DeckAssetCtx = {
      base: "",
      activeDeck: "custom",
      customCardIds: new Set(["fool"]),
      customBase: "https://storage.example.com/u1",
      presetDeck: "rws",
    };
    expect(cardImageUrl("magician", ctx)).toBe("/tarot/rws/magician.webp");
    expect(cardBackUrl(ctx)).toBe("/tarot/rws/back.webp");
  });
});
