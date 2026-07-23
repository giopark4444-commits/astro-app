import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { NextRequest } from "next/server";

// Mismo patrón que ajustes/__tests__/actions.test.ts: fake mínimo de
// @/lib/supabase/server (sin precedente de test para esta ruta antes de
// Task 7 — este archivo es NUEVO, no había __tests__ para checkout/route.ts).
const state: {
  user: { id: string; email: string } | null;
  existingSubscription: { status: string } | null;
  existingSubscriptionError: { message: string } | null;
} = { user: null, existingSubscription: null, existingSubscriptionError: null };

function resetState() {
  state.user = null;
  state.existingSubscription = null;
  state.existingSubscriptionError = null;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: (table: string) => {
      if (table !== "subscriptions") throw new Error(`tabla inesperada: ${table}`);
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: state.existingSubscription, error: state.existingSubscriptionError }),
          }),
        }),
      };
    },
  }),
}));

const checkoutSessionsCreateMock = vi.fn(async (...args: unknown[]) => {
  void args;
  return { checkout_url: "https://checkout.dodopayments.com/session_abc" };
});
vi.mock("@/lib/billing/dodo-client", () => ({
  getDodoClient: () => ({ checkoutSessions: { create: (...args: unknown[]) => checkoutSessionsCreateMock(...args) } }),
  dodoProductId: (plan: "monthly" | "yearly") => {
    const id = plan === "monthly" ? process.env.DODO_PRODUCT_MONTHLY : process.env.DODO_PRODUCT_YEARLY;
    if (!id) throw new Error(`Falta DODO_PRODUCT_${plan === "monthly" ? "MONTHLY" : "YEARLY"}`);
    return id;
  },
}));

vi.mock("@/lib/billing/referral-checkout", () => ({
  resolveReferralMetadata: async () => undefined,
}));

import { POST } from "../route";

function fakeRequest(body: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest;
}

const ENV_KEYS = [
  "NEXT_PUBLIC_APP_URL",
  "DODO_PRODUCT_MONTHLY",
  "DODO_PRODUCT_YEARLY",
  "DODO_PRODUCT_CREDITS_100",
  "DODO_PRODUCT_CREDITS_300",
  "DODO_PRODUCT_CREDITS_1000",
];

beforeEach(() => {
  vi.clearAllMocks();
  checkoutSessionsCreateMock.mockResolvedValue({ checkout_url: "https://checkout.dodopayments.com/session_abc" });
  resetState();
  state.user = { id: "user_1", email: "gio@example.com" };
  for (const key of ENV_KEYS) delete process.env[key];
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3002";
  process.env.DODO_PRODUCT_MONTHLY = "pdt_monthly";
  process.env.DODO_PRODUCT_YEARLY = "pdt_yearly";
});

afterEach(() => {
  for (const key of ENV_KEYS) delete process.env[key];
});

describe("POST /api/billing/checkout — packs (Task 7, nuevo)", () => {
  it('{ pack: "pack100" } con env configurado: cart one-time SIN subscription_data, return_url ?checkout=credits', async () => {
    process.env.DODO_PRODUCT_CREDITS_100 = "pdt_credits_100";
    const res = await POST(fakeRequest({ pack: "pack100" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ checkoutUrl: "https://checkout.dodopayments.com/session_abc" });
    expect(checkoutSessionsCreateMock).toHaveBeenCalledTimes(1);
    const call = checkoutSessionsCreateMock.mock.calls[0]![0] as Record<string, unknown>;
    expect(call.product_cart).toEqual([{ product_id: "pdt_credits_100", quantity: 1 }]);
    expect(call.subscription_data).toBeUndefined();
    expect(call.return_url).toBe("http://localhost:3002/ajustes?checkout=credits");
  });

  it('{ pack: "pack300" } SIN el env de producto configurado -> 500 pack_not_configured, no llama a Dodo', async () => {
    const res = await POST(fakeRequest({ pack: "pack300" }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "pack_not_configured" });
    expect(checkoutSessionsCreateMock).not.toHaveBeenCalled();
  });

  it("un pack NUNCA aplica el guard de already_subscribed: se puede comprar aunque haya una suscripción active", async () => {
    process.env.DODO_PRODUCT_CREDITS_1000 = "pdt_credits_1000";
    state.existingSubscription = { status: "active" };
    const res = await POST(fakeRequest({ pack: "pack1000" }));
    expect(res.status).toBe(200);
    expect(checkoutSessionsCreateMock).toHaveBeenCalledTimes(1);
  });

  it("pack con id desconocido -> 400 bad_request", async () => {
    const res = await POST(fakeRequest({ pack: "pack_no_existe" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "bad_request" });
  });

  it("body con plan Y pack a la vez -> 400 bad_request", async () => {
    const res = await POST(fakeRequest({ plan: "monthly", pack: "pack100" }));
    expect(res.status).toBe(400);
  });

  it("body sin plan ni pack -> 400 bad_request", async () => {
    const res = await POST(fakeRequest({}));
    expect(res.status).toBe(400);
  });

  it("sin sesión autenticada -> 401, ni siquiera intenta crear la sesión de Dodo", async () => {
    process.env.DODO_PRODUCT_CREDITS_100 = "pdt_credits_100";
    state.user = null;
    const res = await POST(fakeRequest({ pack: "pack100" }));
    expect(res.status).toBe(401);
    expect(checkoutSessionsCreateMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/billing/checkout — plan (camino existente, debe seguir intacto)", () => {
  it('{ plan: "monthly" }: sigue funcionando igual que antes (cart de suscripción, trial 14 días)', async () => {
    const res = await POST(fakeRequest({ plan: "monthly" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ checkoutUrl: "https://checkout.dodopayments.com/session_abc" });
    const call = checkoutSessionsCreateMock.mock.calls[0]![0] as Record<string, unknown>;
    expect(call.product_cart).toEqual([{ product_id: "pdt_monthly", quantity: 1 }]);
    expect(call.subscription_data).toEqual({ trial_period_days: 14 });
    expect(call.return_url).toBe("http://localhost:3002/ajustes?checkout=success");
  });

  it('{ plan: "yearly" } con una suscripción ya activa -> 409 already_subscribed (guard intacto, SOLO para planes)', async () => {
    state.existingSubscription = { status: "active" };
    const res = await POST(fakeRequest({ plan: "yearly" }));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "already_subscribed" });
  });

  it("plan inválido -> 400 bad_request", async () => {
    const res = await POST(fakeRequest({ plan: "weekly" }));
    expect(res.status).toBe(400);
  });

  it("JSON inválido en el body -> 400 bad_request", async () => {
    const res = await POST({ json: async () => { throw new Error("bad json"); } } as unknown as NextRequest);
    expect(res.status).toBe(400);
  });
});
