import { describe, it, expect } from "vitest";
import { signOfLongitude } from "@aluna/core";
import { computeChart } from "../chart";

describe("computeChart (carta completa de Gio)", () => {
  const chart = computeChart({
    year: 1984, month: 2, day: 5, hour: 9, minute: 0,
    timeZone: "America/Guayaquil",
    latitude: -0.2167, longitude: -78.5, // 0s13, 78w30 (referencia Astrodienst)
  });

  it("Sol en Acuario casa 11, en exilio", () => {
    const sun = chart.bodies.find((b) => b.body === "sun")!;
    expect(sun.sign).toBe("aquarius");
    expect(sun.dignity).toBe("exile");
    expect(sun.house).toBe(11); // cúspides reales: c11=24°32′Cap, c12=24°08′Acu -> Sol 15°57′Acu en la 11
  });

  it("Marte en Escorpio en domicilio; Júpiter en Capricornio en caída", () => {
    expect(chart.bodies.find((b) => b.body === "mars")!.dignity).toBe("domicile");
    expect(chart.bodies.find((b) => b.body === "jupiter")!.dignity).toBe("fall");
  });

  it("Ascendente Piscis, Medio Cielo Sagitario", () => {
    expect(signOfLongitude(chart.houses.ascendant).sign).toBe("pisces");
    expect(signOfLongitude(chart.houses.midheaven).sign).toBe("sagittarius");
  });

  it("detecta el stellium en Escorpio (Marte+Saturno+Plutón)", () => {
    const stellium = chart.patterns.find((p) => p.type === "stellium");
    expect(stellium).toBeDefined();
    expect(stellium!.bodies).toEqual(expect.arrayContaining(["mars", "saturn", "pluto"]));
  });

  it("incluye aspectos, distribución dominante y meta (TU 14:00)", () => {
    expect(chart.aspects.length).toBeGreaterThan(0);
    expect(chart.distribution.dominantElement).toBeDefined();
    expect(chart.meta.utcHour).toBeCloseTo(14, 5);
  });
});
