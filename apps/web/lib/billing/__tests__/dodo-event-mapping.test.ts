import { describe, it, expect } from "vitest";
import { mapDodoEventToRow, planFromProductId, type DodoEvent } from "../dodo-event-mapping";

const MONTHLY_ID = "pdt_monthly_123";
const YEARLY_ID = "pdt_yearly_456";
const PRODUCT_IDS = { monthlyProductId: MONTHLY_ID, yearlyProductId: YEARLY_ID };

// `Partial<DodoEvent["data"]>` no basta con `exactOptionalPropertyTypes: true`:
// necesitamos poder pasar explícitamente `campo: undefined` en los tests que
// prueban la AUSENCIA de un campo (no solo omitirlo).
type DodoEventDataOverrides = { [K in keyof DodoEvent["data"]]?: DodoEvent["data"][K] | undefined };

function baseEvent(type: string, overrides: DodoEventDataOverrides = {}): DodoEvent {
  return {
    type,
    data: {
      subscription_id: "sub_1",
      customer_id: "cus_1",
      product_id: MONTHLY_ID,
      next_billing_date: "2026-08-01T00:00:00Z",
      customer: { customer_id: "cus_1", email: "gio@example.com" },
      ...overrides,
      // El merge con `overrides` (que admite `undefined` explícito por
      // `exactOptionalPropertyTypes`) hace que TS infiera campos
      // `string | undefined`; el cast confirma la forma real en runtime.
    } as DodoEvent["data"],
  };
}

describe("mapDodoEventToRow", () => {
  it("subscription.active mapea a status active", () => {
    const row = mapDodoEventToRow(baseEvent("subscription.active"), PRODUCT_IDS, null);
    expect(row).toEqual({
      dodo_customer_id: "cus_1",
      dodo_subscription_id: "sub_1",
      plan: "monthly",
      status: "active",
      current_period_end: "2026-08-01T00:00:00Z",
    });
  });

  it("subscription.renewed mapea a status active", () => {
    const row = mapDodoEventToRow(baseEvent("subscription.renewed"), PRODUCT_IDS, null);
    expect(row?.status).toBe("active");
  });

  it("subscription.on_hold mapea a status past_due", () => {
    const row = mapDodoEventToRow(baseEvent("subscription.on_hold"), PRODUCT_IDS, null);
    expect(row?.status).toBe("past_due");
  });

  it("subscription.cancelled mapea a status cancelled", () => {
    const row = mapDodoEventToRow(baseEvent("subscription.cancelled"), PRODUCT_IDS, null);
    expect(row?.status).toBe("cancelled");
  });

  it("subscription.expired mapea a status cancelled", () => {
    const row = mapDodoEventToRow(baseEvent("subscription.expired"), PRODUCT_IDS, null);
    expect(row?.status).toBe("cancelled");
  });

  it("un tipo de evento no mapeado devuelve null", () => {
    const row = mapDodoEventToRow(baseEvent("subscription.updated"), PRODUCT_IDS, null);
    expect(row).toBeNull();
  });

  it("sin data.subscription_id devuelve null aunque haya customer completo", () => {
    const event = baseEvent("subscription.active", { subscription_id: undefined });
    expect(mapDodoEventToRow(event, PRODUCT_IDS, null)).toBeNull();
  });

  it("sin data.customer, usa el fallback data.customer_id", () => {
    const event = baseEvent("subscription.active", { customer: undefined, customer_id: "cus_fallback" });
    const row = mapDodoEventToRow(event, PRODUCT_IDS, null);
    expect(row?.dodo_customer_id).toBe("cus_fallback");
  });

  it("product_id coincide con monthlyProductId -> plan monthly", () => {
    const event = baseEvent("subscription.active", { product_id: MONTHLY_ID });
    const row = mapDodoEventToRow(event, PRODUCT_IDS, null);
    expect(row?.plan).toBe("monthly");
  });

  it("product_id coincide con yearlyProductId -> plan yearly", () => {
    const event = baseEvent("subscription.active", { product_id: YEARLY_ID });
    const row = mapDodoEventToRow(event, PRODUCT_IDS, null);
    expect(row?.plan).toBe("yearly");
  });

  it("product_id ausente con existingPlan yearly preserva yearly (no cae a monthly)", () => {
    const event = baseEvent("subscription.active", { product_id: undefined });
    const row = mapDodoEventToRow(event, PRODUCT_IDS, "yearly");
    expect(row?.plan).toBe("yearly");
  });

  it("product_id ausente con existingPlan null cae a monthly", () => {
    const event = baseEvent("subscription.active", { product_id: undefined });
    const row = mapDodoEventToRow(event, PRODUCT_IDS, null);
    expect(row?.plan).toBe("monthly");
  });

  it("product_id desconocido (no coincide con ningún id) con existingPlan yearly preserva yearly", () => {
    const event = baseEvent("subscription.active", { product_id: "pdt_no_reconocido" });
    const row = mapDodoEventToRow(event, PRODUCT_IDS, "yearly");
    expect(row?.plan).toBe("yearly");
  });
});

describe("planFromProductId", () => {
  it("undefined -> null", () => {
    expect(planFromProductId(undefined, MONTHLY_ID, YEARLY_ID)).toBeNull();
  });
  it("coincide con monthlyProductId -> monthly", () => {
    expect(planFromProductId(MONTHLY_ID, MONTHLY_ID, YEARLY_ID)).toBe("monthly");
  });
  it("coincide con yearlyProductId -> yearly", () => {
    expect(planFromProductId(YEARLY_ID, MONTHLY_ID, YEARLY_ID)).toBe("yearly");
  });
  it("no coincide con ninguno -> null", () => {
    expect(planFromProductId("pdt_otro", MONTHLY_ID, YEARLY_ID)).toBeNull();
  });
});
