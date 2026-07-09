// packages/core/src/bazi/__tests__/luck.test.ts
import { describe, it, expect } from "vitest";
import { luckDirection, luckPillars, annualPillars } from "../luck";
import { yearPillar, tenGod } from "../bazi";

const P = (stem: number, branch: number) => ({ stem, branch });
const natal = { year: P(6, 6), month: P(3, 1), day: P(0, 0), hour: P(4, 4) }; // año 庚午 (yang)

describe("luckDirection (陽男陰女順行)", () => {
  it("año yang + masculino = adelante; yang + femenino = atrás", () => {
    expect(luckDirection(6, "masculine")).toBe("forward");
    expect(luckDirection(6, "feminine")).toBe("backward");
  });
  it("año yin + femenino = adelante; yin + masculino = atrás", () => {
    expect(luckDirection(7, "feminine")).toBe("forward");
    expect(luckDirection(7, "masculine")).toBe("backward");
  });
});

describe("luckPillars", () => {
  const base = { pillars: natal, birthYear: 1990, daysToPrevJie: 9, daysToNextJie: 21 };

  it("regla 3 días = 1 año: adelante usa daysToNextJie (21/3 = 7 años 0 meses)", () => {
    const [seq] = luckPillars({ ...base, gender: "masculine" });
    expect(seq!.direction).toBe("forward");
    expect(seq!.startAgeYears).toBe(7);
    expect(seq!.startAgeMonths).toBe(0);
  });
  it("atrás usa daysToPrevJie (9/3 = 3 años); fracción → meses (10/3 días = 3a 4m)", () => {
    const [seq] = luckPillars({ ...base, gender: "feminine" });
    expect(seq!.direction).toBe("backward");
    expect(seq!.startAgeYears).toBe(3);
    const [seq2] = luckPillars({ ...base, daysToPrevJie: 10, gender: "feminine" });
    expect(seq2!.startAgeYears).toBe(3);
    expect(seq2!.startAgeMonths).toBe(4);
  });
  it("la secuencia avanza el ciclo sexagenario desde el pilar de MES (mes 丁丑 → 1º 大運 adelante = 戊寅)", () => {
    const [seq] = luckPillars({ ...base, gender: "masculine" });
    expect(seq!.pillars[0]!.pillar).toEqual({ stem: 4, branch: 2 });
    expect(seq!.pillars[1]!.pillar).toEqual({ stem: 5, branch: 3 });
    expect(seq!.pillars).toHaveLength(9);
  });
  it("atrás retrocede: mes 丁丑 → 1º = 丙子", () => {
    const [seq] = luckPillars({ ...base, gender: "feminine" });
    expect(seq!.pillars[0]!.pillar).toEqual({ stem: 2, branch: 0 });
  });
  it("cada década trae edad, año civil, Dios y Na Yin; décadas espaciadas 10 años", () => {
    const [seq] = luckPillars({ ...base, gender: "masculine" });
    const p0 = seq!.pillars[0]!;
    expect(p0.startAge).toBe(7);
    expect(p0.startYear).toBe(1997);
    expect(p0.tenGod).toBe(tenGod(0, 4));
    expect(p0.nayin.hanzi.length).toBeGreaterThan(0);
    expect(seq!.pillars[1]!.startAge).toBe(17);
  });
  it("género neutral → DOS secuencias (forward primero)", () => {
    const seqs = luckPillars({ ...base, gender: "neutral" });
    expect(seqs).toHaveLength(2);
    expect(seqs[0]!.direction).toBe("forward");
    expect(seqs[1]!.direction).toBe("backward");
  });
});

describe("annualPillars (流年)", () => {
  it("el pilar del año N es yearPillar(N), con Dios vs DM", () => {
    const rows = annualPillars(natal, 2026, 3);
    expect(rows).toHaveLength(3);
    expect(rows[0]!.year).toBe(2026);
    expect(rows[0]!.pillar).toEqual(yearPillar(2026));
    expect(rows[0]!.tenGod).toBe(tenGod(0, yearPillar(2026).stem));
  });
  it("marca interacciones de la rama del año contra las ramas natales (ej: año 午 choca 子 del día)", () => {
    // 2026 = 丙午 → rama 午 choca con la rama 子 del pilar de día del natal de prueba
    const rows = annualPillars(natal, 2026, 1);
    expect(rows[0]!.marks.some((m) => m.type === "clash" && m.vs === "day")).toBe(true);
  });
});
