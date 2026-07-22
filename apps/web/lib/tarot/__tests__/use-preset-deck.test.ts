import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { usePresetDeck } from "../use-preset-deck";

const KEY = "aluna.tarotDeck";

describe("usePresetDeck", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  it("defaults to 'rws' when nothing is stored", () => {
    const { result } = renderHook(() => usePresetDeck());
    expect(result.current.deck).toBe("rws");
  });

  it("reads an already-stored valid deck on mount", () => {
    window.localStorage.setItem(KEY, "marseille");
    const { result } = renderHook(() => usePresetDeck());
    expect(result.current.deck).toBe("marseille");
  });

  it("validates against PRESET_DECKS: an unknown/garbage value falls back to rws", () => {
    window.localStorage.setItem(KEY, "not-a-real-deck");
    const { result } = renderHook(() => usePresetDeck());
    expect(result.current.deck).toBe("rws");
  });

  it("setDeck updates the returned state and persists to localStorage", () => {
    const { result } = renderHook(() => usePresetDeck());
    act(() => {
      result.current.setDeck("visconti");
    });
    expect(result.current.deck).toBe("visconti");
    expect(window.localStorage.getItem(KEY)).toBe("visconti");
  });

  it("setDeck('rws') round-trips back to the default", () => {
    const { result } = renderHook(() => usePresetDeck());
    act(() => {
      result.current.setDeck("aluna-noche");
    });
    expect(result.current.deck).toBe("aluna-noche");
    act(() => {
      result.current.setDeck("rws");
    });
    expect(result.current.deck).toBe("rws");
    expect(window.localStorage.getItem(KEY)).toBe("rws");
  });

  it("a second hook instance mounted after the write picks up the persisted value", () => {
    const first = renderHook(() => usePresetDeck());
    act(() => {
      first.result.current.setDeck("marseille");
    });
    const second = renderHook(() => usePresetDeck());
    expect(second.result.current.deck).toBe("marseille");
  });

  it("a second, already-mounted instance syncs when another instance calls setDeck (same-tab event)", () => {
    const a = renderHook(() => usePresetDeck());
    const b = renderHook(() => usePresetDeck());
    expect(a.result.current.deck).toBe("rws");
    expect(b.result.current.deck).toBe("rws");

    act(() => {
      a.result.current.setDeck("visconti");
    });

    expect(a.result.current.deck).toBe("visconti");
    expect(b.result.current.deck).toBe("visconti");
  });
});
