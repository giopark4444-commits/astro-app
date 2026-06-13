import { describe, it, expect } from "vitest";
import { computeNumerology } from "../compute";


describe("computeNumerology (fixture Gio)", () => {
  const result = computeNumerology({
    fullName: "Giovanni Andres Park",
    birthDate: { year: 1984, month: 2, day: 5 },
    asOf: { year: 2026, month: 6, day: 13 },
  });

  it("Camino de Vida es 11 (maestro) con reducción mostrada", () => {
    expect(result.core.lifePath.value).toBe(11);
    expect(result.core.lifePath.isMaster).toBe(true);
    expect(result.core.lifePath.steps.length).toBeGreaterThan(1);
  });

  it("incluye todos los números núcleo", () => {
    expect(result.core.expression.value).toBeGreaterThan(0);
    expect(result.core.soulUrge.value).toBeGreaterThan(0);
    expect(result.core.personality.value).toBeGreaterThan(0);
    expect(result.core.birthday.value).toBe(5);
    expect(result.core.maturity.value).toBeGreaterThan(0);
  });

  it("incluye 4 pináculos, 4 desafíos y la malla kármica", () => {
    expect(result.pinnacles).toHaveLength(4);
    expect(result.challenges).toHaveLength(4);
    expect(Object.keys(result.karmic.inclusion)).toHaveLength(9);
    expect(Array.isArray(result.karmic.lessons)).toBe(true);
  });

  it("calcula el año personal 2026", () => {
    expect(result.cycles.personalYear.value).toBe(8);
  });
});

describe("computeNumerology validación de entrada", () => {
  const base = { fullName: "John Doe", birthDate: { year: 1990, month: 6, day: 15 } };
  it("rechaza un mes fuera de rango", () => {
    expect(() => computeNumerology({ ...base, birthDate: { year: 1990, month: 13, day: 15 } })).toThrow();
  });
  it("rechaza un día fuera de rango", () => {
    expect(() => computeNumerology({ ...base, birthDate: { year: 1990, month: 6, day: 40 } })).toThrow();
  });
  it("rechaza un año no positivo", () => {
    expect(() => computeNumerology({ ...base, birthDate: { year: 0, month: 6, day: 15 } })).toThrow();
  });
  it("rechaza un nombre sin letras", () => {
    expect(() => computeNumerology({ ...base, fullName: "   123!!  " })).toThrow();
  });
  it("acepta una entrada válida (no lanza)", () => {
    expect(() => computeNumerology(base)).not.toThrow();
  });
});
