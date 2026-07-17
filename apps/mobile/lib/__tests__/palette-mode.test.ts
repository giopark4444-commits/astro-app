import { describe, it, expect } from "vitest";
import { DEFAULT_PALETTE_MODE, isPaletteMode } from "../palette-mode";

describe("palette-mode (modo Colorido, T1)", () => {
  it("default es 'gold' — cero cambio visual para quien no opta", () => {
    expect(DEFAULT_PALETTE_MODE).toBe("gold");
  });

  it("acepta 'gold' y 'colorful'", () => {
    expect(isPaletteMode("gold")).toBe(true);
    expect(isPaletteMode("colorful")).toBe(true);
  });

  it("rechaza null y cualquier otro valor (migración de lectura al montar)", () => {
    expect(isPaletteMode(null)).toBe(false);
    expect(isPaletteMode("dark")).toBe(false);
    expect(isPaletteMode("")).toBe(false);
    expect(isPaletteMode("Colorful")).toBe(false);
  });
});
