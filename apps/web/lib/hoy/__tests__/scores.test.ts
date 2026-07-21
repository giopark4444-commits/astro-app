import { describe, it, expect } from "vitest";
import {
  LIFE_AREAS,
  type Aspect,
  type PersonalCycles,
  type PillarSet,
  type Pillar,
  type LifeAreaScore,
} from "@aluna/core";
import { assembleHoyScores, type HoyScoresInput } from "../scores";

// Traza numerológica mínima (scoreLifeAreasNumerology solo lee `value` e `isMaster`).
const trace = (value: number, isMaster = false) => ({ steps: [value], value, isMaster });

// Ciclos personales de hoy con valores distintos por ciclo, para que `numeros`
// no sea uniforme y el promedio de `general` sea comprobable.
const cycles: PersonalCycles = {
  personalYear: trace(9), // luck/love
  personalMonth: trace(4), // work/health
  personalDay: trace(8), // money/work
};

// Cuatro Pilares natales con hora conocida (índices válidos de tronco/rama).
const natal: PillarSet = {
  year: { stem: 0, branch: 2 },
  month: { stem: 2, branch: 2 },
  day: { stem: 0, branch: 0 }, // Maestro del Día 甲 (madera)
  hour: { stem: 4, branch: 6 },
};
const dayPillar: Pillar = { stem: 0, branch: 0 }; // tronco 甲 → madera

const scoreOf = (set: LifeAreaScore[], area: string) =>
  set.find((s) => s.area === area)!.score;

describe("assembleHoyScores", () => {
  const base: HoyScoresInput = {
    aspects: [] as Aspect[], // sin aspectos → astros neutral (50) en las 6 áreas
    cycles,
    natal,
    dayPillar,
  };

  it("devuelve los 4 sets, cada uno con las 6 áreas", () => {
    const out = assembleHoyScores(base);
    for (const set of [out.general, out.astros, out.numeros, out.pilares]) {
      expect(set).toHaveLength(6);
      expect(set.map((s) => s.area).sort()).toEqual([...LIFE_AREAS].sort());
    }
  });

  it("general = promedio (redondeado) de astros+números+pilares por área", () => {
    const out = assembleHoyScores(base);
    for (const area of LIFE_AREAS) {
      const a = scoreOf(out.astros, area);
      const n = scoreOf(out.numeros, area);
      const p = scoreOf(out.pilares, area);
      expect(scoreOf(out.general, area)).toBe(Math.round((a + n + p) / 3));
    }
  });

  it("los números mueven sus áreas afines (no todo queda en 50)", () => {
    const out = assembleHoyScores(base);
    // personalDay=8 → money/work encendidas; alguna área ≠ 50 en `numeros`.
    expect(out.numeros.some((s) => s.score !== 50)).toBe(true);
  });

  it("sin hora natal → pilares no rompe y sigue devolviendo 6 áreas", () => {
    const out = assembleHoyScores({ ...base, natal: { ...natal, hour: null } });
    expect(out.pilares).toHaveLength(6);
    expect(out.general).toHaveLength(6);
  });
});
