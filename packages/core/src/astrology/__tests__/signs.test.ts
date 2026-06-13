import { describe, it, expect } from "vitest";
import { normalizeAngle, signOfLongitude, angularSeparation } from "../signs";
import { houseOfLongitude } from "../houses";

describe("normalizeAngle", () => {
  it("envuelve a 0-360", () => {
    expect(normalizeAngle(370)).toBe(10);
    expect(normalizeAngle(-10)).toBe(350);
  });
});

describe("signOfLongitude", () => {
  it("Sol de Gio 315.96 -> Acuario 15°", () => {
    const p = signOfLongitude(315.96);
    expect(p.sign).toBe("aquarius");
    expect(p.degree).toBe(15);
    expect(p.signDegree).toBeCloseTo(15.96, 1);
  });
  it("0° -> Aries 0°", () => {
    expect(signOfLongitude(0).sign).toBe("aries");
  });
});

describe("angularSeparation", () => {
  it("calcula la separación mínima 0-180", () => {
    expect(angularSeparation(10, 130)).toBe(120);
    expect(angularSeparation(350, 10)).toBe(20);
  });
});

describe("houseOfLongitude", () => {
  it("ubica una longitud en la casa correcta (cúspides simples cada 30°)", () => {
    const cusps = Array.from({ length: 12 }, (_, i) => i * 30); // casa1=0, casa2=30...
    expect(houseOfLongitude(15, cusps)).toBe(1);
    expect(houseOfLongitude(45, cusps)).toBe(2);
    expect(houseOfLongitude(355, cusps)).toBe(12);
  });
  it("maneja el envolvente cuando la casa cruza 0° Aries", () => {
    const cusps = [350, 20, 50, 80, 110, 140, 170, 200, 230, 260, 290, 320];
    expect(houseOfLongitude(355, cusps)).toBe(1); // 350..20 envuelve
    expect(houseOfLongitude(10, cusps)).toBe(1);
  });
});
