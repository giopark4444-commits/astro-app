import { describe, it, expect } from "vitest";
import { DateTime } from "luxon";
import type { ChartInput } from "@aluna/core";
import { nextLunarPhase, solarReturnDate } from "../lunar";
import { computeBodies } from "../bodies";
import { computeChart } from "../chart";
import { localToJulianDay } from "../time";

function elongationAt(iso: string): number {
  const dt = DateTime.fromISO(iso, { zone: "utc" });
  const { julianDayEt } = localToJulianDay({ year: dt.year, month: dt.month, day: dt.day, hour: dt.hour, minute: dt.minute, timeZone: "utc" });
  const b = computeBodies(julianDayEt);
  const sun = b.find((x) => x.body === "sun")!.longitude;
  const moon = b.find((x) => x.body === "moon")!.longitude;
  return (((moon - sun) % 360) + 360) % 360;
}

describe("nextLunarPhase", () => {
  const FROM = "2026-07-13T12:00:00Z";

  it("la próxima luna nueva tiene elongación ≈ 0 y es posterior a 'from'", () => {
    const iso = nextLunarPhase("new", FROM);
    expect(iso > FROM).toBe(true);
    const e = elongationAt(iso);
    expect(Math.min(e, 360 - e)).toBeLessThan(0.05); // cerca de 0/360
    expect(iso.slice(0, 10)).toBe("2026-07-14"); // fecha real (sweph)
  });

  it("la próxima luna llena tiene elongación ≈ 180", () => {
    const iso = nextLunarPhase("full", FROM);
    expect(Math.abs(elongationAt(iso) - 180)).toBeLessThan(0.05);
    expect(iso.slice(0, 10)).toBe("2026-07-29");
  });

  it("el ciclo nueva→nueva es ~29.5 días", () => {
    const a = nextLunarPhase("new", FROM);
    const b = nextLunarPhase("new", a);
    const days = DateTime.fromISO(b).diff(DateTime.fromISO(a), "days").days;
    expect(days).toBeGreaterThan(29);
    expect(days).toBeLessThan(30);
  });
});

describe("solarReturnDate", () => {
  // Carta de Gio: 1990-02-04, Bogotá.
  const natal: ChartInput = {
    year: 1990,
    month: 2,
    day: 4,
    hour: 14,
    minute: 0,
    timeZone: "America/Bogota",
    latitude: 4.711,
    longitude: -74.0721,
  };
  const FROM = "2026-07-13T12:00:00Z";

  it("devuelve la revolución solar de febrero, con el Sol de vuelta en su longitud natal", () => {
    const iso = solarReturnDate(natal, FROM);
    const dt = DateTime.fromISO(iso, { zone: "utc" }).setZone(natal.timeZone);
    expect(dt.month).toBe(2);

    const natalSunLon = computeChart(natal).bodies.find((b) => b.body === "sun")!.longitude;
    const returnSunLon = computeChart({ ...natal, year: dt.year, month: dt.month, day: dt.day, hour: dt.hour, minute: dt.minute })
      .bodies.find((b) => b.body === "sun")!.longitude;
    const diff = Math.abs(((returnSunLon - natalSunLon + 540) % 360) - 180);
    expect(diff).toBeLessThan(0.05);
  });

  it("busca hacia adelante: la fecha devuelta es posterior a 'from'", () => {
    const iso = solarReturnDate(natal, FROM);
    expect(iso > FROM).toBe(true);
  });
});
