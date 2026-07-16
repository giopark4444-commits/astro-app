import { describe, it, expect } from "vitest";
import { sunSignFromDate } from "../sun-sign";

describe("sunSignFromDate", () => {
  it("signos de mitad de rango", () => {
    expect(sunSignFromDate("1990-02-05")?.key).toBe("aquarius");
    expect(sunSignFromDate("1990-08-08")?.key).toBe("leo");
    expect(sunSignFromDate("1990-12-30")?.key).toBe("capricorn"); // cruza el año
    expect(sunSignFromDate("1990-01-05")?.key).toBe("capricorn");
  });
  it("límites exactos e índice/glifo", () => {
    const a = sunSignFromDate("1990-03-21"); // arranque de aries
    expect(a).toMatchObject({ key: "aries", index: 0, glyph: "♈" });
    expect(sunSignFromDate("1990-03-20")?.key).toBe("pisces");
  });
  it("marca cúspide a ±1 día del límite", () => {
    expect(sunSignFromDate("1990-03-20")?.cusp).toBe(true);
    expect(sunSignFromDate("1990-03-21")?.cusp).toBe(true);
    expect(sunSignFromDate("1990-04-05")?.cusp).toBe(false);
  });
  it("null en fecha inválida", () => {
    expect(sunSignFromDate("")).toBeNull();
    expect(sunSignFromDate("1990-13-40")).toBeNull();
  });
});
