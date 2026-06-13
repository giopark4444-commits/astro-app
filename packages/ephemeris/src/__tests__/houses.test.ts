import { describe, it, expect } from "vitest";
import { computeHouses } from "../houses";
import { localToJulianDay } from "../time";

const GIO = localToJulianDay({
  year: 1984, month: 2, day: 5, hour: 9, minute: 0, timeZone: "America/Guayaquil",
});
// Quito según la referencia Astrodienst de Gio (0s13, 78w30)
const LAT = -0.2167; // 0°13′ S
const LON = -78.5; // 78°30′ O

describe("computeHouses (Gio, Placidus)", () => {
  const h = computeHouses(GIO.julianDayUt, LAT, LON, "placidus", false);
  const TOL = 0.1; // 6 arcmin (las casas dependen mucho de la hora exacta)

  it("Ascendente ≈ 356.10° (26°06′ Piscis)", () => {
    expect(Math.abs(h.ascendant - 356.10)).toBeLessThan(TOL);
  });
  it("Medio Cielo ≈ 266.72° (26°43′ Sagitario)", () => {
    expect(Math.abs(h.midheaven - 266.72)).toBeLessThan(TOL);
  });
  it("devuelve 12 cúspides, la primera = Ascendente", () => {
    expect(h.cusps).toHaveLength(12);
    expect(Math.abs(h.cusps[0]! - h.ascendant)).toBeLessThan(0.001);
  });
});

describe("computeHouses soporta varios sistemas", () => {
  it("acepta whole sign sin romper", () => {
    const h = computeHouses(GIO.julianDayUt, LAT, LON, "whole", false);
    expect(h.cusps).toHaveLength(12);
  });
});
