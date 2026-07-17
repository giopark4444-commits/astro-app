// packages/core/src/bazi/__tests__/reading.test.ts
import { describe, it, expect } from "vitest";
import { yearPillar, monthPillar, dayPillar, hourPillar } from "../bazi";
import { composeBaziReading } from "../reading";
import type { PillarSet } from "../interactions";

// Fixture: 1990-06-15, hora 10 (辰, dragón), construida con las propias funciones de
// pilares de @aluna/core (misma fuente que usa /api/bazi) para no inventar índices.
function fixture(): PillarSet {
  const year = yearPillar(1990);
  const month = monthPillar(year.stem, 84); // ~cerca de 84° (verano, sector madera/fuego)
  const day = dayPillar(1990, 6, 15);
  const hour = hourPillar(day.stem, 10);
  return { year, month, day, hour };
}

describe("composeBaziReading", () => {
  it("ES: los tres campos son texto no vacío", () => {
    const r = composeBaziReading(fixture(), "es");
    expect(r.essence.length).toBeGreaterThan(0);
    expect(r.strength.length).toBeGreaterThan(0);
    expect(r.favorable.length).toBeGreaterThan(0);
  });

  it("EN: los tres campos son texto no vacío", () => {
    const r = composeBaziReading(fixture(), "en");
    expect(r.essence.length).toBeGreaterThan(0);
    expect(r.strength.length).toBeGreaterThan(0);
    expect(r.favorable.length).toBeGreaterThan(0);
  });

  it("essence teje la voz del Maestro del Día (no está vacía aunque cambie el tronco)", () => {
    const a = composeBaziReading({ year: { stem: 0, branch: 0 }, month: { stem: 2, branch: 2 }, day: { stem: 0, branch: 0 }, hour: { stem: 4, branch: 4 } }, "es");
    const b = composeBaziReading({ year: { stem: 0, branch: 0 }, month: { stem: 2, branch: 2 }, day: { stem: 6, branch: 8 }, hour: { stem: 4, branch: 4 } }, "es");
    expect(a.essence).not.toBe(b.essence);
  });

  it("strength varía con el veredicto (fuerte vs. débil dan textos distintos)", () => {
    // 甲 nacido en primavera rodeado de madera/agua → fuerte
    const strong = composeBaziReading({ year: { stem: 8, branch: 2 }, month: { stem: 0, branch: 2 }, day: { stem: 0, branch: 0 }, hour: { stem: 1, branch: 11 } }, "es");
    // 甲 nacido en otoño sin raíces ni apoyos → débil
    const weak = composeBaziReading({ year: { stem: 6, branch: 8 }, month: { stem: 7, branch: 9 }, day: { stem: 0, branch: 6 }, hour: { stem: 2, branch: 6 } }, "es");
    expect(strong.strength).not.toBe(weak.strength);
  });

  it("favorable varía con el veredicto (elementos favorables distintos entre fuerte y débil)", () => {
    const strong = composeBaziReading({ year: { stem: 8, branch: 2 }, month: { stem: 0, branch: 2 }, day: { stem: 0, branch: 0 }, hour: { stem: 1, branch: 11 } }, "es");
    const weak = composeBaziReading({ year: { stem: 6, branch: 8 }, month: { stem: 7, branch: 9 }, day: { stem: 0, branch: 6 }, hour: { stem: 2, branch: 6 } }, "es");
    expect(strong.favorable).not.toBe(weak.favorable);
  });

  it("funciona sin pilar de hora (carta solar)", () => {
    const r = composeBaziReading({ year: { stem: 0, branch: 0 }, month: { stem: 2, branch: 2 }, day: { stem: 0, branch: 0 } }, "es");
    expect(r.essence.length).toBeGreaterThan(0);
  });
});
