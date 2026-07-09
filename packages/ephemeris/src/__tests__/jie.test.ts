// packages/ephemeris/src/__tests__/jie.test.ts
import { describe, it, expect } from "vitest";
import { jieBoundaries } from "../jie";
import type { ChartInput } from "@aluna/core";

const base: Omit<ChartInput, "year" | "month" | "day" | "hour" | "minute"> = {
  timeZone: "America/Guayaquil",
  latitude: -2.17,
  longitude: -79.92,
};

describe("jieBoundaries (節 de mes: longitud solar múltiplo de 30° desde 315°)", () => {
  it("nacer ~4 días después de Lichun 1990 (4-feb): prevJie ≈ 4, nextJie ≈ 26 (mes solar ~30d)", () => {
    const r = jieBoundaries({ ...base, year: 1990, month: 2, day: 8, hour: 12, minute: 0 });
    expect(r.daysToPrevJie).toBeGreaterThan(2.5);
    expect(r.daysToPrevJie).toBeLessThan(5.5);
    expect(r.daysToNextJie).toBeGreaterThan(24);
    expect(r.daysToNextJie).toBeLessThan(29);
  });
  it("prev + next ≈ duración del mes solar (29–31.5 días)", () => {
    const r = jieBoundaries({ ...base, year: 1990, month: 6, day: 15, hour: 12, minute: 0 });
    const span = r.daysToPrevJie + r.daysToNextJie;
    expect(span).toBeGreaterThan(29);
    expect(span).toBeLessThan(31.6);
  });
  it("ambos positivos y con fracción razonable en cualquier fecha", () => {
    const r = jieBoundaries({ ...base, year: 2000, month: 1, day: 7, hour: 3, minute: 30 });
    expect(r.daysToPrevJie).toBeGreaterThan(0);
    expect(r.daysToNextJie).toBeGreaterThan(0);
  });
});
