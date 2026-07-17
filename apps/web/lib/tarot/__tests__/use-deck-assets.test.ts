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
