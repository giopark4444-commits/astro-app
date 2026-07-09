// packages/core/src/bazi/__tests__/strength.test.ts
import { describe, it, expect } from "vitest";
import { dayMasterStrength, favorableElements, STRENGTH_THRESHOLDS } from "../strength";

const P = (stem: number, branch: number) => ({ stem, branch });

describe("dayMasterStrength (puntaje transparente)", () => {
  it("caso claramente FUERTE: 甲 nacido en primavera (mes 寅) rodeado de madera/agua", () => {
    // día 甲子 (agua bajo el DM = recurso), mes 甲寅 (madera plena), año 壬寅, hora 乙亥
    const s = dayMasterStrength({ year: P(8, 2), month: P(0, 2), day: P(0, 0), hour: P(1, 11) });
    expect(s.seasonState).toBe("wang");
    expect(s.verdict).toBe("strong");
    expect(s.score).toBeGreaterThan(STRENGTH_THRESHOLDS.strongAbove);
  });
  it("caso claramente DÉBIL: 甲 nacido en otoño (mes 酉) sin raíces ni apoyos", () => {
    // día 甲午, mes 辛酉 (metal pleno), año 庚申, hora 丙午 — puro control/drenaje
    const s = dayMasterStrength({ year: P(6, 8), month: P(7, 9), day: P(0, 6), hour: P(2, 6) });
    expect(s.seasonState).toBe("si");
    expect(s.verdict).toBe("weak");
    expect(s.score).toBeLessThan(STRENGTH_THRESHOLDS.weakBelow);
  });
  it("los drivers suman exactamente el score", () => {
    const s = dayMasterStrength({ year: P(8, 2), month: P(0, 2), day: P(0, 0), hour: P(1, 11) });
    const sum = s.drivers.reduce((a, d) => a + d.points, 0);
    expect(Math.min(100, sum)).toBe(s.score);
  });
  it("estados estacionales: 甲 en 亥 (invierno)=相; 甲 en 午 (verano)=休; 甲 en 未 (tierra)=囚", () => {
    expect(dayMasterStrength({ year: P(2, 0), month: P(2, 11), day: P(0, 6), hour: null }).seasonState).toBe("xiang");
    expect(dayMasterStrength({ year: P(2, 0), month: P(2, 6), day: P(0, 6), hour: null }).seasonState).toBe("xiu");
    expect(dayMasterStrength({ year: P(2, 0), month: P(2, 7), day: P(0, 6), hour: null }).seasonState).toBe("qiu");
  });
  it("sin hora funciona (3 pilares) y no aporta drivers de hora", () => {
    const s = dayMasterStrength({ year: P(8, 2), month: P(0, 2), day: P(0, 0), hour: null });
    expect(s.drivers.every((d) => d.pillar !== "hour")).toBe(true);
  });
});

describe("favorableElements (喜用神/忌神)", () => {
  it("débil → favorece recurso+par; evita drenaje/riqueza/control (DM 甲 = madera)", () => {
    const f = favorableElements("weak", 0);
    expect(f.favor.sort()).toEqual(["water", "wood"].sort());
    expect(f.avoid.sort()).toEqual(["earth", "fire", "metal"].sort());
  });
  it("fuerte → favorece drenaje/riqueza/control; evita recurso+par", () => {
    const f = favorableElements("strong", 0);
    expect(f.favor.sort()).toEqual(["earth", "fire", "metal"].sort());
    expect(f.avoid.sort()).toEqual(["water", "wood"].sort());
  });
  it("equilibrado → listas vacías (la UI muestra nota de matiz)", () => {
    const f = favorableElements("balanced", 0);
    expect(f.favor).toEqual([]);
    expect(f.avoid).toEqual([]);
  });
});
