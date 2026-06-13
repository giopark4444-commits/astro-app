import { describe, it, expect } from "vitest";
import { computeDistribution, quadrantOfHouse } from "../distribution";

describe("computeDistribution", () => {
  it("cuenta elementos y modalidades y halla el dominante", () => {
    const bodies = [
      { key: "sun", longitude: 315 }, // Acuario: aire/fijo/yang
      { key: "moon", longitude: 355 }, // Piscis: agua/mutable/yin
      { key: "venus", longitude: 283 }, // Capricornio: tierra/cardinal/yin
      { key: "mars", longitude: 222 }, // Escorpio: agua/fijo/yin
    ];
    const d = computeDistribution(bodies);
    expect(d.elements.water).toBe(2);
    expect(d.elements.air).toBe(1);
    expect(d.elements.earth).toBe(1);
    expect(d.dominantElement).toBe("water");
    expect(d.polarities.yin).toBe(3);
  });
});

describe("quadrantOfHouse", () => {
  it("mapea casa a cuadrante 1-4", () => {
    expect(quadrantOfHouse(1)).toBe(1);
    expect(quadrantOfHouse(4)).toBe(2);
    expect(quadrantOfHouse(7)).toBe(3);
    expect(quadrantOfHouse(12)).toBe(4);
  });
});
