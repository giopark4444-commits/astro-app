import { describe, it, expect } from "vitest";
import {
  deckCardPath,
  deckBackPath,
  validateDeckImage,
  isValidCardId,
  validateBackConfig,
} from "../deck-storage";

describe("deckCardPath / deckBackPath", () => {
  it("deriva el path SIEMPRE del userId de la sesión, no de input del cliente", () => {
    expect(deckCardPath("user-abc", "fool")).toBe("user-abc/fool.webp");
    expect(deckCardPath("user-abc", "wands-01")).toBe("user-abc/wands-01.webp");
    expect(deckBackPath("user-abc")).toBe("user-abc/back.webp");
  });
});

describe("validateDeckImage", () => {
  it("acepta png/jpeg/webp bajo 5MB (mismo límite que avatar)", () => {
    expect(validateDeckImage({ type: "image/png", size: 1_000_000 })).toEqual({ ok: true });
    expect(validateDeckImage({ type: "image/jpeg", size: 4_999_999 })).toEqual({ ok: true });
    expect(validateDeckImage({ type: "image/webp", size: 10 })).toEqual({ ok: true });
  });
  it("rechaza tipos no imagen", () => {
    expect(validateDeckImage({ type: "application/pdf", size: 10 })).toEqual({ ok: false, error: "type" });
    expect(validateDeckImage({ type: "image/gif", size: 10 })).toEqual({ ok: false, error: "type" });
  });
  it("rechaza > 5MB", () => {
    expect(validateDeckImage({ type: "image/png", size: 5_000_001 })).toEqual({ ok: false, error: "size" });
  });
});

describe("isValidCardId", () => {
  it("acepta una carta real de las 78", () => {
    expect(isValidCardId("fool")).toBe(true);
    expect(isValidCardId("wands-01")).toBe(true);
    expect(isValidCardId("cups-king")).toBe(true);
  });
  it("rechaza basura", () => {
    expect(isValidCardId("not-a-card")).toBe(false);
    expect(isValidCardId("")).toBe(false);
    expect(isValidCardId("../../etc/passwd")).toBe(false);
  });
});

describe("validateBackConfig", () => {
  it("acepta config válida (hex de 6 y de 3, symbol conocido)", () => {
    expect(validateBackConfig({ bg: "#12142e", border: "#f5d67b", symbol: "enso" })).toEqual({
      bg: "#12142e",
      border: "#f5d67b",
      symbol: "enso",
    });
    expect(validateBackConfig({ bg: "#123", border: "#abc", symbol: "star" })).toEqual({
      bg: "#123",
      border: "#abc",
      symbol: "star",
    });
    expect(validateBackConfig({ bg: "#000000", border: "#ffffff", symbol: "moon" })?.symbol).toBe("moon");
  });
  it("rechaza color inválido", () => {
    expect(validateBackConfig({ bg: "not-a-color", border: "#abc", symbol: "enso" })).toBeNull();
    expect(validateBackConfig({ bg: "#abc", border: "red", symbol: "enso" })).toBeNull();
    expect(validateBackConfig({ bg: "#abcd", border: "#abc", symbol: "enso" })).toBeNull();
  });
  it("rechaza symbol inválido", () => {
    expect(validateBackConfig({ bg: "#123", border: "#abc", symbol: "sun" })).toBeNull();
  });
  it("rechaza shapes ausentes/no-objeto", () => {
    expect(validateBackConfig(null)).toBeNull();
    expect(validateBackConfig("string")).toBeNull();
    expect(validateBackConfig({})).toBeNull();
  });
});
