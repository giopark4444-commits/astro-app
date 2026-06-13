import { describe, it, expect } from "vitest";
import { localToJulianDay } from "../time";

describe("localToJulianDay", () => {
  it("convierte la hora local de Gio (Quito 09:00) a TU 14:00", () => {
    const r = localToJulianDay({
      year: 1984, month: 2, day: 5, hour: 9, minute: 0,
      timeZone: "America/Guayaquil",
    });
    expect(r.utcHour).toBeCloseTo(14, 5); // Ecuador UTC-5, sin DST en 1984
    expect(r.julianDayUt).toBeGreaterThan(2445000);
    expect(r.julianDayEt).toBeGreaterThan(r.julianDayUt - 0.01);
  });

  it("respeta el horario de verano histórico (Madrid en verano = UTC+2)", () => {
    const r = localToJulianDay({
      year: 2000, month: 7, day: 1, hour: 12, minute: 0,
      timeZone: "Europe/Madrid",
    });
    expect(r.utcHour).toBeCloseTo(10, 5); // CEST = UTC+2 en julio
  });
});
