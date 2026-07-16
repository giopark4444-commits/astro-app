import { describe, it, expect } from "vitest";
import { ZODIAC_SIGNS } from "@aluna/core";
import { composeCoreReading as composeEs, SUN_FRAGMENT as SUN_ES, MOON_FRAGMENT as MOON_ES, ASC_FRAGMENT as ASC_ES } from "../core-reading-es";
import { composeCoreReading as composeEn, SUN_FRAGMENT as SUN_EN, MOON_FRAGMENT as MOON_EN, ASC_FRAGMENT as ASC_EN } from "../core-reading-en";

describe("lectura del núcleo (composeCoreReading)", () => {
  it("teje sol, luna y ascendente en un párrafo con negritas", () => {
    const segs = composeEs({
      sun: { sign: "aquarius", house: 11, dignity: "exile" },
      moon: { sign: "scorpio", house: 8 },
      ascSign: "pisces",
    });
    const bolds = segs.filter((s) => s.b).map((s) => s.b);
    expect(bolds.some((b) => /Sol en Acuario/.test(b!))).toBe(true);
    expect(bolds.some((b) => /Luna en Escorpio/.test(b!))).toBe(true);
    expect(bolds.some((b) => /Ascendente Piscis/.test(b!))).toBe(true);
    const full = segs.map((s) => s.b ?? s.t).join("");
    expect(full.length).toBeGreaterThan(120); // párrafo real, no esqueleto
    expect(full).toMatch(/exilio/); // dignidad integrada en minúscula
  });

  it("EN: teje sol, luna y ascendente en un párrafo con negritas", () => {
    const segs = composeEn({
      sun: { sign: "aquarius", house: 11, dignity: "exile" },
      moon: { sign: "scorpio", house: 8 },
      ascSign: "pisces",
    });
    const bolds = segs.filter((s) => s.b).map((s) => s.b);
    expect(bolds.some((b) => /Sun in Aquarius/.test(b!))).toBe(true);
    expect(bolds.some((b) => /Moon in Scorpio/.test(b!))).toBe(true);
    expect(bolds.some((b) => /Ascendant Pisces/.test(b!))).toBe(true);
    const full = segs.map((s) => s.b ?? s.t).join("");
    expect(full.length).toBeGreaterThan(120);
    expect(full).toMatch(/detriment/i);
  });

  it("cada combinación signo×cuerpo tiene fragmento (12×3, ES y EN)", () => {
    for (const sign of ZODIAC_SIGNS) {
      for (const M of [
        { sun: SUN_ES, moon: MOON_ES, asc: ASC_ES },
        { sun: SUN_EN, moon: MOON_EN, asc: ASC_EN },
      ]) {
        expect(M.sun[sign.key], `sun:${sign.key}`).toBeTruthy();
        expect(M.moon[sign.key], `moon:${sign.key}`).toBeTruthy();
        expect(M.asc[sign.key], `asc:${sign.key}`).toBeTruthy();
      }
    }
  });

  it("sin dignidad no menciona la casa con coma sobrante", () => {
    const segs = composeEs({
      sun: { sign: "leo", house: 5 },
      moon: { sign: "cancer", house: 4 },
      ascSign: "libra",
    });
    const full = segs.map((s) => s.b ?? s.t).join("");
    expect(full).not.toMatch(/,,/);
  });
});
