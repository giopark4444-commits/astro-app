import { describe, it, expect } from "vitest";
import { digitsSum, reduce, reduceWithTrace } from "../reduction";

describe("digitsSum", () => {
  it("suma los dígitos de un número", () => {
    expect(digitsSum(1984)).toBe(22);
    expect(digitsSum(29)).toBe(11);
  });
});

describe("reduce", () => {
  it("reduce a un solo dígito cuando no se preservan maestros", () => {
    expect(reduce(1984, { preserveMasters: false })).toBe(4); // 1984->22->4
    expect(reduce(29, { preserveMasters: false })).toBe(2); // 29->11->2
  });
  it("preserva números maestros 11/22/33 por defecto", () => {
    expect(reduce(29)).toBe(11); // 29->11 (maestro, no sigue)
    expect(reduce(1984)).toBe(22); // 1984->22 (maestro)
    expect(reduce(48)).toBe(3); // 48->12->3 (sin maestro)
  });
});

describe("reduceWithTrace", () => {
  it("registra cada paso y marca maestro", () => {
    const t = reduceWithTrace(29);
    expect(t.steps).toEqual([29, 11]);
    expect(t.value).toBe(11);
    expect(t.isMaster).toBe(true);
  });
  it("detecta deuda kármica cuando aparece 13/14/16/19 en el camino", () => {
    const t = reduceWithTrace(13, { preserveMasters: false });
    expect(t.karmicDebt).toBe(13);
    expect(t.value).toBe(4);
  });
});
