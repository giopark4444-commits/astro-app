// packages/core/src/tarot/__tests__/spreads.test.ts
import { describe, it, expect } from "vitest";
import { TAROT_SPREADS, spreadById, spreadsByGroup } from "../spreads";

describe("TAROT_SPREADS", () => {
  it("cada tirada: cardCount coherente, keys únicas, layout en [0,1]", () => {
    expect(TAROT_SPREADS.length).toBeGreaterThanOrEqual(11);
    for (const s of TAROT_SPREADS) {
      expect(s.positions).toHaveLength(s.cardCount);
      const keys = s.positions.map((p) => p.key);
      expect(new Set(keys).size).toBe(keys.length); // sin duplicados
      for (const p of s.positions) {
        expect(p.layout.x).toBeGreaterThanOrEqual(0);
        expect(p.layout.x).toBeLessThanOrEqual(1);
        expect(p.layout.y).toBeGreaterThanOrEqual(0);
        expect(p.layout.y).toBeLessThanOrEqual(1);
      }
    }
  });

  it("ids únicos", () => {
    const ids = TAROT_SPREADS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("celtic-cross: las 10 posiciones canónicas en orden (crossing rotada 90°)", () => {
    const celtic = spreadById("celtic-cross")!;
    expect(celtic.positions.map((p) => p.key)).toEqual([
      "heart",
      "crossing",
      "foundation",
      "past",
      "crown",
      "future",
      "self",
      "environment",
      "hopes-fears",
      "outcome",
    ]);
    expect(celtic.positions.find((p) => p.key === "crossing")!.layout.rotate).toBe(90);
  });

  it("daily / yes-no: una sola posición", () => {
    expect(spreadById("daily")!.positions.map((p) => p.key)).toEqual(["day"]);
    expect(spreadById("yes-no")!.positions.map((p) => p.key)).toEqual(["answer"]);
  });

  it("three: past/present/future en orden", () => {
    expect(spreadById("three")!.positions.map((p) => p.key)).toEqual(["past", "present", "future"]);
  });

  it("year-wheel: 12 meses + tema (13)", () => {
    const wheel = spreadById("year-wheel")!;
    expect(wheel.cardCount).toBe(13);
    expect(wheel.positions.filter((p) => p.role === "month")).toHaveLength(12);
    expect(wheel.positions.at(-1)!.key).toBe("theme");
  });

  it("grupos: las 4 destacadas + básicas en primary; el resto en secondary", () => {
    const primary = spreadsByGroup("primary").map((s) => s.id);
    const secondary = spreadsByGroup("secondary").map((s) => s.id);
    expect(primary).toEqual(
      expect.arrayContaining(["celtic-cross", "relationship", "year-wheel", "decision"]),
    );
    expect(secondary).toEqual(
      expect.arrayContaining(["horseshoe", "simple-cross", "chakras", "elements", "yes-no"]),
    );
    // cobertura total: cada tirada cae en un grupo
    expect(primary.length + secondary.length).toBe(TAROT_SPREADS.length);
  });

  it("spreadById devuelve undefined para id desconocido", () => {
    // @ts-expect-error id inválido a propósito
    expect(spreadById("unknown")).toBeUndefined();
  });
});
