import { describe, it, expect } from "vitest";
import { computeBodies } from "../bodies";
import { localToJulianDay } from "../time";

const GIO_JD = localToJulianDay({
  year: 1984, month: 2, day: 5, hour: 9, minute: 0, timeZone: "America/Guayaquil",
});

function lonOf(bodies: ReturnType<typeof computeBodies>, key: string): number {
  return bodies.find((b) => b.body === key)!.longitude;
}

describe("computeBodies sideral (Lahiri)", () => {
  it("desplaza el Sol por el ayanamsha (~23.6° en 1984 -> Capricornio)", () => {
    const sid = computeBodies(GIO_JD.julianDayEt, { sidereal: true });
    const sunSid = sid.find((b) => b.body === "sun")!.longitude;
    // tropical 315.96 - ayanamsha Lahiri (~23.6° en 1984) ≈ 292.3° (Capricornio)
    expect(sunSid).toBeGreaterThan(291);
    expect(sunSid).toBeLessThan(294);
  });
  it("un ayanamsha distinto da un resultado distinto", () => {
    const lahiri = computeBodies(GIO_JD.julianDayEt, { sidereal: true, ayanamsha: "lahiri" })
      .find((b) => b.body === "sun")!.longitude;
    const fagan = computeBodies(GIO_JD.julianDayEt, { sidereal: true, ayanamsha: "fagan_bradley" })
      .find((b) => b.body === "sun")!.longitude;
    expect(Math.abs(lahiri - fagan)).toBeGreaterThan(0.3); // difieren por ~0.9°
  });
});

describe("computeBodies (carta de Gio, tropical)", () => {
  const bodies = computeBodies(GIO_JD.julianDayEt, { nodeType: "true", lilithType: "mean" });

  it("devuelve 14 puntos", () => {
    expect(bodies).toHaveLength(14);
  });

  const TOL = 0.05; // 3 arcmin
  it.each([
    ["sun", 315.96], ["moon", 355.02], ["mercury", 294.97], ["venus", 283.24],
    ["mars", 222.31], ["jupiter", 273.48], ["saturn", 226.07], ["uranus", 252.80],
    ["neptune", 270.55], ["pluto", 212.14], ["north_node", 73.61], ["chiron", 57.76],
  ])("%s ≈ %f°", (key, expected) => {
    expect(Math.abs(lonOf(bodies, key as string) - (expected as number))).toBeLessThan(TOL);
  });

  it("Plutón está retrógrado y el Sol no", () => {
    expect(bodies.find((b) => b.body === "pluto")!.retrograde).toBe(true);
    expect(bodies.find((b) => b.body === "sun")!.retrograde).toBe(false);
  });

  it("el Nodo Sur es opuesto al Norte", () => {
    const n = lonOf(bodies, "north_node");
    const s = lonOf(bodies, "south_node");
    expect((s - n + 360) % 360).toBeCloseTo(180, 3);
  });
});
