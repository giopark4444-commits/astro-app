import { describe, it, expect } from "vitest";
import { profileToNumerologyInput, formatReduction } from "../numerology";

describe("profileToNumerologyInput", () => {
  it("convierte un perfil a NumerologyInput (nombre + fecha desestructurada)", () => {
    const input = profileToNumerologyInput({ name: "Gio", birth_date: "1984-02-05" });
    expect(input.fullName).toBe("Gio");
    expect(input.birthDate).toEqual({ year: 1984, month: 2, day: 5 });
  });
});

describe("formatReduction", () => {
  it("formatea la traza como '29 → 11'", () => {
    expect(formatReduction({ steps: [29, 11] })).toBe("29 → 11");
    expect(formatReduction({ steps: [5] })).toBe("5");
  });
});
