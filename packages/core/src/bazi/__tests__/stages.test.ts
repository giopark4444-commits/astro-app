// packages/core/src/bazi/__tests__/stages.test.ts
import { describe, it, expect } from "vitest";
import { lifeStage, TWELVE_STAGES } from "../stages";

describe("十二長生 (12 etapas de vida del DM por rama)", () => {
  it("las 12 etapas en orden canónico", () => {
    expect(TWELVE_STAGES.map((s) => s.hanzi)).toEqual([
      "長生", "沐浴", "冠帶", "臨官", "帝旺", "衰", "病", "死", "墓", "絕", "胎", "養",
    ]);
  });
  it("甲 (yang wood) nace 長生 en 亥 y avanza: 子=沐浴, 卯=帝旺, 未=墓", () => {
    expect(lifeStage(0, 11)).toBe("birth");
    expect(lifeStage(0, 0)).toBe("bath");
    expect(lifeStage(0, 3)).toBe("peak");
    expect(lifeStage(0, 7)).toBe("tomb");
  });
  it("乙 (yin wood) nace en 午 y RETROCEDE: 巳=沐浴, 寅=帝旺", () => {
    expect(lifeStage(1, 6)).toBe("birth");
    expect(lifeStage(1, 5)).toBe("bath");
    expect(lifeStage(1, 2)).toBe("peak");
  });
  it("庚 nace en 巳; 辛 nace en 子; 壬 en 申; 癸 en 卯 (tabla estándar)", () => {
    expect(lifeStage(6, 5)).toBe("birth");
    expect(lifeStage(7, 0)).toBe("birth");
    expect(lifeStage(8, 8)).toBe("birth");
    expect(lifeStage(9, 3)).toBe("birth");
  });
  it("戊/己 siguen al fuego: 戊 nace en 寅, 己 en 酉", () => {
    expect(lifeStage(4, 2)).toBe("birth");
    expect(lifeStage(5, 9)).toBe("birth");
  });
});
