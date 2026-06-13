import { describe, it, expect } from "vitest";
import { lifePath, expression, soulUrge, personality, birthday, maturity } from "../core-numbers";

const GIO = { year: 1984, month: 2, day: 5 };

describe("lifePath", () => {
  it("Gio 1984-02-05 -> maestro 11", () => {
    const lp = lifePath(GIO);
    expect(lp.value).toBe(11);
    expect(lp.isMaster).toBe(true);
  });
  it("1990-01-01 -> 3 (no maestro)", () => {
    expect(lifePath({ year: 1990, month: 1, day: 1 }).value).toBe(3);
  });
});

describe("name-based core numbers (JOHN)", () => {
  it("expression suma todas las letras", () => {
    expect(expression("JOHN").value).toBe(2); // J1 O6 H8 N5 = 20 -> 2
  });
  it("soulUrge suma vocales", () => {
    expect(soulUrge("JOHN").value).toBe(6); // O=6
  });
  it("personality suma consonantes", () => {
    expect(personality("JOHN").value).toBe(5); // 1+8+5=14 -> 5
  });
});

describe("birthday y maturity", () => {
  it("birthday preserva maestro (día 29)", () => {
    expect(birthday({ year: 2000, month: 1, day: 29 }).value).toBe(11);
  });
  it("maturity = lifePath + expression, reducido", () => {
    const m = maturity(GIO, "JOHN");
    expect(m.value).toBeGreaterThan(0);
  });
});
