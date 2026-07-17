import { describe, expect, it } from "vitest";
import { LIFE_AREAS } from "../../astrology/life-areas";
import { LIFE_AREA_COLORS, NUMBER_COLORS, numberColor } from "../colors";

const HEX = /^#[0-9a-f]{6}$/;

describe("colores de dominio para el modo Colorido", () => {
  it("cada área de vida tiene su color hex", () => {
    for (const a of LIFE_AREAS) {
      expect(LIFE_AREA_COLORS[a], `área ${a}`).toMatch(HEX);
    }
    expect(Object.keys(LIFE_AREA_COLORS).sort()).toEqual([...LIFE_AREAS].sort());
  });

  it("los 9 números base y los 3 maestros tienen color; numberColor reduce y cae bien", () => {
    for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33]) {
      expect(NUMBER_COLORS[n], `número ${n}`).toMatch(HEX);
    }
    expect(numberColor(11)).toBe(NUMBER_COLORS[11]); // maestro directo
    expect(numberColor(28)).toBe(NUMBER_COLORS[1]); // 28→10→1
    expect(numberColor(0)).toBe(NUMBER_COLORS[9]); // fuera de rango → fallback sereno
  });

  it("colores distintos entre áreas (nada de barras gemelas)", () => {
    const vals = Object.values(LIFE_AREA_COLORS);
    expect(new Set(vals).size).toBe(vals.length);
  });
});
