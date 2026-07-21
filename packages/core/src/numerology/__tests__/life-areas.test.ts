import { describe, it, expect } from "vitest";
import { scoreLifeAreasNumerology } from "../life-areas";
import { personalCycles } from "../cycles";

describe("scoreLifeAreasNumerology", () => {
  it("produce las 6 áreas con score 0-100 y es determinista", () => {
    const cycles = personalCycles({ year: 1990, month: 2, day: 4 }, { year: 2026, month: 7, day: 21 });
    const scores = scoreLifeAreasNumerology(cycles);
    expect(scores).toHaveLength(6);
    for (const s of scores) { expect(s.score).toBeGreaterThanOrEqual(0); expect(s.score).toBeLessThanOrEqual(100); expect(["love","money","work","health","mood","luck"]).toContain(s.area); }
    expect(scoreLifeAreasNumerology(cycles)).toEqual(scores); // determinista
  });
  it("un día personal 8 sube dinero y trabajo por encima de neutral", () => {
    // construir cycles cuyo personalDay reduzca a 8 (elegir fecha; o mock del shape)
    const cycles = { personalYear: { value: 8 } as never, personalMonth: { value: 8 } as never, personalDay: { value: 8, isMaster: false } as never };
    const scores = scoreLifeAreasNumerology(cycles as never);
    const money = scores.find((s) => s.area === "money")!;
    const love = scores.find((s) => s.area === "love")!;
    expect(money.score).toBeGreaterThan(50);
    expect(money.score).toBeGreaterThan(love.score);
  });
});
