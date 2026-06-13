import { describe, it, expect } from "vitest";
import { detectAspects } from "../aspects";

describe("detectAspects", () => {
  it("detecta un trígono exacto (120°) dentro de orbe", () => {
    const points = [
      { key: "sun", longitude: 10, speed: 1 },
      { key: "moon", longitude: 130, speed: 13 },
    ];
    const asp = detectAspects(points);
    expect(asp).toHaveLength(1);
    expect(asp[0]).toMatchObject({ a: "sun", b: "moon", aspect: "trine", harmony: "soft" });
    expect(asp[0]!.orb).toBeCloseTo(0, 5);
  });

  it("no detecta aspecto fuera de orbe", () => {
    const points = [
      { key: "sun", longitude: 0, speed: 1 },
      { key: "mars", longitude: 100, speed: 0.5 }, // 100° no es aspecto mayor
    ];
    expect(detectAspects(points)).toHaveLength(0);
  });

  it("incluye menores solo si se pide", () => {
    const points = [
      { key: "a", longitude: 0, speed: 1 },
      { key: "b", longitude: 150, speed: 0 }, // quincuncio (menor)
    ];
    expect(detectAspects(points)).toHaveLength(0);
    expect(detectAspects(points, { includeMinor: true })).toHaveLength(1);
  });

  it("marca aplicativo cuando los cuerpos se acercan al aspecto", () => {
    const points = [
      { key: "sun", longitude: 0, speed: 0 },
      { key: "moon", longitude: 118, speed: 13 },
    ];
    const asp = detectAspects(points);
    expect(asp[0]!.applying).toBe(true);
  });
});
