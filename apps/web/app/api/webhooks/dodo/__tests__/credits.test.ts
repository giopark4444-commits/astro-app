import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { NextRequest } from "next/server";

// Mismo espíritu que ledger.test.ts / referral-webhook.test.ts: se mockea
// createServiceSupabaseClient (hoisted, ANTES del import de la ruta) para que
// el webhook reciba un doble en memoria en vez de tocar Supabase real. La
// firma se mockea `true` siempre — este archivo prueba la lógica de créditos
// (Task 7), no la verificación de Standard Webhooks (ya cubierta en
// dodo-webhook.test.ts). Los referidos también se mockean: probar que
// SIGUEN llamándose (regla de oro: no romper lo existente), no su lógica
// interna (ya cubierta en referral-webhook.test.ts).
const verifyDodoSignatureMock = vi.fn((...args: unknown[]) => {
  void args;
  return true;
});
vi.mock("@/lib/billing/dodo-webhook", () => ({
  verifyDodoSignature: (...args: unknown[]) => verifyDodoSignatureMock(...args),
}));

const handleReferralPaymentMock = vi.fn(async (...args: unknown[]) => {
  void args;
  return { ok: true };
});
const handleReferralRefundMock = vi.fn(async (...args: unknown[]) => {
  void args;
  return { ok: true };
});
vi.mock("@/lib/billing/referral-webhook", () => ({
  handleReferralPayment: (...args: unknown[]) => handleReferralPaymentMock(...args),
  handleReferralRefund: (...args: unknown[]) => handleReferralRefundMock(...args),
}));

type PgError = { message: string; code?: string } | null;

const state: {
  bySubscription: { user_id: string; plan: string } | null;
  bySubscriptionError: PgError;
  byUserId: { plan: string } | null;
  byUserIdError: PgError;
  upsertCalls: Array<{ v: Record<string, unknown>; opts: Record<string, unknown> }>;
  upsertError: PgError;
  userIdByEmail: string | null;
  userIdByEmailError: PgError;
  grantCreditsResult: boolean | null;
  grantCreditsError: PgError;
  rpcCalls: Array<{ fn: string; args: Record<string, unknown> }>;
} = {
  bySubscription: null,
  bySubscriptionError: null,
  byUserId: null,
  byUserIdError: null,
  upsertCalls: [],
  upsertError: null,
  userIdByEmail: null,
  userIdByEmailError: null,
  grantCreditsResult: true,
  grantCreditsError: null,
  rpcCalls: [],
};

function resetState() {
  state.bySubscription = null;
  state.bySubscriptionError = null;
  state.byUserId = null;
  state.byUserIdError = null;
  state.upsertCalls = [];
  state.upsertError = null;
  state.userIdByEmail = null;
  state.userIdByEmailError = null;
  state.grantCreditsResult = true;
  state.grantCreditsError = null;
  state.rpcCalls = [];
}

function fakeSupabase() {
  return {
    from(table: string) {
      if (table !== "subscriptions") throw new Error(`tabla inesperada en el fake: ${table}`);
      return {
        select: () => ({
          eq: (col: string) => ({
            maybeSingle: async () => {
              if (col === "dodo_subscription_id") return { data: state.bySubscription, error: state.bySubscriptionError };
              if (col === "user_id") return { data: state.byUserId, error: state.byUserIdError };
              throw new Error(`columna inesperada: ${col}`);
            },
          }),
        }),
        upsert: async (v: Record<string, unknown>, opts: Record<string, unknown>) => {
          state.upsertCalls.push({ v, opts });
          return { error: state.upsertError };
        },
      };
    },
    rpc: async (fn: string, args: Record<string, unknown>) => {
      state.rpcCalls.push({ fn, args });
      if (fn === "user_id_by_email") return { data: state.userIdByEmail, error: state.userIdByEmailError };
      if (fn === "grant_credits") return { data: state.grantCreditsResult, error: state.grantCreditsError };
      throw new Error(`rpc inesperado: ${fn}`);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const createServiceSupabaseClientMock = vi.fn((...args: unknown[]) => {
  void args;
  return fakeSupabase();
});
vi.mock("@aluna/supabase/server", () => ({
  createServiceSupabaseClient: (...args: unknown[]) => createServiceSupabaseClientMock(...args),
}));

import { POST } from "../route";

function fakeRequest(body: Record<string, unknown>): NextRequest {
  const rawBody = JSON.stringify(body);
  return {
    text: async () => rawBody,
    headers: { get: () => "dummy" },
  } as unknown as NextRequest;
}

const ENV_KEYS = [
  "DODO_PAYMENTS_WEBHOOK_SECRET",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DODO_PRODUCT_MONTHLY",
  "DODO_PRODUCT_YEARLY",
  "DODO_PRODUCT_CREDITS_100",
  "DODO_PRODUCT_CREDITS_300",
  "DODO_PRODUCT_CREDITS_1000",
  "ALUNA_PLUS_MONTHLY_CREDITS",
];

beforeEach(() => {
  vi.clearAllMocks();
  createServiceSupabaseClientMock.mockImplementation(() => fakeSupabase());
  resetState();
  for (const key of ENV_KEYS) delete process.env[key];
  process.env.DODO_PAYMENTS_WEBHOOK_SECRET = "whsec_test";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
  process.env.DODO_PRODUCT_MONTHLY = "pdt_monthly";
  process.env.DODO_PRODUCT_YEARLY = "pdt_yearly";
});

afterEach(() => {
  for (const key of ENV_KEYS) delete process.env[key];
});

function subscriptionEvent(type: string, overrides: Record<string, unknown> = {}) {
  return {
    type,
    data: {
      subscription_id: "sub_1",
      customer_id: "cus_1",
      product_id: "pdt_monthly",
      next_billing_date: "2026-08-01T00:00:00Z",
      customer: { customer_id: "cus_1", email: "gio@example.com" },
      ...overrides,
    },
  };
}

function paymentEvent(overrides: Record<string, unknown> = {}) {
  return {
    type: "payment.succeeded",
    data: {
      payment_id: "pay_1",
      total_amount: 1000,
      currency: "USD",
      customer: { customer_id: "cus_1", email: "gio@example.com" },
      ...overrides,
    },
  };
}

describe("webhook Dodo — refill mensual (subscription.active / subscription.renewed)", () => {
  it("subscription.active: tras el upsert exitoso, abona el refill con ref refill:<sub_id>:<period_end>", async () => {
    state.bySubscription = { user_id: "user_1", plan: "monthly" };
    const res = await POST(fakeRequest(subscriptionEvent("subscription.active")));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    expect(state.upsertCalls).toHaveLength(1);
    const grantCall = state.rpcCalls.find((c) => c.fn === "grant_credits");
    expect(grantCall).toBeDefined();
    expect(grantCall!.args).toEqual({
      p_user: "user_1",
      p_amount: 60,
      p_kind: "refill",
      p_ref: "refill:sub_1:2026-08-01T00:00:00Z",
    });
  });

  it("subscription.renewed: misma lógica de refill que subscription.active", async () => {
    state.bySubscription = { user_id: "user_1", plan: "monthly" };
    const res = await POST(fakeRequest(subscriptionEvent("subscription.renewed", { next_billing_date: "2026-09-01T00:00:00Z" })));
    expect(res.status).toBe(200);
    const grantCall = state.rpcCalls.find((c) => c.fn === "grant_credits");
    expect(grantCall!.args).toMatchObject({ p_ref: "refill:sub_1:2026-09-01T00:00:00Z", p_kind: "refill" });
  });

  it("sin next_billing_date en el evento: ref cae a 'first'", async () => {
    state.bySubscription = { user_id: "user_1", plan: "monthly" };
    const res = await POST(fakeRequest(subscriptionEvent("subscription.active", { next_billing_date: undefined })));
    expect(res.status).toBe(200);
    const grantCall = state.rpcCalls.find((c) => c.fn === "grant_credits");
    expect(grantCall!.args).toMatchObject({ p_ref: "refill:sub_1:first" });
  });

  it("respeta ALUNA_PLUS_MONTHLY_CREDITS del env (no hardcodea 60)", async () => {
    process.env.ALUNA_PLUS_MONTHLY_CREDITS = "120";
    state.bySubscription = { user_id: "user_1", plan: "monthly" };
    await POST(fakeRequest(subscriptionEvent("subscription.active")));
    const grantCall = state.rpcCalls.find((c) => c.fn === "grant_credits");
    expect(grantCall!.args).toMatchObject({ p_amount: 120 });
  });

  it("IDEMPOTENCIA: la 2ª entrega del MISMO evento (grant_credits devuelve false, ya abonado) sigue en 200 y no rompe nada", async () => {
    state.bySubscription = { user_id: "user_1", plan: "monthly" };
    state.grantCreditsResult = false; // el RPC ya vio este p_ref antes
    const res = await POST(fakeRequest(subscriptionEvent("subscription.active")));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
  });

  it("grant_credits devuelve error (falla real de red/rpc): 500 para que Dodo reintente — el cliente pagó y no puede quedarse sin el refill para siempre", async () => {
    state.bySubscription = { user_id: "user_1", plan: "monthly" };
    state.grantCreditsResult = null;
    state.grantCreditsError = { message: "boom" };
    const res = await POST(fakeRequest(subscriptionEvent("subscription.active")));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "credit_grant_failed" });
  });

  it("retry tras error: la 2ª entrega del mismo evento re-upsertea (onConflict user_id, inocuo) con el MISMO ref de grant, y si esta vez el grant sale bien -> 200", async () => {
    state.bySubscription = { user_id: "user_1", plan: "monthly" };
    state.grantCreditsResult = null;
    state.grantCreditsError = { message: "boom" };
    const res1 = await POST(fakeRequest(subscriptionEvent("subscription.active")));
    expect(res1.status).toBe(500);

    // Dodo reintenta el MISMO evento tras el 5xx.
    state.grantCreditsResult = true;
    state.grantCreditsError = null;
    const res2 = await POST(fakeRequest(subscriptionEvent("subscription.active")));
    expect(res2.status).toBe(200);

    expect(state.upsertCalls).toHaveLength(2); // el reintento re-hace el upsert, idéntico, onConflict user_id: inocuo
    const grantCalls = state.rpcCalls.filter((c) => c.fn === "grant_credits");
    expect(grantCalls).toHaveLength(2);
    // mismo ref en ambos intentos -> grant_credits real (UNIQUE por ref) jamás duplicaría el abono
    expect(grantCalls[0]!.args.p_ref).toBe(grantCalls[1]!.args.p_ref);
  });

  it("si el upsert de subscriptions falla: NO intenta el refill (grant_credits nunca se llama) y responde 500", async () => {
    state.bySubscription = { user_id: "user_1", plan: "monthly" };
    state.upsertError = { message: "boom" };
    const res = await POST(fakeRequest(subscriptionEvent("subscription.active")));
    expect(res.status).toBe(500);
    expect(state.rpcCalls.find((c) => c.fn === "grant_credits")).toBeUndefined();
  });

  it("eventos de suscripción que NO son active/renewed (p.ej. on_hold) no abonan refill", async () => {
    state.bySubscription = { user_id: "user_1", plan: "monthly" };
    const res = await POST(fakeRequest(subscriptionEvent("subscription.on_hold")));
    expect(res.status).toBe(200);
    expect(state.rpcCalls.find((c) => c.fn === "grant_credits")).toBeUndefined();
  });

  it("subscription.cancelled tampoco abona refill", async () => {
    state.bySubscription = { user_id: "user_1", plan: "monthly" };
    const res = await POST(fakeRequest(subscriptionEvent("subscription.cancelled")));
    expect(res.status).toBe(200);
    expect(state.rpcCalls.find((c) => c.fn === "grant_credits")).toBeUndefined();
  });

  it("resuelve el usuario por email (primer evento, sin fila previa) e igual abona el refill", async () => {
    state.bySubscription = null;
    state.userIdByEmail = "user_new";
    state.byUserId = null;
    const res = await POST(fakeRequest(subscriptionEvent("subscription.active")));
    expect(res.status).toBe(200);
    const grantCall = state.rpcCalls.find((c) => c.fn === "grant_credits");
    expect(grantCall!.args).toMatchObject({ p_user: "user_new" });
  });
});

describe("webhook Dodo — packs de créditos (payment.succeeded)", () => {
  it("product_cart con un product_id que matchea un pack: abona pack.credits con ref dodo:<payment_id>, kind purchase", async () => {
    process.env.DODO_PRODUCT_CREDITS_100 = "pdt_credits_100";
    state.userIdByEmail = "user_1";
    const res = await POST(
      fakeRequest(paymentEvent({ product_cart: [{ product_id: "pdt_credits_100", quantity: 1 }] })),
    );
    expect(res.status).toBe(200);
    const grantCall = state.rpcCalls.find((c) => c.fn === "grant_credits");
    expect(grantCall).toBeDefined();
    expect(grantCall!.args).toEqual({ p_user: "user_1", p_amount: 100, p_kind: "purchase", p_ref: "dodo:pay_1" });
  });

  it("payment.succeeded de una suscripción normal (sin product_cart de pack) NO abona créditos de pack", async () => {
    process.env.DODO_PRODUCT_CREDITS_100 = "pdt_credits_100";
    state.userIdByEmail = "user_1";
    const res = await POST(fakeRequest(paymentEvent({ subscription_id: "sub_1" }))); // pago de suscripción: sin product_cart
    expect(res.status).toBe(200);
    expect(state.rpcCalls.find((c) => c.fn === "grant_credits")).toBeUndefined();
  });

  it("product_cart con el product_id de un plan de suscripción (no un pack) tampoco abona créditos", async () => {
    state.userIdByEmail = "user_1";
    const res = await POST(
      fakeRequest(paymentEvent({ product_cart: [{ product_id: "pdt_monthly", quantity: 1 }] })),
    );
    expect(res.status).toBe(200);
    expect(state.rpcCalls.find((c) => c.fn === "grant_credits")).toBeUndefined();
  });

  it("más de un pack en el carrito: abona la SUMA de créditos en un solo grant con el mismo ref", async () => {
    process.env.DODO_PRODUCT_CREDITS_100 = "pdt_credits_100";
    process.env.DODO_PRODUCT_CREDITS_300 = "pdt_credits_300";
    state.userIdByEmail = "user_1";
    const res = await POST(
      fakeRequest(
        paymentEvent({
          product_cart: [
            { product_id: "pdt_credits_100", quantity: 1 },
            { product_id: "pdt_credits_300", quantity: 1 },
          ],
        }),
      ),
    );
    expect(res.status).toBe(200);
    const grantCalls = state.rpcCalls.filter((c) => c.fn === "grant_credits");
    expect(grantCalls).toHaveLength(1);
    expect(grantCalls[0]!.args).toEqual({ p_user: "user_1", p_amount: 400, p_kind: "purchase", p_ref: "dodo:pay_1" });
  });

  it("IDEMPOTENCIA: la 2ª entrega del MISMO payment.succeeded (grant_credits false, ya abonado) sigue en 200, no duplica", async () => {
    process.env.DODO_PRODUCT_CREDITS_100 = "pdt_credits_100";
    state.userIdByEmail = "user_1";
    state.grantCreditsResult = false;
    const res = await POST(
      fakeRequest(paymentEvent({ product_cart: [{ product_id: "pdt_credits_100", quantity: 1 }] })),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    expect(handleReferralPaymentMock).toHaveBeenCalledTimes(1); // "duplicate" no toca el flujo de referidos
  });

  it("grant_credits devuelve error (falla real, no 'ya abonado'): 500 para que Dodo reintente — el cliente pagó y no puede quedarse sin sus créditos para siempre", async () => {
    process.env.DODO_PRODUCT_CREDITS_100 = "pdt_credits_100";
    state.userIdByEmail = "user_1";
    state.grantCreditsResult = null;
    state.grantCreditsError = { message: "boom" };
    const res = await POST(
      fakeRequest(paymentEvent({ product_cart: [{ product_id: "pdt_credits_100", quantity: 1 }] })),
    );
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "credit_grant_failed" });
    expect(handleReferralPaymentMock).toHaveBeenCalledTimes(1); // referidos ya corrieron ANTES del intento de abono, el error de créditos no los deshace
  });

  it("retry tras error de pack: la 2ª entrega del mismo payment.succeeded reintenta con el MISMO ref y esta vez sale bien -> 200", async () => {
    process.env.DODO_PRODUCT_CREDITS_100 = "pdt_credits_100";
    state.userIdByEmail = "user_1";
    state.grantCreditsResult = null;
    state.grantCreditsError = { message: "boom" };
    const event = paymentEvent({ product_cart: [{ product_id: "pdt_credits_100", quantity: 1 }] });
    const res1 = await POST(fakeRequest(event));
    expect(res1.status).toBe(500);

    state.grantCreditsResult = true;
    state.grantCreditsError = null;
    const res2 = await POST(fakeRequest(event));
    expect(res2.status).toBe(200);

    const grantCalls = state.rpcCalls.filter((c) => c.fn === "grant_credits");
    expect(grantCalls).toHaveLength(2);
    expect(grantCalls[0]!.args.p_ref).toBe(grantCalls[1]!.args.p_ref);
    expect(handleReferralPaymentMock).toHaveBeenCalledTimes(2); // una vez por cada entrega del webhook
  });

  it("los referidos SIGUEN corriendo igual en payment.succeeded (no se reemplazan por los packs)", async () => {
    process.env.DODO_PRODUCT_CREDITS_100 = "pdt_credits_100";
    state.userIdByEmail = "user_1";
    await POST(fakeRequest(paymentEvent({ product_cart: [{ product_id: "pdt_credits_100", quantity: 1 }] })));
    expect(handleReferralPaymentMock).toHaveBeenCalledTimes(1);
    expect(handleReferralPaymentMock).toHaveBeenCalledWith(expect.anything(), expect.anything(), "user_1");
  });

  it("si handleReferralPayment falla de verdad (ok:false), el 500 de referidos gana y el pack NO llega a abonarse", async () => {
    process.env.DODO_PRODUCT_CREDITS_100 = "pdt_credits_100";
    state.userIdByEmail = "user_1";
    handleReferralPaymentMock.mockResolvedValueOnce({ ok: false });
    const res = await POST(
      fakeRequest(paymentEvent({ product_cart: [{ product_id: "pdt_credits_100", quantity: 1 }] })),
    );
    expect(res.status).toBe(500);
    expect(state.rpcCalls.find((c) => c.fn === "grant_credits")).toBeUndefined();
  });

  it("sin usuario resuelto (sin fila previa y sin email): ni referidos ni packs se procesan, sigue en 200", async () => {
    state.userIdByEmail = null;
    const res = await POST(
      fakeRequest(paymentEvent({ customer: undefined, product_cart: [{ product_id: "pdt_credits_100", quantity: 1 }] })),
    );
    expect(res.status).toBe(200);
    expect(handleReferralPaymentMock).not.toHaveBeenCalled();
    expect(state.rpcCalls.find((c) => c.fn === "grant_credits")).toBeUndefined();
  });
});
