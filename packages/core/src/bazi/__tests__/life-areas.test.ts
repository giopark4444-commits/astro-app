// packages/core/src/bazi/__tests__/life-areas.test.ts
import { describe, it, expect } from "vitest";
import { scoreLifeAreasBazi, combineLifeAreas } from "../life-areas";
import { dayPillar } from "../bazi";
import { dayMasterStrength, favorableElements } from "../strength";
import type { Pillar } from "../bazi";
import type { PillarSet } from "../interactions";
import { LIFE_AREAS, scoreTone, type LifeAreaScore } from "../../astrology/life-areas";

// Natal madera dominante (mismo caso "fuerte" de strength.test): DM 甲 (madera) nacido
// en primavera (mes 寅) rodeado de madera/agua ⇒ Maestro del Día FUERTE. Para un DM
// fuerte, fuego/tierra/metal son 喜用 (favor) y madera/agua son 忌 (avoid).
const strongWood: PillarSet = {
  year: { stem: 8, branch: 2 }, // 壬寅
  month: { stem: 0, branch: 2 }, // 甲寅
  day: { stem: 0, branch: 0 }, // 甲子  (DM = 甲 madera)
  hour: { stem: 1, branch: 11 }, // 乙亥
};

// Día 甲子 de referencia: 甲 (tronco 0, madera) · 子 (rama 0). Corresponde al 2000-01-07.
const jiaZi: Pillar = { stem: 0, branch: 0 };

describe("scoreLifeAreasBazi (Wu Xing → áreas)", () => {
  it("produce las 6 áreas con score 0-100 y es determinista", () => {
    const scores = scoreLifeAreasBazi(strongWood, jiaZi);
    expect(scores).toHaveLength(6);
    for (const s of scores) {
      expect(s.score).toBeGreaterThanOrEqual(0);
      expect(s.score).toBeLessThanOrEqual(100);
      expect(["love", "money", "work", "health", "mood", "luck"]).toContain(s.area);
    }
    expect(scoreLifeAreasBazi(strongWood, jiaZi)).toEqual(scores); // determinista
  });

  it("el día 甲子 de la fixture corresponde al 2000-01-07", () => {
    expect(dayPillar(2000, 1, 7)).toEqual(jiaZi);
  });

  it("el natal fuerte tiene fuego favorable y madera a evitar (premisa de la fixture)", () => {
    const { verdict } = dayMasterStrength(strongWood);
    expect(verdict).toBe("strong");
    const { favor, avoid } = favorableElements(verdict, strongWood.day.stem);
    expect(favor).toContain("fire");
    expect(avoid).toContain("wood");
  });

  it("un día de elemento FAVORABLE (丙 fuego) sube sus áreas por encima de neutral", () => {
    const scores = scoreLifeAreasBazi(strongWood, { stem: 2, branch: 0 }); // 丙 fuego → love/mood
    const love = scores.find((s) => s.area === "love")!;
    const mood = scores.find((s) => s.area === "mood")!;
    const money = scores.find((s) => s.area === "money")!;
    expect(love.score).toBeGreaterThan(50);
    expect(mood.score).toBeGreaterThan(50);
    expect(love.score).toBeGreaterThan(money.score); // dinero no lo toca este elemento
  });

  it("un día de elemento a EVITAR (甲子 madera) baja sus áreas por debajo de neutral", () => {
    const scores = scoreLifeAreasBazi(strongWood, jiaZi); // 甲 madera (avoid) → health/mood
    const health = scores.find((s) => s.area === "health")!;
    expect(health.score).toBeLessThan(50);
  });

  it("un natal BALANCEADO trata todo elemento como neutro (sube leve, no baja)", () => {
    // 甲 en mes 卯 (primavera → 旺, 40) con una única raíz principal (12) = raw 52,
    // dentro de la banda honesta 45-55 ⇒ verdicto "balanced" (sin favor ni avoid).
    const balanced: PillarSet = {
      year: { stem: 2, branch: 10 }, // 丙戌
      month: { stem: 2, branch: 3 }, // 丙卯
      day: { stem: 0, branch: 6 }, // 甲午 (DM 甲 madera)
      hour: null,
    };
    expect(dayMasterStrength(balanced).verdict).toBe("balanced");
    const scores = scoreLifeAreasBazi(balanced, jiaZi); // 甲 madera → neutro
    for (const s of scores) expect(s.score).toBeGreaterThanOrEqual(50);
    // sube leve (+6) sus áreas afines, sin llegar a "favorable"
    expect(scores.find((s) => s.area === "health")!.score).toBe(56);
  });

  it("no rompe sin hora de nacimiento (pilar hora null)", () => {
    const noHour: PillarSet = { ...strongWood, hour: null };
    const scores = scoreLifeAreasBazi(noHour, jiaZi);
    expect(scores).toHaveLength(6);
  });
});

describe("combineLifeAreas (modo General)", () => {
  const setOf = (score: number): LifeAreaScore[] =>
    LIFE_AREAS.map((area) => ({ area, score, tone: scoreTone(score), drivers: [] }));

  it("promedia por área: dos sets con 40 y 60 → 50", () => {
    const combined = combineLifeAreas([setOf(40), setOf(60)]);
    expect(combined).toHaveLength(6);
    for (const s of combined) {
      expect(s.score).toBe(50);
      expect(s.tone).toBe("mixed");
      expect(s.drivers).toEqual([]);
    }
  });

  it("recomputa el tono desde el promedio (30/40/80 → 50 = mixed)", () => {
    const combined = combineLifeAreas([setOf(30), setOf(40), setOf(80)]);
    const love = combined.find((s) => s.area === "love")!;
    expect(love.score).toBe(50);
    expect(love.tone).toBe("mixed");
  });

  it("es determinista", () => {
    const a = combineLifeAreas([setOf(55), setOf(65)]);
    const b = combineLifeAreas([setOf(55), setOf(65)]);
    expect(a).toEqual(b);
  });
});
