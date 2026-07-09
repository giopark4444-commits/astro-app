// packages/core/src/bazi/__tests__/nayin.test.ts
import { describe, it, expect } from "vitest";
import { sexagenaryIndex, nayin, NAYIN } from "../nayin";

describe("sexagenaryIndex", () => {
  it("甲子=0, 乙丑=1, 癸亥=59", () => {
    expect(sexagenaryIndex({ stem: 0, branch: 0 })).toBe(0);
    expect(sexagenaryIndex({ stem: 1, branch: 1 })).toBe(1);
    expect(sexagenaryIndex({ stem: 9, branch: 11 })).toBe(59);
  });
  it("甲戌=10 (2ª decena), 庚辰=16", () => {
    expect(sexagenaryIndex({ stem: 0, branch: 10 })).toBe(10);
    expect(sexagenaryIndex({ stem: 6, branch: 4 })).toBe(16);
  });
});

describe("nayin (納音, 30 pares canónicos)", () => {
  it("hay exactamente 30 entradas", () => {
    expect(NAYIN).toHaveLength(30);
  });
  it("甲子/乙丑 = 海中金 (metal)", () => {
    expect(nayin({ stem: 0, branch: 0 })).toMatchObject({ key: "sea_gold", hanzi: "海中金", element: "metal" });
    expect(nayin({ stem: 1, branch: 1 }).key).toBe("sea_gold");
  });
  it("庚辰/辛巳 = 白鑞金", () => {
    expect(nayin({ stem: 6, branch: 4 }).hanzi).toBe("白鑞金");
  });
  it("戊子/己丑 = 霹靂火 (fire); 壬戌/癸亥 = 大海水 (water)", () => {
    expect(nayin({ stem: 4, branch: 0 })).toMatchObject({ hanzi: "霹靂火", element: "fire" });
    expect(nayin({ stem: 8, branch: 10 })).toMatchObject({ hanzi: "大海水", element: "water" });
  });
});
