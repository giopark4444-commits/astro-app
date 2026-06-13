import { describe, it, expect } from "vitest";
import { ZODIAC_SIGNS, PLANETS, ASPECTS, DEFAULT_ORBS } from "../astrology";

describe("astrology constants", () => {
  it("tiene 12 signos en orden tropical empezando por Aries", () => {
    expect(ZODIAC_SIGNS).toHaveLength(12);
    expect(ZODIAC_SIGNS[0]).toMatchObject({ key: "aries", element: "fire", modality: "cardinal" });
    expect(ZODIAC_SIGNS[11]).toMatchObject({ key: "pisces", element: "water" });
  });

  it("incluye los 14 puntos requeridos por la voz (10 planetas + Quirón, Nodos, Lilith)", () => {
    const keys = PLANETS.map((p) => p.key);
    for (const k of ["sun","moon","mercury","venus","mars","jupiter","saturn","uranus","neptune","pluto","chiron","north_node","lilith"]) {
      expect(keys).toContain(k);
    }
  });

  it("define los aspectos mayores con su ángulo", () => {
    const conj = ASPECTS.find((a) => a.key === "conjunction");
    expect(conj).toMatchObject({ angle: 0, harmony: "neutral" });
    expect(ASPECTS.find((a) => a.key === "trine")).toMatchObject({ angle: 120, harmony: "soft" });
    expect(ASPECTS.find((a) => a.key === "square")).toMatchObject({ angle: 90, harmony: "hard" });
  });

  it("tiene orbe por defecto para los aspectos mayores", () => {
    expect(DEFAULT_ORBS.conjunction).toBeGreaterThan(0);
  });
});
