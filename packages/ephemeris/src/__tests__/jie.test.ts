// packages/ephemeris/src/__tests__/jie.test.ts
import { describe, it, expect } from "vitest";
import { DateTime } from "luxon";
import { jieBoundaries, jieDatesInRange } from "../jie";
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

describe("jieDatesInRange (fechas exactas de 節 en un rango)", () => {
  it("Lichun 2026 (立春, 315°) cae ~4-feb-2026", () => {
    const dates = jieDatesInRange("2026-01-20T00:00:00Z", "2026-02-15T00:00:00Z");
    const lichun = dates.find((d) => Math.abs(d.solarLongitude - 315) < 0.01);
    expect(lichun).toBeDefined();
    const dt = DateTime.fromISO(lichun!.atIso, { zone: "utc" });
    expect(dt.month).toBe(2);
    expect(dt.day).toBeGreaterThanOrEqual(3);
    expect(dt.day).toBeLessThanOrEqual(5);
  });

  it("立秋 (Liqiu, 135°) cae ~7-ago-2026", () => {
    const dates = jieDatesInRange("2026-07-25T00:00:00Z", "2026-08-15T00:00:00Z");
    const liqiu = dates.find((d) => Math.abs(d.solarLongitude - 135) < 0.01);
    expect(liqiu).toBeDefined();
    const dt = DateTime.fromISO(liqiu!.atIso, { zone: "utc" });
    expect(dt.month).toBe(8);
    expect(dt.day).toBeGreaterThanOrEqual(6);
    expect(dt.day).toBeLessThanOrEqual(8);
  });

  it("un rango de un año completo devuelve los 12 節", () => {
    const dates = jieDatesInRange("2026-01-01T00:00:00Z", "2027-01-01T00:00:00Z");
    expect(dates.length).toBe(12);
    // Múltiplos de 30° en fase Lichun (315°): 315, 345, 15, 45, ... — todos ≡ 15 (mod 30).
    for (const d of dates) {
      const mod30 = ((d.solarLongitude % 30) + 30) % 30;
      expect(Math.abs(mod30 - 15)).toBeLessThan(0.01);
    }
    // ordenados cronológicamente
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i]!.atIso >= dates[i - 1]!.atIso).toBe(true);
    }
  });

  it("una semana sin 節 devuelve []", () => {
    // A mitad de un mes solar cualquiera (lejos de una frontera de 30°):
    // 清明 cae ~5-abr y 立夏 ~5-may, esta semana queda a mitad de camino.
    const dates = jieDatesInRange("2026-04-15T00:00:00Z", "2026-04-22T00:00:00Z");
    expect(dates).toEqual([]);
  });

  it("coherente con jieBoundaries: mismo instante (al minuto) para el mismo cruce", () => {
    const natal: ChartInput = {
      timeZone: "utc", latitude: 0, longitude: 0,
      year: 2026, month: 2, day: 8, hour: 12, minute: 0,
    };
    const boundaries = jieBoundaries(natal);
    const prevJieAt = DateTime.fromObject(
      { year: 2026, month: 2, day: 8, hour: 12, minute: 0 }, { zone: "utc" },
    ).minus({ days: boundaries.daysToPrevJie });

    const dates = jieDatesInRange("2026-01-25T00:00:00Z", "2026-02-15T00:00:00Z");
    const lichun = dates.find((d) => Math.abs(d.solarLongitude - 315) < 0.01);
    expect(lichun).toBeDefined();
    const lichunAt = DateTime.fromISO(lichun!.atIso, { zone: "utc" });
    const diffMinutes = Math.abs(lichunAt.diff(prevJieAt, "minutes").minutes);
    expect(diffMinutes).toBeLessThan(1);
  });
});
