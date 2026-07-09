// packages/core/src/billing/__tests__/subscription.test.ts
import { describe, it, expect } from "vitest";
import { isPlusActive } from "../subscription";

describe("isPlusActive", () => {
  it("false si no hay fila (nunca se suscribió)", () => {
    expect(isPlusActive(null)).toBe(false);
  });
  it("false si status es past_due o cancelled", () => {
    expect(isPlusActive({ status: "past_due", currentPeriodEnd: null })).toBe(false);
    expect(isPlusActive({ status: "cancelled", currentPeriodEnd: null })).toBe(false);
  });
  it("true con status active/trialing y sin fecha de fin (aún no llegó el primer webhook completo)", () => {
    expect(isPlusActive({ status: "active", currentPeriodEnd: null })).toBe(true);
    expect(isPlusActive({ status: "trialing", currentPeriodEnd: null })).toBe(true);
  });
  it("true si currentPeriodEnd es futuro respecto a `now`", () => {
    const now = new Date("2026-07-09T00:00:00Z");
    expect(isPlusActive({ status: "active", currentPeriodEnd: "2026-08-01T00:00:00Z" }, now)).toBe(true);
  });
  it("false si currentPeriodEnd ya pasó respecto a `now` (aunque el status no se haya actualizado aún)", () => {
    const now = new Date("2026-07-09T00:00:00Z");
    expect(isPlusActive({ status: "active", currentPeriodEnd: "2026-07-01T00:00:00Z" }, now)).toBe(false);
  });
});
