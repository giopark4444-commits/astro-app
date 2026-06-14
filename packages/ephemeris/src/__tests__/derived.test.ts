import { describe, it, expect } from "vitest";
import type { ChartInput } from "@aluna/core";
import { computeChart, computeDerivedChart } from "../index";

const natal: ChartInput = {
  year: 1990,
  month: 2,
  day: 4,
  hour: 14,
  minute: 0,
  timeZone: "America/Guayaquil",
  latitude: -2.17,
  longitude: -79.92,
};
const REF = "2026-06-14T12:00:00Z";
const sunLon = (c: ReturnType<typeof computeChart>) => c.bodies.find((b) => b.body === "sun")!.longitude;

describe("computeDerivedChart", () => {
  it("produce una carta completa (14 cuerpos + 12 cúspides)", () => {
    const t = computeDerivedChart(natal, "transits", REF);
    expect(t.bodies).toHaveLength(14);
    expect(t.houses.cusps).toHaveLength(12);
  });

  it("tránsitos y progresiones mueven el Sol respecto al natal", () => {
    const n = Math.round(sunLon(computeChart(natal)));
    const t = Math.round(sunLon(computeDerivedChart(natal, "transits", REF)));
    const p = Math.round(sunLon(computeDerivedChart(natal, "progressed", REF)));
    expect(t).not.toBe(n);
    expect(p).not.toBe(n);
  });

  it("la progresión secundaria avanza el Sol ~1°/año (≈36° a los 36)", () => {
    const n = sunLon(computeChart(natal));
    const p = sunLon(computeDerivedChart(natal, "progressed", REF));
    const diff = ((p - n + 540) % 360) - 180; // diferencia angular con signo
    expect(diff).toBeGreaterThan(30);
    expect(diff).toBeLessThan(40);
  });
});
