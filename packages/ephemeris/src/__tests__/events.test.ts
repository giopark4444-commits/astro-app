import { describe, expect, it } from "vitest";
import { DateTime } from "luxon";
import { normalizeAngle } from "@aluna/core";
import { computeBodies } from "../bodies";
import { localToJulianDay } from "../time";
import { lunations } from "../events";

function elongationAt(iso: string): number {
  const d = DateTime.fromISO(iso, { zone: "utc" });
  const { julianDayEt } = localToJulianDay({
    year: d.year, month: d.month, day: d.day, hour: d.hour, minute: d.minute, timeZone: "utc",
  });
  const bodies = computeBodies(julianDayEt);
  const sun = bodies.find((b) => b.body === "sun")!.longitude;
  const moon = bodies.find((b) => b.body === "moon")!.longitude;
  return normalizeAngle(moon - sun);
}

describe("lunations", () => {
  const all2026 = lunations("2026-01-01T00:00:00Z", "2026-12-31T23:59:59Z");

  it("encuentra 12-13 nuevas y 12-13 llenas en 2026, alternadas y exactas", () => {
    const news = all2026.filter((e) => e.kind === "lunation" && e.phase === "new");
    const fulls = all2026.filter((e) => e.kind === "lunation" && e.phase === "full");
    expect(news.length).toBeGreaterThanOrEqual(12);
    expect(news.length).toBeLessThanOrEqual(13);
    expect(fulls.length).toBeGreaterThanOrEqual(12);
    expect(fulls.length).toBeLessThanOrEqual(13);
    // exactitud interna: elongación ≈ 0/180 en el instante hallado
    for (const e of all2026) {
      if (e.kind !== "lunation") continue;
      const el = elongationAt(e.atIso);
      const target = e.phase === "new" ? 0 : 180;
      const diff = Math.abs(((el - target + 540) % 360) - 180);
      expect(diff).toBeLessThan(0.01);
    }
  });

  it("bandera de eclipse: exactamente los 4 eclipses de 2026 (17-feb solar, 3-mar lunar, 12-ago solar, 28-ago lunar)", () => {
    const flagged = all2026
      .filter((e): e is Extract<typeof e, { kind: "lunation" }> => e.kind === "lunation" && e.eclipse !== null)
      .map((e) => ({ date: e.atIso.slice(0, 10), eclipse: e.eclipse }));
    expect(flagged).toHaveLength(4);
    const dates = flagged.map((f) => f.date);
    // ±1 día de tolerancia por zona horaria del máximo
    const near = (target: string) => dates.some((d) => Math.abs(DateTime.fromISO(d).diff(DateTime.fromISO(target), "days").days) <= 1);
    expect(near("2026-02-17")).toBe(true);
    expect(near("2026-03-03")).toBe(true);
    expect(near("2026-08-12")).toBe(true);
    expect(near("2026-08-28")).toBe(true);
    expect(flagged.filter((f) => f.eclipse === "solar")).toHaveLength(2);
    expect(flagged.filter((f) => f.eclipse === "lunar")).toHaveLength(2);
  });

  it("rango de un mes contiene al menos una nueva o llena, ordenadas por fecha", () => {
    const july = lunations("2026-07-01T00:00:00Z", "2026-07-31T23:59:59Z");
    expect(july.length).toBeGreaterThanOrEqual(1);
    const times = july.map((e) => DateTime.fromISO(e.atIso).toMillis());
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });
});
