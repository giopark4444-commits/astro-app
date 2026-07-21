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

  it("un día personal MAESTRO (11/22/33) pesa más que el mismo dígito no-maestro en sus áreas afines", () => {
    // toDigit reduce el maestro al lookup de afinidad (11→2, 22→4, 33→6) pero
    // isMaster suma un pico extra (+6, MASTER_PEAK) a esas mismas áreas — así
    // que el maestro debe superar al dígito llano equivalente, no solo a neutral.
    // personalMonth/personalYear fijos en 1 (work/mood) en ambas ramas: no tocan
    // las áreas comparadas (love/work/health) y no afectan la comparación.
    const build = (dayValue: number, isMaster: boolean) => ({
      personalYear: { value: 1, isMaster: false } as never,
      personalMonth: { value: 1, isMaster: false } as never,
      personalDay: { value: dayValue, isMaster } as never,
    });

    const cases: Array<{ master: number; digit: number; area: "love" | "work" | "health" }> = [
      { master: 11, digit: 2, area: "love" }, // toDigit(11)=2 → love/mood
      { master: 22, digit: 4, area: "work" }, // toDigit(22)=4 → work/health
      { master: 33, digit: 6, area: "health" }, // toDigit(33)=6 → love/health
    ];

    for (const { master, digit, area } of cases) {
      const masterScore = scoreLifeAreasNumerology(build(master, true) as never).find((s) => s.area === area)!;
      const digitScore = scoreLifeAreasNumerology(build(digit, false) as never).find((s) => s.area === area)!;
      expect(masterScore.score).toBeGreaterThan(digitScore.score);
    }
  });
});
