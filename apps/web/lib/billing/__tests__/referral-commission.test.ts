import { describe, it, expect } from "vitest";
import { commissionCentsFor, referralActionForEventType } from "../referral-commission";

describe("commissionCentsFor", () => {
  it("30% de 1000 centavos = 300", () => {
    expect(commissionCentsFor(1000, 30)).toBe(300);
  });

  it("floor() SIEMPRE — nunca redondea hacia arriba (regla dura del brief)", () => {
    // 999 * 30 / 100 = 299.7 -> 299, no 300.
    expect(commissionCentsFor(999, 30)).toBe(299);
  });

  it("0% de comisión = 0", () => {
    expect(commissionCentsFor(1000, 0)).toBe(0);
  });

  it("100% de comisión = el monto completo", () => {
    expect(commissionCentsFor(1234, 100)).toBe(1234);
  });

  it("0 centavos = 0 comisión sin importar el %", () => {
    expect(commissionCentsFor(0, 30)).toBe(0);
  });

  it("nunca devuelve un decimal (siempre entero)", () => {
    const result = commissionCentsFor(1, 33);
    expect(Number.isInteger(result)).toBe(true);
  });
});

describe("referralActionForEventType", () => {
  it("payment.succeeded -> earn", () => {
    expect(referralActionForEventType("payment.succeeded")).toBe("earn");
  });

  it("refund.succeeded -> reverse", () => {
    expect(referralActionForEventType("refund.succeeded")).toBe("reverse");
  });

  it("eventos de suscripción no tocan el ledger de referidos", () => {
    expect(referralActionForEventType("subscription.active")).toBeNull();
    expect(referralActionForEventType("subscription.cancelled")).toBeNull();
  });

  it("un tipo desconocido -> null", () => {
    expect(referralActionForEventType("algo.raro")).toBeNull();
  });
});
