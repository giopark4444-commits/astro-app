// packages/core/src/tarot/__tests__/spreads.test.ts
import { describe, it, expect } from "vitest";
import { TAROT_SPREADS, spreadById } from "../spreads";

describe("TAROT_SPREADS", () => {
  it("3 spreads con cardCount coherente con sus posiciones", () => {
    expect(TAROT_SPREADS).toHaveLength(3);
    for (const s of TAROT_SPREADS) expect(s.positions).toHaveLength(s.cardCount);
  });

  it("celtic-cross: las 10 posiciones canónicas en orden", () => {
    expect(spreadById("celtic-cross")!.positions.map((p) => p.key)).toEqual([
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
  });

  it("daily: una sola posición 'day'", () => {
    expect(spreadById("daily")!.positions).toEqual([{ key: "day", role: "message" }]);
  });

  it("three: past/present/future en orden", () => {
    expect(spreadById("three")!.positions.map((p) => p.key)).toEqual([
      "past",
      "present",
      "future",
    ]);
  });

  it("spreadById devuelve undefined para id desconocido", () => {
    // @ts-expect-error id inválido a propósito
    expect(spreadById("unknown")).toBeUndefined();
  });
});
