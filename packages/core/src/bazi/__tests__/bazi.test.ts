// packages/core/src/bazi/__tests__/bazi.test.ts
import { describe, it, expect } from "vitest";
import {
  computeBaZi,
  yearPillar,
  monthPillar,
  dayPillar,
  hourPillar,
  gregorianToJDN,
  HEAVENLY_STEMS,
  EARTHLY_BRANCHES,
} from "../bazi";

describe("Ba Zi / Saju — pilares sexagenarios", () => {
  it("JDN gregoriano (referencia astronómica: 2000-01-01 = 2451545)", () => {
    expect(gregorianToJDN(2000, 1, 1)).toBe(2451545);
  });

  it("pilar de AÑO: 1984 = 甲子 (Rata de Madera, inicio del ciclo de 60)", () => {
    expect(yearPillar(1984)).toEqual({ stem: 0, branch: 0 });
    expect(HEAVENLY_STEMS[0]!.hanzi).toBe("甲");
    expect(EARTHLY_BRANCHES[0]!.hanzi).toBe("子");
  });

  it("pilar de AÑO: ciclo de 60 (1984≡2044; 1985 = 乙丑)", () => {
    expect(yearPillar(2044)).toEqual(yearPillar(1984));
    expect(yearPillar(1985)).toEqual({ stem: 1, branch: 1 });
  });

  it("pilar de DÍA: referencia documentada 2000-01-07 = 甲子 (valida el ancla)", () => {
    expect(dayPillar(2000, 1, 7)).toEqual({ stem: 0, branch: 0 });
  });

  it("pilar de DÍA: días consecutivos avanzan el ciclo (+1 tronco, +1 rama)", () => {
    const a = dayPillar(1990, 6, 15);
    const b = dayPillar(1990, 6, 16);
    expect(b.stem).toBe((a.stem + 1) % 10);
    expect(b.branch).toBe((a.branch + 1) % 12);
  });

  it("rama de MES por término solar: Lichun 315° = 寅 (rama 2); 345° = 卯; 0° cae en 卯", () => {
    expect(monthPillar(0, 315).branch).toBe(2);
    expect(monthPillar(0, 345).branch).toBe(3);
    expect(monthPillar(0, 0).branch).toBe(3);
  });

  it("tronco de MES por Cinco Tigres (五虎遁): año 甲→丙寅, 乙→戊寅, 戊→甲寅", () => {
    expect(monthPillar(0, 315)).toEqual({ stem: 2, branch: 2 });
    expect(monthPillar(1, 315).stem).toBe(4);
    expect(monthPillar(4, 315).stem).toBe(0);
  });

  it("rama de HORA: 子 cubre 23–01 (23 y 0 → 子; 1 → 丑; 12 → 午)", () => {
    expect(hourPillar(0, 23).branch).toBe(0);
    expect(hourPillar(0, 0).branch).toBe(0);
    expect(hourPillar(0, 1).branch).toBe(1);
    expect(hourPillar(0, 12).branch).toBe(6);
  });

  it("tronco de HORA por Cinco Ratas (五鼠遁): día 甲→子=甲; día 乙→子=丙", () => {
    expect(hourPillar(0, 23)).toEqual({ stem: 0, branch: 0 });
    expect(hourPillar(1, 0).stem).toBe(2);
  });

  it("computeBaZi integra los cuatro pilares", () => {
    const r = computeBaZi({
      localYear: 2000,
      localMonth: 1,
      localDay: 7,
      hour: 0,
      solarYear: 1999,
      sunLongitude: 286,
    });
    expect(r.day).toEqual({ stem: 0, branch: 0 }); // referencia 甲子
    expect(r.year).toEqual(yearPillar(1999));
    expect(r.hour.branch).toBe(0); // medianoche → 子
  });
});
