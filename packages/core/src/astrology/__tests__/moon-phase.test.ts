import { describe, it, expect } from "vitest";
import { moonPhase } from "../moon-phase";

describe("moonPhase", () => {
  it("conjunción exacta (0°) → nueva", () => {
    expect(moonPhase(0, 0)).toBe("new");
  });
  it("elongación ~45° → creciente", () => {
    expect(moonPhase(0, 45)).toBe("waxingCrescent");
  });
  it("elongación ~90° → cuarto creciente", () => {
    expect(moonPhase(0, 90)).toBe("firstQuarter");
  });
  it("elongación ~135° → gibosa creciente", () => {
    expect(moonPhase(0, 135)).toBe("waxingGibbous");
  });
  it("oposición exacta (180°) → llena", () => {
    expect(moonPhase(0, 180)).toBe("full");
  });
  it("elongación ~225° → gibosa menguante", () => {
    expect(moonPhase(0, 225)).toBe("waningGibbous");
  });
  it("elongación ~270° → cuarto menguante", () => {
    expect(moonPhase(0, 270)).toBe("lastQuarter");
  });
  it("elongación ~315° → menguante", () => {
    expect(moonPhase(0, 315)).toBe("waningCrescent");
  });
  it("elongación justo antes de 360° sigue siendo nueva (wrap)", () => {
    expect(moonPhase(0, 350)).toBe("new");
  });
  it("es insensible al punto de referencia (0-360 de la longitud, no al signo absoluto)", () => {
    // Sol en 200°, Luna 90° adelante (elongación 90°) → cuarto creciente, igual que (0,90)
    expect(moonPhase(200, 290)).toBe("firstQuarter");
  });
});
