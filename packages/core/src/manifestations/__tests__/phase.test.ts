import { describe, it, expect } from "vitest";
import { manifestationPhase } from "../phase";

describe("manifestationPhase", () => {
  const seeded = "2026-07-01T00:00:00Z";
  const target = "2026-07-31T00:00:00Z";
  it("recién sembrada", () => {
    const r = manifestationPhase(seeded, target, "2026-07-01T06:00:00Z");
    expect(r.phase).toBe("sembrada");
    expect(r.progress).toBeCloseTo(0, 1);
  });
  it("a mitad de camino = creciendo", () => {
    const r = manifestationPhase(seeded, target, "2026-07-16T00:00:00Z");
    expect(r.phase).toBe("creciendo");
    expect(r.progress).toBeGreaterThan(0.4);
    expect(r.progress).toBeLessThan(0.6);
    expect(r.daysToTarget).toBe(15);
  });
  it("pasado el objetivo = cosechada", () => {
    const r = manifestationPhase(seeded, target, "2026-08-05T00:00:00Z");
    expect(r.phase).toBe("cosechada");
    expect(r.progress).toBe(1);
  });
});
