import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock mínimo de next/headers (sin precedente en el repo): un cookie store en
// memoria con get/set/delete, para probar captureReferralCode/redeemFromCookie
// sin tocar una request real.
const state: {
  cookieStore: Map<string, string>;
  deletedCookies: string[];
  setCalls: Array<{ name: string; value: string; opts: Record<string, unknown> }>;
  user: { id: string } | null;
  rpcCalls: Array<{ fn: string; args: unknown }>;
  rpcError: { message: string } | null;
} = {
  cookieStore: new Map(),
  deletedCookies: [],
  setCalls: [],
  user: null,
  rpcCalls: [],
  rpcError: null,
};

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (state.cookieStore.has(name) ? { name, value: state.cookieStore.get(name)! } : undefined),
    set: (name: string, value: string, opts?: Record<string, unknown>) => {
      state.setCalls.push({ name, value, opts: opts ?? {} });
      state.cookieStore.set(name, value);
    },
    delete: (name: string) => {
      state.deletedCookies.push(name);
      state.cookieStore.delete(name);
    },
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    rpc: async (fn: string, args?: unknown) => {
      state.rpcCalls.push({ fn, args });
      return { error: state.rpcError };
    },
  }),
}));

import { captureReferralCode, redeemFromCookie, redeemReferralCode, REFERRAL_COOKIE } from "../actions";

beforeEach(() => {
  state.cookieStore = new Map();
  state.deletedCookies = [];
  state.setCalls = [];
  state.user = null;
  state.rpcCalls = [];
  state.rpcError = null;
});

describe("captureReferralCode", () => {
  it("guarda el código en upper/trim", async () => {
    await captureReferralCode("  gio1234  ");
    expect(state.setCalls).toHaveLength(1);
    expect(state.setCalls[0]).toMatchObject({ name: REFERRAL_COOKIE, value: "GIO1234" });
  });

  it("formato inválido (muy corto): no guarda nada", async () => {
    await captureReferralCode("ab");
    expect(state.setCalls).toHaveLength(0);
  });

  it("formato inválido (caracteres raros): no guarda nada", async () => {
    await captureReferralCode("GIO-1234!!");
    expect(state.setCalls).toHaveLength(0);
  });

  it("null/undefined/vacío: no guarda nada ni lanza", async () => {
    await expect(captureReferralCode(null)).resolves.toBeUndefined();
    await expect(captureReferralCode(undefined)).resolves.toBeUndefined();
    await expect(captureReferralCode("")).resolves.toBeUndefined();
    expect(state.setCalls).toHaveLength(0);
  });

  it("cookie httpOnly con 30 días", async () => {
    await captureReferralCode("ABCD1234");
    const opts = state.setCalls[0]!.opts as { httpOnly: boolean; maxAge: number };
    expect(opts.httpOnly).toBe(true);
    expect(opts.maxAge).toBe(60 * 60 * 24 * 30);
  });
});

describe("redeemFromCookie", () => {
  it("sin cookie: no llama rpc", async () => {
    await redeemFromCookie();
    expect(state.rpcCalls).toHaveLength(0);
  });

  it("con cookie: llama redeem_referral_code y borra la cookie", async () => {
    state.cookieStore.set(REFERRAL_COOKIE, "GIO1234");
    await redeemFromCookie();
    expect(state.rpcCalls).toEqual([{ fn: "redeem_referral_code", args: { p_code: "GIO1234" } }]);
    expect(state.deletedCookies).toContain(REFERRAL_COOKIE);
  });

  it("nunca lanza si el rpc falla (código inválido/ya referido/migración sin aplicar) y borra la cookie igual", async () => {
    state.cookieStore.set(REFERRAL_COOKIE, "BAD1234");
    state.rpcError = { message: "ya tienes un código aplicado" };
    await expect(redeemFromCookie()).resolves.toBeUndefined();
    expect(state.deletedCookies).toContain(REFERRAL_COOKIE);
  });
});

describe("redeemReferralCode", () => {
  it("sin usuario autenticado: no autorizado, nunca llama rpc", async () => {
    state.user = null;
    const res = await redeemReferralCode("GIO1234");
    expect(res).toEqual({ ok: false, error: "No autorizado." });
    expect(state.rpcCalls).toHaveLength(0);
  });

  it("código vacío: error sin llamar rpc", async () => {
    state.user = { id: "u1" };
    const res = await redeemReferralCode("   ");
    expect(res).toEqual({ ok: false, error: "Ingresa un código." });
    expect(state.rpcCalls).toHaveLength(0);
  });

  it("canjea en upper/trim", async () => {
    state.user = { id: "u1" };
    const res = await redeemReferralCode("  gio1234 ");
    expect(res).toEqual({ ok: true });
    expect(state.rpcCalls).toEqual([{ fn: "redeem_referral_code", args: { p_code: "GIO1234" } }]);
  });

  it("propaga el mensaje de la EXCEPTION de BD tal cual (p.ej. ya referido)", async () => {
    state.user = { id: "u1" };
    state.rpcError = { message: "ya tienes un código aplicado" };
    const res = await redeemReferralCode("GIO1234");
    expect(res).toEqual({ ok: false, error: "ya tienes un código aplicado" });
  });
});
