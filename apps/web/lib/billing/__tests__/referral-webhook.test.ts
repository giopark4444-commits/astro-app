import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleReferralPayment, handleReferralRefund } from "../referral-webhook";
import type { DodoEvent } from "../dodo-event-mapping";

// Fake mínimo (mismo espíritu que admin/__tests__/actions.test.ts): rastrea
// las llamadas a upsert/update sin tocar red, y permite simular tanto la
// migración 0016 sin aplicar (tabla inexistente -> error o throw) como
// errores reales (que ahora deben distinguirse — ver isMissingTableError en
// referral-webhook.ts) y el camino feliz.
const state: {
  referredUser: { code: string } | null;
  referredUserError: { message: string; code?: string } | null;
  referralCode: { commission_pct: number; active: boolean } | null;
  referralCodeError: { message: string; code?: string } | null;
  earningStatus: { status: string } | null;
  earningStatusError: { message: string; code?: string } | null;
  upsertCalls: Array<{ v: Record<string, unknown>; opts: Record<string, unknown> }>;
  upsertError: { message: string; code?: string } | null;
  updateCalls: Array<{ v: Record<string, unknown>; eqCol: string; eqVal: string }>;
  updateError: { message: string; code?: string } | null;
  throwOnFrom: string | null;
} = {
  referredUser: null,
  referredUserError: null,
  referralCode: null,
  referralCodeError: null,
  earningStatus: null,
  earningStatusError: null,
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
  state.earningStatus = null;
  state.earningStatusError = null;
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
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: state.earningStatus, error: state.earningStatusError }),
            }),
          }),
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
    const result = await handleReferralPayment(supabase, paymentEvent({ payment_id: undefined }), "user_1");
    expect(result).toEqual({ ok: true });
    expect(state.upsertCalls).toHaveLength(0);
  });

  it("usuario no referido: no llama upsert", async () => {
    state.referredUser = null;
    const supabase = fakeSupabase();
    const result = await handleReferralPayment(supabase, paymentEvent(), "user_1");
    expect(result).toEqual({ ok: true });
    expect(state.upsertCalls).toHaveLength(0);
  });

  it("código del referido inactivo: no llama upsert", async () => {
    state.referredUser = { code: "GIO1234" };
    state.referralCode = { commission_pct: 30, active: false };
    const supabase = fakeSupabase();
    const result = await handleReferralPayment(supabase, paymentEvent(), "user_1");
    expect(result).toEqual({ ok: true });
    expect(state.upsertCalls).toHaveLength(0);
  });

  it("referido activo, USD directo: inserta la ganancia con commission_cents = floor(amount * pct / 100)", async () => {
    state.referredUser = { code: "GIO1234" };
    state.referralCode = { commission_pct: 30, active: true };
    const supabase = fakeSupabase();
    const result = await handleReferralPayment(supabase, paymentEvent({ total_amount: 999 }), "user_1");
    expect(result).toEqual({ ok: true });
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

  // — FIX 2: base de la comisión (settlement_amount/settlement_currency, o
  // fallback a total_amount SOLO en USD confirmado) —

  it("con settlement_amount/settlement_currency: la comisión se basa en el settlement, NO en total_amount", async () => {
    state.referredUser = { code: "GIO1234" };
    state.referralCode = { commission_pct: 30, active: true };
    const supabase = fakeSupabase();
    const result = await handleReferralPayment(
      supabase,
      paymentEvent({ total_amount: 1000, currency: "EUR", settlement_amount: 900, settlement_currency: "USD" }),
      "user_1",
    );
    expect(result).toEqual({ ok: true });
    expect(state.upsertCalls[0]!.v).toMatchObject({ amount_cents: 900, currency: "USD", commission_cents: 270 });
  });

  it("floor() sobre centavos impares del settlement_amount", async () => {
    state.referredUser = { code: "GIO1234" };
    state.referralCode = { commission_pct: 30, active: true };
    const supabase = fakeSupabase();
    await handleReferralPayment(
      supabase,
      paymentEvent({ total_amount: undefined, currency: undefined, settlement_amount: 999, settlement_currency: "USD" }),
      "user_1",
    );
    expect((state.upsertCalls[0]!.v as { commission_cents: number }).commission_cents).toBe(299); // floor(999*30/100)=299.7->299
  });

  it("sin settlement, total_amount + currency USD confirmado: fallback a total_amount", async () => {
    state.referredUser = { code: "GIO1234" };
    state.referralCode = { commission_pct: 30, active: true };
    const supabase = fakeSupabase();
    const result = await handleReferralPayment(supabase, paymentEvent({ total_amount: 1000, currency: "USD" }), "user_1");
    expect(result).toEqual({ ok: true });
    expect(state.upsertCalls[0]!.v).toMatchObject({ amount_cents: 1000, currency: "USD" });
  });

  it("sin settlement y currency distinta de USD: OMITE la comisión a propósito (sigue en 200, loguea el payment_id)", async () => {
    state.referredUser = { code: "GIO1234" };
    state.referralCode = { commission_pct: 30, active: true };
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const supabase = fakeSupabase();
    const result = await handleReferralPayment(supabase, paymentEvent({ total_amount: 1000, currency: "EUR" }), "user_1");
    expect(result).toEqual({ ok: true }); // omisión consciente, no un error de escritura
    expect(state.upsertCalls).toHaveLength(0);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("pay_1"));
    errorSpy.mockRestore();
  });

  it("sin settlement y sin total_amount/currency: tampoco cae a USD por default (mismo camino de omisión)", async () => {
    state.referredUser = { code: "GIO1234" };
    state.referralCode = { commission_pct: 30, active: true };
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const supabase = fakeSupabase();
    const result = await handleReferralPayment(supabase, paymentEvent({ total_amount: undefined, currency: undefined }), "user_1");
    expect(result).toEqual({ ok: true });
    expect(state.upsertCalls).toHaveLength(0);
    errorSpy.mockRestore();
  });

  // — FIX 3: distinguir tabla inexistente (200) de error real (500/retry) —

  it("nunca lanza si la migración 0016 no está aplicada (tabla inexistente al leer referred_users): ok:true", async () => {
    state.throwOnFrom = "referred_users";
    const supabase = fakeSupabase();
    const result = await handleReferralPayment(supabase, paymentEvent(), "user_1");
    expect(result).toEqual({ ok: true });
    expect(state.upsertCalls).toHaveLength(0);
  });

  it("insert con tabla inexistente (error PostgREST, no throw): ok:true — sigue en 200", async () => {
    state.referredUser = { code: "GIO1234" };
    state.referralCode = { commission_pct: 30, active: true };
    state.upsertError = { message: 'relation "public.referral_earnings" does not exist', code: "42P01" };
    const supabase = fakeSupabase();
    const result = await handleReferralPayment(supabase, paymentEvent(), "user_1");
    expect(result).toEqual({ ok: true });
  });

  it("insert con error real (no tabla inexistente): ok:false — route.ts debe devolver 500 y Dodo reintenta", async () => {
    state.referredUser = { code: "GIO1234" };
    state.referralCode = { commission_pct: 30, active: true };
    state.upsertError = { message: "boom" };
    const supabase = fakeSupabase();
    const result = await handleReferralPayment(supabase, paymentEvent(), "user_1");
    expect(result).toEqual({ ok: false });
  });
});

describe("handleReferralRefund", () => {
  beforeEach(resetState);

  it("sin payment_id: no llama update", async () => {
    const supabase = fakeSupabase();
    const result = await handleReferralRefund(supabase, refundEvent({ payment_id: undefined }));
    expect(result).toEqual({ ok: true });
    expect(state.updateCalls).toHaveLength(0);
  });

  it("sin ganancia para ese payment_ref: no-op, no es error", async () => {
    state.earningStatus = null;
    const supabase = fakeSupabase();
    const result = await handleReferralRefund(supabase, refundEvent());
    expect(result).toEqual({ ok: true });
    expect(state.updateCalls).toHaveLength(0);
  });

  it("pending -> reversed: el reembolso llegó ANTES de pagarle al colaborador", async () => {
    state.earningStatus = { status: "pending" };
    const supabase = fakeSupabase();
    const result = await handleReferralRefund(supabase, refundEvent());
    expect(result).toEqual({ ok: true });
    expect(state.updateCalls).toEqual([{ v: { status: "reversed" }, eqCol: "payment_ref", eqVal: "pay_1" }]);
  });

  it("paid -> clawback: el reembolso llegó DESPUÉS de pagarle al colaborador (dinero ya entregado, se marca visible, nunca se borra)", async () => {
    state.earningStatus = { status: "paid" };
    const supabase = fakeSupabase();
    const result = await handleReferralRefund(supabase, refundEvent());
    expect(result).toEqual({ ok: true });
    expect(state.updateCalls).toEqual([{ v: { status: "clawback" }, eqCol: "payment_ref", eqVal: "pay_1" }]);
  });

  it("ya reversed: no-op, no reprocesa un reembolso ya aplicado", async () => {
    state.earningStatus = { status: "reversed" };
    const supabase = fakeSupabase();
    const result = await handleReferralRefund(supabase, refundEvent());
    expect(result).toEqual({ ok: true });
    expect(state.updateCalls).toHaveLength(0);
  });

  it("ya clawback: no-op, no reprocesa un reembolso ya aplicado", async () => {
    state.earningStatus = { status: "clawback" };
    const supabase = fakeSupabase();
    const result = await handleReferralRefund(supabase, refundEvent());
    expect(result).toEqual({ ok: true });
    expect(state.updateCalls).toHaveLength(0);
  });

  // — FIX 3: distinguir tabla inexistente (200) de error real (500/retry) —

  it("nunca lanza si la migración 0016 no está aplicada (tabla inexistente): ok:true", async () => {
    state.throwOnFrom = "referral_earnings";
    const supabase = fakeSupabase();
    const result = await handleReferralRefund(supabase, refundEvent());
    expect(result).toEqual({ ok: true });
  });

  it("lectura de status con tabla inexistente (error PostgREST, no throw): ok:true", async () => {
    state.earningStatusError = { message: 'relation "public.referral_earnings" does not exist', code: "42P01" };
    const supabase = fakeSupabase();
    const result = await handleReferralRefund(supabase, refundEvent());
    expect(result).toEqual({ ok: true });
    expect(state.updateCalls).toHaveLength(0);
  });

  it("lectura de status con error real (no tabla inexistente): ok:false — Dodo debe reintentar", async () => {
    state.earningStatusError = { message: "boom" };
    const supabase = fakeSupabase();
    const result = await handleReferralRefund(supabase, refundEvent());
    expect(result).toEqual({ ok: false });
    expect(state.updateCalls).toHaveLength(0);
  });

  it("update con tabla inexistente (error PostgREST, no throw): ok:true", async () => {
    state.earningStatus = { status: "pending" };
    state.updateError = { message: 'relation "public.referral_earnings" does not exist', code: "42P01" };
    const supabase = fakeSupabase();
    const result = await handleReferralRefund(supabase, refundEvent());
    expect(result).toEqual({ ok: true });
  });

  it("update con error real (no tabla inexistente): ok:false — Dodo debe reintentar", async () => {
    state.earningStatus = { status: "pending" };
    state.updateError = { message: "boom" };
    const supabase = fakeSupabase();
    const result = await handleReferralRefund(supabase, refundEvent());
    expect(result).toEqual({ ok: false });
  });
});
