// packages/core/src/astrology/__tests__/life-areas.test.ts
import { describe, it, expect } from "vitest";
import { scoreLifeAreas, type LifeArea, type LifeAreaScore } from "../life-areas";
import type { Aspect } from "../types";

const HARMONY = {
  conjunction: "neutral",
  sextile: "soft",
  square: "hard",
  trine: "soft",
  opposition: "hard",
} as const;
const ANGLE = { conjunction: 0, sextile: 60, square: 90, trine: 120, opposition: 180 } as const;

/** Construye un aspecto tránsito(a)→natal(b). orb 0 = exacto. */
function asp(a: string, b: string, aspect: keyof typeof HARMONY, orb = 0): Aspect {
  return { a, b, aspect, angle: ANGLE[aspect], orb, applying: false, harmony: HARMONY[aspect] };
}

function byArea(scores: LifeAreaScore[]): Record<LifeArea, LifeAreaScore> {
  return Object.fromEntries(scores.map((s) => [s.area, s])) as Record<LifeArea, LifeAreaScore>;
}

describe("scoreLifeAreas", () => {
  it("sin aspectos: todas las áreas en 50 (neutral)", () => {
    const s = scoreLifeAreas([]);
    expect(s).toHaveLength(6);
    expect(s.every((x) => x.score === 50 && x.tone === "mixed")).toBe(true);
  });

  it("Júpiter trígono a tu Venus eleva amor/dinero/ánimo, y NO toca trabajo", () => {
    const s = byArea(scoreLifeAreas([asp("jupiter", "venus", "trine")]));
    expect(s.love.score).toBeGreaterThan(50);
    expect(s.money.score).toBeGreaterThan(50);
    expect(s.mood.score).toBeGreaterThan(50);
    expect(s.love.tone).toBe("high");
    expect(s.work.score).toBe(50); // Venus no rige trabajo
  });

  it("Saturno cuadratura a tu Luna baja salud/ánimo/amor (y deja trabajo intacto)", () => {
    const s = byArea(scoreLifeAreas([asp("saturn", "moon", "square")]));
    expect(s.health.score).toBeLessThan(50);
    expect(s.mood.score).toBeLessThan(50);
    expect(s.love.score).toBeLessThan(50);
    expect(s.health.tone).toBe("low");
    expect(s.work.score).toBe(50); // la Luna no rige trabajo
  });

  it("el orbe pesa: un aspecto exacto mueve más que uno amplio", () => {
    const exact = byArea(scoreLifeAreas([asp("jupiter", "venus", "trine", 0)])).love.score;
    const wide = byArea(scoreLifeAreas([asp("jupiter", "venus", "trine", 6)])).love.score;
    expect(exact).toBeGreaterThan(wide);
  });

  it("la conjunción depende del planeta: Venus eleva, Saturno baja", () => {
    const venus = byArea(scoreLifeAreas([asp("venus", "moon", "conjunction")])).mood.score;
    const saturn = byArea(scoreLifeAreas([asp("saturn", "moon", "conjunction")])).mood.score;
    expect(venus).toBeGreaterThan(50);
    expect(saturn).toBeLessThan(50);
  });

  it("varios aspectos duros se acumulan pero el score nunca baja de 0", () => {
    const s = byArea(
      scoreLifeAreas([
        asp("saturn", "moon", "square"),
        asp("pluto", "moon", "opposition"),
        asp("mars", "moon", "square"),
      ]),
    );
    expect(s.health.score).toBeGreaterThanOrEqual(0);
    expect(s.mood.score).toBeGreaterThanOrEqual(0);
    expect(s.health.drivers.length).toBeGreaterThan(0);
    expect(s.health.drivers[0]!.favorable).toBe(false);
  });
});
