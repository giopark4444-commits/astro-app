// packages/core/src/bazi/__tests__/stars.test.ts
import { describe, it, expect } from "vitest";
import { symbolicStars, voidBranches, STARS } from "../stars";

const P = (stem: number, branch: number) => ({ stem, branch });
const hit = (list: { star: string; pillar: string }[], star: string, pillar: string) =>
  list.some((h) => h.star === star && h.pillar === pillar);

describe("空亡 (vacíos por decena del pilar de día)", () => {
  it("甲子旬 (día 甲子) → vacíos 戌亥 (10, 11)", () => {
    expect(voidBranches(P(0, 0))).toEqual([10, 11]);
  });
  it("甲戌旬 (día 甲戌) → 申酉 (8, 9); 甲申旬 → 午未 (6, 7)", () => {
    expect(voidBranches(P(0, 10))).toEqual([8, 9]);
    expect(voidBranches(P(0, 8))).toEqual([6, 7]);
  });
});

describe("神煞 núcleo (tablas canónicas por tronco/trino de día)", () => {
  it("天乙貴人: día 甲 → 丑/未 (mnemónico 甲戊庚牛羊)", () => {
    const stars = symbolicStars({ year: P(2, 1), month: P(3, 7), day: P(0, 4), hour: null });
    expect(hit(stars, "nobleman", "year")).toBe(true);
    expect(hit(stars, "nobleman", "month")).toBe(true);
  });
  it("文昌: día 甲 → 巳; 羊刃: día 甲 → 卯", () => {
    const stars = symbolicStars({ year: P(2, 5), month: P(3, 3), day: P(0, 4), hour: null });
    expect(hit(stars, "academic", "year")).toBe(true);
    expect(hit(stars, "goat_blade", "month")).toBe(true);
  });
  it("桃花 por trino del día: día en 申子辰 → 酉; 驛馬 → 寅; 華蓋 → 辰", () => {
    const stars = symbolicStars({ year: P(2, 9), month: P(3, 2), day: P(0, 0), hour: P(4, 4) });
    expect(hit(stars, "peach_blossom", "year")).toBe(true);
    expect(hit(stars, "sky_horse", "month")).toBe(true);
    expect(hit(stars, "canopy", "hour")).toBe(true);
  });
  it("空亡 como StarHit: día 甲子 marca void en pilares con rama 戌/亥", () => {
    const stars = symbolicStars({ year: P(2, 10), month: P(3, 11), day: P(0, 0), hour: null });
    expect(hit(stars, "void", "year")).toBe(true);
    expect(hit(stars, "void", "month")).toBe(true);
  });
  it("catálogo STARS tiene los 7 con hanzi y hangul", () => {
    expect(STARS.map((s) => s.key).sort()).toEqual(
      ["academic", "canopy", "goat_blade", "nobleman", "peach_blossom", "sky_horse", "void"].sort(),
    );
    expect(STARS.every((s) => s.hanzi.length > 0 && s.hangul.length > 0)).toBe(true);
  });
});
