import { describe, it, expect, beforeEach } from "vitest";
import { handleReferralPayment, handleReferralRefund } from "../referral-webhook";
import type { DodoEvent } from "../dodo-event-mapping";

// Fake mínimo (mismo espíritu que admin/__tests__/actions.test.ts): rastrea
// las llamadas a upsert/update sin tocar red, y permite simular tanto la
// migración 0016 sin aplicar (tabla inexistente -> error o throw) como el
// camino feliz.
const state: {
  referredUser: { code: string } | null;
  referredUserError: { message: string } | null;
  referralCode: { commission_pct: number; active: boolean } | null;
  referralCodeError: { message: string } | null;
  upsertCalls: Array<{ v: Record<string, unknown>; opts: Record<string, unknown> }>;
  upsertError: { message: string } | null;
  updateCalls: Array<{ v: Record<string, unknown>; eqCol: string; eqVal: string }>;
  updateError: { message: string } | null;
  throwOnFrom: string | null;
} = {
  referredUser: null,
  referredUserError: null,
  referralCode: null,
  referralCodeError: null,
  upsertCalls: [],
  upsertError: null,
  updateCalls: [],
  updateError: null,
  throwOnFrom: null,
};

function resetState() {
  state.referredUser = null;
  state.referredUserError = null;
  state.referralCode = null;
  state.referralCodeError = null;
  state.upsertCalls = [];
  state.upsertError = null;
  state.updateCalls = [];
  state.updateError = null;
  state.throwOnFrom = null;
}

function fakeSupabase() {
  return {
    from(table: string) {
      if (state.throwOnFrom === table) {
        throw new Error(`relation "public.${table}" does not exist`);
      }
      if (table === "referred_users") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: state.referredUser, error: state.referredUserError }),
            }),
          }),
        };
      }
      if (table === "referral_codes") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: state.referralCode, error: state.referralCodeError }),
            }),
          }),
        };
      }
      if (table === "referral_earnings") {
        return {
          upsert: async (v: Record<string, unknown>, opts: Record<string, unknown>) => {
            state.upsertCalls.push({ v, opts });
            return { error: state.upsertError };
          },
          update: (v: Record<string, unknown>) => ({
            eq: async (col: string, val: string) => {
              state.updateCalls.push({ v, eqCol: col, eqVal: val });
              return { error: state.updateError };
            },
          }),
        };
      }
      throw new Error(`tabla inesperada en el fake: ${table}`);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

// `Partial<DodoEvent["data"]>` no basta con `exactOptionalPropertyTypes: true`
// (mismo problema que dodo-event-mapping.test.ts): hace falta poder pasar
// `campo: undefined` explícito en los tests que prueban su AUSENCIA.
type DodoEventDataOverrides = { [K in keyof DodoEvent["data"]]?: DodoEvent["data"][K] | undefined };

function paymentEvent(overrides: DodoEventDataOverrides = {}): DodoEvent {
  return {
    type: "payment.succeeded",
    data: {
      payment_id: "pay_1",
      total_amount: 1000,
      currency: "USD",
      customer: { customer_id: "cus_1", email: "gio@example.com" },
      ...overrides,
    } as DodoEvent["data"],
  };
}

function refundEvent(overrides: DodoEventDataOverrides = {}): DodoEvent {
  return { type: "refund.succeeded", data: { payment_id: "pay_1", ...overrides } as DodoEvent["data"] };
}

describe("handleReferralPayment", () => {
  beforeEach(resetState);

  it("sin payment_id: no llama upsert", async () => {
    const supabase = fakeSupabase();
    await handleReferralPayment(supabase, paymentEvent({ payment_id: undefined }), "user_1");
    expect(state.upsertCalls).toHaveLength(0);
  });

  it("sin total_amount: no llama upsert", async () => {
    const supabase = fakeSupabase();
    await handleReferralPayment(supabase, paymentEvent({ total_amount: undefined }), "user_1");
    expect(state.upsertCalls).toHaveLength(0);
  });

  it("usuario no referido: no llama upsert", async () => {
    state.referredUser = null;
    const supabase = fakeSupabase();
    await handleReferralPayment(supabase, paymentEvent(), "user_1");
    expect(state.upsertCalls).toHaveLength(0);
  });

  it("código del referido inactivo: no llama upsert", async () => {
    state.referredUser = { code: "GIO1234" };
    state.referralCode = { commission_pct: 30, active: false };
    const supabase = fakeSupabase();
    await handleReferralPayment(supabase, paymentEvent(), "user_1");
    expect(state.upsertCalls).toHaveLength(0);
  });

  it("referido activo: inserta la ganancia con commission_cents = floor(amount * pct / 100)", async () => {
    state.referredUser = { code: "GIO1234" };
    state.referralCode = { commission_pct: 30, active: true };
    const supabase = fakeSupabase();
    await handleReferralPayment(supabase, paymentEvent({ total_amount: 999 }), "user_1");
    expect(state.upsertCalls).toHaveLength(1);
    expect(state.upsertCalls[0]!.v).toEqual({
      code: "GIO1234",
      referred_user_id: "user_1",
      payment_ref: "pay_1",
      amount_cents: 999,
      commission_cents: 299, // floor(999*30/100) = 299.7 -> 299
      currency: "USD",
    });
    // idempotencia del webhook: ON CONFLICT (payment_ref) DO NOTHING.
    expect(state.upsertCalls[0]!.opts).toEqual({ onConflict: "payment_ref", ignoreDuplicates: true });
  });

  it("sin currency en el evento, usa USD por default", async () => {
    state.referredUser = { code: "GIO1234" };
    state.referralCode = { commission_pct: 30, active: true };
    const supabase = fakeSupabase();
    await handleReferralPayment(supabase, paymentEvent({ currency: undefined }), "user_1");
    expect((state.upsertCalls[0]!.v as { currency: string }).currency).toBe("USD");
  });

  it("nunca lanza si la migración 0016 no está aplicada (tabla inexistente)", async () => {
    state.throwOnFrom = "referred_users";
    const supabase = fakeSupabase();
    await expect(handleReferralPayment(supabase, paymentEvent(), "user_1")).resolves.toBeUndefined();
    expect(state.upsertCalls).toHaveLength(0);
  });

  it("nunca lanza si el insert final falla", async () => {
    state.referredUser = { code: "GIO1234" };
    state.referralCode = { commission_pct: 30, active: true };
    state.upsertError = { message: "boom" };
    const supabase = fakeSupabase();
    await expect(handleReferralPayment(supabase, paymentEvent(), "user_1")).resolves.toBeUndefined();
  });
});

describe("handleReferralRefund", () => {
  beforeEach(resetState);

  it("sin payment_id: no llama update", async () => {
    const supabase = fakeSupabase();
    await handleReferralRefund(supabase, refundEvent({ payment_id: undefined }));
    expect(state.updateCalls).toHaveLength(0);
  });

  it("marca la fila de ese payment_ref como reversed", async () => {
    const supabase = fakeSupabase();
    await handleReferralRefund(supabase, refundEvent());
    expect(state.updateCalls).toEqual([{ v: { status: "reversed" }, eqCol: "payment_ref", eqVal: "pay_1" }]);
  });

  it("nunca lanza si la migración 0016 no está aplicada (tabla inexistente)", async () => {
    state.throwOnFrom = "referral_earnings";
    const supabase = fakeSupabase();
    await expect(handleReferralRefund(supabase, refundEvent())).resolves.toBeUndefined();
  });

  it("nunca lanza si el update falla", async () => {
    state.updateError = { message: "boom" };
    const supabase = fakeSupabase();
    await expect(handleReferralRefund(supabase, refundEvent())).resolves.toBeUndefined();
  });
});
