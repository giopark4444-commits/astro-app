import { describe, it, expect } from "vitest";
import { inclusionTable, karmicLessons, hiddenPassion } from "../karmic";

describe("inclusionTable", () => {
  it("cuenta cuántas veces aparece cada dígito 1-9 en el nombre", () => {
    // JOHN: J1 O6 H8 N5 -> {1:1,5:1,6:1,8:1}
    const inc = inclusionTable("JOHN");
    expect(inc[1]).toBe(1);
    expect(inc[5]).toBe(1);
    expect(inc[2]).toBe(0);
  });
});

describe("karmicLessons", () => {
  it("son los dígitos ausentes (cuenta 0)", () => {
    const lessons = karmicLessons("JOHN");
    expect(lessons).toContain(2);
    expect(lessons).toContain(3);
    expect(lessons).not.toContain(1);
  });
});

describe("hiddenPassion", () => {
  it("es el/los dígitos más frecuentes", () => {
    // ANNA: A1 N5 N5 A1 -> 1:2, 5:2 -> [1,5]
    expect(hiddenPassion("ANNA").sort()).toEqual([1, 5]);
  });
});
