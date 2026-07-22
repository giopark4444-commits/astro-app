import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useDeckAssets } from "../use-deck-assets";

const originalFetch = global.fetch;

describe("useDeckAssets", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("starts at rwsCtx('') before the fetch resolves (no flicker)", () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useDeckAssets());
    expect(result.current).toEqual({ base: "", activeDeck: "rws" });
  });

  it("stays at rws when the manifest is latente (available:false)", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: async () => ({ available: false }),
    });
    const { result } = renderHook(() => useDeckAssets());
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/tarot/deck", { method: "GET" }));
    expect(result.current).toEqual({ base: "", activeDeck: "rws" });
  });

  it("stays at rws when the manifest is available but inactive", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: async () => ({ available: true, active: false, cardIds: [], backKind: "none", backUrl: null }),
    });
    const { result } = renderHook(() => useDeckAssets());
    await waitFor(() => expect(result.current).toEqual({ base: "", activeDeck: "rws" }));
  });

  it("stays at rws when fetch throws", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("network"));
    const { result } = renderHook(() => useDeckAssets());
    await new Promise((r) => setTimeout(r, 0));
    expect(result.current).toEqual({ base: "", activeDeck: "rws" });
  });

  it("switches to custom when the manifest is active with content", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: async () => ({
        available: true,
        active: true,
        cardIds: ["fool", "wands-01"],
        cardBase: "https://storage.example.com/u1",
        backUrl: "https://storage.example.com/u1/back.webp",
      }),
    });
    const { result } = renderHook(() => useDeckAssets());
    await waitFor(() =>
      expect(result.current).toEqual({
        base: "",
        activeDeck: "custom",
        customCardIds: new Set(["fool", "wands-01"]),
        customBase: "https://storage.example.com/u1",
        customBack: "https://storage.example.com/u1/back.webp",
      }),
    );
  });
});

// Tarot T5: el mazo preset elegido en Ajustes (usePresetDeck, localStorage)
// se combina con el manifiesto custom. Sin elección guardada, presetDeck
// default es "rws" y el bloque de arriba (sin tocar localStorage) ya cubre
// el caso 100% back-compat. Este bloque cubre la integración con un preset
// real guardado.
describe("useDeckAssets + usePresetDeck (mazo preset elegido en Ajustes)", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
    window.localStorage.clear();
  });
  afterEach(() => {
    global.fetch = originalFetch;
    window.localStorage.clear();
  });

  it("falls back to the chosen preset (not rws) when the manifest is latente", async () => {
    window.localStorage.setItem("aluna.tarotDeck", "marseille");
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: async () => ({ available: false }),
    });
    const { result } = renderHook(() => useDeckAssets());
    await waitFor(() => expect(result.current).toEqual({ base: "", activeDeck: "marseille" }));
  });

  it("falls back to the chosen preset when active without content", async () => {
    window.localStorage.setItem("aluna.tarotDeck", "visconti");
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: async () => ({ available: true, active: false, cardIds: [], backUrl: null }),
    });
    const { result } = renderHook(() => useDeckAssets());
    await waitFor(() => expect(result.current).toEqual({ base: "", activeDeck: "visconti" }));
  });

  it("carries the chosen preset as the fallback layer when a custom deck is active too", async () => {
    window.localStorage.setItem("aluna.tarotDeck", "aluna-noche");
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: async () => ({
        available: true,
        active: true,
        cardIds: ["fool"],
        cardBase: "https://storage.example.com/u1",
        backUrl: null,
      }),
    });
    const { result } = renderHook(() => useDeckAssets());
    await waitFor(() =>
      expect(result.current).toEqual({
        base: "",
        activeDeck: "custom",
        customCardIds: new Set(["fool"]),
        customBase: "https://storage.example.com/u1",
        customBack: null,
        presetDeck: "aluna-noche",
      }),
    );
  });
});
