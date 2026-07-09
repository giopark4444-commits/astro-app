// packages/core/src/bazi/__tests__/interactions.test.ts
import { describe, it, expect } from "vitest";
import { detectInteractions, branchPairInteractions, type Interaction } from "../interactions";

const P = (stem: number, branch: number) => ({ stem, branch });
const has = (list: Interaction[], type: string, positions: string[]) =>
  list.some((i) => i.type === type && positions.every((p) => i.positions.includes(p as never)) && i.positions.length === positions.length);

describe("branchPairInteractions (pares, para marcas de 流年)", () => {
  it("子午 = choque; 子丑 = 六合→tierra; 子未 = daño; 子卯 = castigo", () => {
    expect(branchPairInteractions(0, 6).map((x) => x.type)).toContain("clash");
    const combo = branchPairInteractions(0, 1).find((x) => x.type === "six_combo");
    expect(combo?.element).toBe("earth");
    expect(branchPairInteractions(0, 7).map((x) => x.type)).toContain("harm");
    expect(branchPairInteractions(0, 3).map((x) => x.type)).toContain("punishment");
  });
  it("辰辰 = auto-castigo; 寅亥 = 六合→madera (y también daño NO: 寅巳 es daño)", () => {
    expect(branchPairInteractions(4, 4).map((x) => x.type)).toContain("self_punishment");
    expect(branchPairInteractions(2, 11).find((x) => x.type === "six_combo")?.element).toBe("wood");
    expect(branchPairInteractions(2, 5).map((x) => x.type)).toContain("harm");
  });
});

describe("detectInteractions (set natal)", () => {
  it("detecta trino completo 申子辰→agua con las 3 posiciones", () => {
    const list = detectInteractions({ year: P(0, 8), month: P(1, 0), day: P(2, 4), hour: P(3, 3) });
    expect(has(list, "trine", ["year", "month", "day"])).toBe(true);
    expect(list.find((i) => i.type === "trine")?.element).toBe("water");
  });
  it("medio trino requiere la rama pivote (子午卯酉): 申+子 sí; 申+辰 no", () => {
    const a = detectInteractions({ year: P(0, 8), month: P(1, 0), day: P(2, 2), hour: null });
    expect(a.some((i) => i.type === "half_trine")).toBe(true);
    const b = detectInteractions({ year: P(0, 8), month: P(1, 4), day: P(2, 2), hour: null });
    expect(b.some((i) => i.type === "half_trine")).toBe(false);
  });
  it("castigo de 3 (寅巳申) con las tres presentes; 丑戌未 igual", () => {
    const list = detectInteractions({ year: P(0, 2), month: P(1, 5), day: P(2, 8), hour: null });
    expect(has(list, "punishment", ["year", "month", "day"])).toBe(true);
  });
  it("天干五合: 甲+己→tierra entre año y mes", () => {
    const list = detectInteractions({ year: P(0, 0), month: P(5, 2), day: P(2, 4), hour: null });
    const sc = list.find((i) => i.type === "stem_combo");
    expect(sc?.positions).toEqual(expect.arrayContaining(["year", "month"]));
    expect(sc?.element).toBe("earth");
  });
  it("sin hora, no inventa interacciones con la hora", () => {
    const list = detectInteractions({ year: P(0, 0), month: P(1, 6), day: P(2, 2), hour: null });
    expect(list.every((i) => !i.positions.includes("hour"))).toBe(true);
    expect(has(list, "clash", ["year", "month"])).toBe(true);
  });
});
