import { describe, it, expect, beforeEach, vi } from "vitest";

// Mismo espíritu que admin/__tests__/actions.test.ts: fake mínimo de
// @/lib/supabase/server + @/lib/admin/roles.getRole controlado por test.
const state: {
  role: "superadmin" | "collaborator" | null;
  rpcCalls: Array<{ fn: string; args: unknown }>;
  rpcError: { message: string } | null;
  rpcData: unknown;
} = { role: null, rpcCalls: [], rpcError: null, rpcData: null };

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    rpc: async (fn: string, args?: unknown) => {
      state.rpcCalls.push({ fn, args });
      return { data: state.rpcData, error: state.rpcError };
    },
  }),
}));

vi.mock("@/lib/admin/roles", () => ({
  getRole: async () => state.role,
}));

import { myReferralSummary } from "../actions";

describe("myReferralSummary", () => {
  beforeEach(() => {
    state.role = null;
    state.rpcCalls = [];
    state.rpcError = null;
    state.rpcData = null;
  });

  it("rechaza sin rol collaborator/superadmin y nunca llama al rpc", async () => {
    state.role = null;
    const res = await myReferralSummary();
    expect(res).toEqual({ ok: false, error: "No autorizado." });
    expect(state.rpcCalls).toHaveLength(0);
  });

  it("acepta collaborator", async () => {
    state.role = "collaborator";
    const row = { code: "GIO1234", discount_pct: 10, commission_pct: 30, referred_count: 2, pending_cents: 500, paid_cents: 100 };
    state.rpcData = [row];
    const res = await myReferralSummary();
    expect(res).toEqual({ ok: true, row });
  });

  it("acepta superadmin", async () => {
    state.role = "superadmin";
    state.rpcData = [{ code: "GIO1234", discount_pct: 10, commission_pct: 30, referred_count: 0, pending_cents: 0, paid_cents: 0 }];
    const res = await myReferralSummary();
    expect(res.ok).toBe(true);
  });

  it("sin código propio: row null (no es un error)", async () => {
    state.role = "collaborator";
    state.rpcData = [];
    const res = await myReferralSummary();
    expect(res).toEqual({ ok: true, row: null });
  });

  it("si el rpc falla (p.ej. migración 0016 sin aplicar), devuelve el error tal cual", async () => {
    state.role = "collaborator";
    state.rpcError = { message: "function public.my_referral_summary() does not exist" };
    const res = await myReferralSummary();
    expect(res).toEqual({ ok: false, error: "function public.my_referral_summary() does not exist" });
  });
});
