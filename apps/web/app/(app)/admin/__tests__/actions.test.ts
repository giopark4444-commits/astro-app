import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock mínimo (sin precedente de action-test en el repo para @/lib/supabase/server):
// un cliente fake con exactamente los métodos que actions.ts usa, más
// @/lib/admin/roles.getRole controlado por test — así se prueba la REGLA
// DURA del brief (cada acción re-verifica el rol en servidor) sin tocar red.
const state: {
  role: "superadmin" | "collaborator" | null;
  upsertCalls: Array<{ table: string; v: unknown }>;
  upsertError: { message: string } | null;
  rpcCalls: Array<{ fn: string; args: unknown }>;
  rpcError: { message: string } | null;
  rpcData: unknown;
} = { role: null, upsertCalls: [], upsertError: null, rpcCalls: [], rpcError: null, rpcData: null };

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: (table: string) => ({
      upsert: async (v: unknown) => {
        state.upsertCalls.push({ table, v });
        return { error: state.upsertError };
      },
    }),
    rpc: async (fn: string, args?: unknown) => {
      state.rpcCalls.push({ fn, args });
      return { data: state.rpcData, error: state.rpcError };
    },
  }),
}));

vi.mock("@/lib/admin/roles", () => ({
  getRole: async () => state.role,
}));

import {
  saveNavOrder,
  listRoles,
  grantRole,
  revokeRole,
  listReferralSummary,
  setReferralCode,
  deactivateReferralCode,
  markReferralEarningsPaid,
} from "../actions";

describe("admin server actions — guard de rol + saneo (REGLA DURA del brief)", () => {
  beforeEach(() => {
    state.role = null;
    state.upsertCalls = [];
    state.upsertError = null;
    state.rpcCalls = [];
    state.rpcError = null;
    state.rpcData = null;
  });

  describe("saveNavOrder", () => {
    it("rechaza sin rol superadmin y NUNCA llama a upsert", async () => {
      state.role = "collaborator";
      const res = await saveNavOrder(["hoy", "carta"]);
      expect(res).toEqual({ ok: false, error: "No autorizado." });
      expect(state.upsertCalls).toHaveLength(0);
    });

    it("rechaza sin ningún rol (usuario común)", async () => {
      state.role = null;
      const res = await saveNavOrder(["hoy"]);
      expect(res).toEqual({ ok: false, error: "No autorizado." });
    });

    it("sanea el input (basura, dedupe, faltantes) server-side antes de guardar", async () => {
      state.role = "superadmin";
      const res = await saveNavOrder(["no-existe", "tarot", "tarot"]);
      expect(res).toEqual({ ok: true });
      expect(state.upsertCalls).toHaveLength(1);
      expect(state.upsertCalls[0]).toEqual({
        table: "app_config",
        v: {
          key: "nav_order",
          value: ["tarot", "astros", "otrasLecturas"],
          updated_at: expect.any(String),
        },
      });
      // updated_at real (review Fable): un ISO timestamp válido, no un valor fijo.
      const v = state.upsertCalls[0]!.v as { updated_at: string };
      expect(new Date(v.updated_at).toISOString()).toBe(v.updated_at);
    });

    it("propaga el error de la BD tal cual si el upsert falla", async () => {
      state.role = "superadmin";
      state.upsertError = { message: "boom" };
      const res = await saveNavOrder(["hoy"]);
      expect(res).toEqual({ ok: false, error: "boom" });
    });
  });

  describe("listRoles", () => {
    it("rechaza sin rol superadmin y nunca llama al rpc", async () => {
      state.role = "collaborator";
      const res = await listRoles();
      expect(res).toEqual({ ok: false, error: "No autorizado." });
      expect(state.rpcCalls).toHaveLength(0);
    });

    it("devuelve las filas del rpc admin_list_roles como superadmin", async () => {
      state.role = "superadmin";
      state.rpcData = [{ email: "a@b.com", role: "collaborator", user_id: "u1" }];
      const res = await listRoles();
      expect(res).toEqual({ ok: true, roles: state.rpcData });
      expect(state.rpcCalls).toEqual([{ fn: "admin_list_roles", args: undefined }]);
    });

    it("si admin_list_roles falla (p.ej. migración 0015 sin aplicar), devuelve el error tal cual", async () => {
      state.role = "superadmin";
      state.rpcError = { message: 'function public.admin_list_roles() does not exist' };
      const res = await listRoles();
      expect(res).toEqual({ ok: false, error: 'function public.admin_list_roles() does not exist' });
    });
  });

  describe("grantRole", () => {
    it("rechaza sin rol superadmin", async () => {
      state.role = null;
      const res = await grantRole("a@b.com", "collaborator");
      expect(res).toEqual({ ok: false, error: "No autorizado." });
      expect(state.rpcCalls).toHaveLength(0);
    });

    it("valida el rol server-side ANTES de llamar al rpc (defensa en profundidad)", async () => {
      state.role = "superadmin";
      const res = await grantRole("a@b.com", "algo-raro");
      expect(res).toEqual({ ok: false, error: "Rol inválido." });
      expect(state.rpcCalls).toHaveLength(0);
    });

    it("llama a admin_grant_role con email/rol como superadmin", async () => {
      state.role = "superadmin";
      const res = await grantRole("a@b.com", "superadmin");
      expect(res).toEqual({ ok: true });
      expect(state.rpcCalls).toEqual([
        { fn: "admin_grant_role", args: { target_email: "a@b.com", target_role: "superadmin" } },
      ]);
    });

    it("muestra el mensaje de la EXCEPTION de BD tal cual (p.ej. email inexistente)", async () => {
      state.role = "superadmin";
      state.rpcError = { message: "no existe ninguna cuenta con el correo x@y.com" };
      const res = await grantRole("x@y.com", "collaborator");
      expect(res).toEqual({ ok: false, error: "no existe ninguna cuenta con el correo x@y.com" });
    });
  });

  describe("revokeRole", () => {
    it("rechaza sin rol superadmin y nunca llama al rpc", async () => {
      state.role = "collaborator";
      const res = await revokeRole("a@b.com");
      expect(res).toEqual({ ok: false, error: "No autorizado." });
      expect(state.rpcCalls).toHaveLength(0);
    });

    it("llama a admin_revoke_role con el email como superadmin", async () => {
      state.role = "superadmin";
      const res = await revokeRole("a@b.com");
      expect(res).toEqual({ ok: true });
      expect(state.rpcCalls).toEqual([{ fn: "admin_revoke_role", args: { target_email: "a@b.com" } }]);
    });

    it("propaga el lockout guard de la BD (no auto-revocarse el superadmin) tal cual", async () => {
      state.role = "superadmin";
      state.rpcError = { message: "no puedes quitarte a ti mismo el rol de superadmin" };
      const res = await revokeRole("yo@aluna.com");
      expect(res).toEqual({ ok: false, error: "no puedes quitarte a ti mismo el rol de superadmin" });
    });
  });

  describe("listReferralSummary", () => {
    it("rechaza sin rol superadmin y nunca llama al rpc", async () => {
      state.role = "collaborator";
      const res = await listReferralSummary();
      expect(res).toEqual({ ok: false, error: "No autorizado." });
      expect(state.rpcCalls).toHaveLength(0);
    });

    it("devuelve las filas del rpc admin_referral_summary como superadmin", async () => {
      state.role = "superadmin";
      state.rpcData = [{ code: "GIO1234", owner_email: "a@b.com", discount_pct: 10, commission_pct: 30, active: true, referred_count: 2, pending_cents: 500, paid_cents: 0, clawback_cents: 0 }];
      const res = await listReferralSummary();
      expect(res).toEqual({ ok: true, rows: state.rpcData });
      expect(state.rpcCalls).toEqual([{ fn: "admin_referral_summary", args: undefined }]);
    });

    it("si admin_referral_summary falla (p.ej. migración 0017 sin aplicar), devuelve el error tal cual", async () => {
      state.role = "superadmin";
      state.rpcError = { message: "function public.admin_referral_summary() does not exist" };
      const res = await listReferralSummary();
      expect(res).toEqual({ ok: false, error: "function public.admin_referral_summary() does not exist" });
    });
  });

  describe("setReferralCode", () => {
    it("rechaza sin rol superadmin y nunca llama al rpc", async () => {
      state.role = "collaborator";
      const res = await setReferralCode("a@b.com", "GIO1234", 10, 30);
      expect(res).toEqual({ ok: false, error: "No autorizado." });
      expect(state.rpcCalls).toHaveLength(0);
    });

    it("valida el % de descuento server-side ANTES de llamar al rpc", async () => {
      state.role = "superadmin";
      const res = await setReferralCode("a@b.com", "GIO1234", 150, 30);
      expect(res).toEqual({ ok: false, error: "Descuento inválido: debe estar entre 0 y 100." });
      expect(state.rpcCalls).toHaveLength(0);
    });

    it("valida el % de comisión server-side ANTES de llamar al rpc", async () => {
      state.role = "superadmin";
      const res = await setReferralCode("a@b.com", "GIO1234", 10, -1);
      expect(res).toEqual({ ok: false, error: "Comisión inválida: debe estar entre 0 y 100." });
      expect(state.rpcCalls).toHaveLength(0);
    });

    it("llama a admin_set_referral_code con los datos como superadmin", async () => {
      state.role = "superadmin";
      const res = await setReferralCode("a@b.com", "GIO1234", 10, 30);
      expect(res).toEqual({ ok: true });
      expect(state.rpcCalls).toEqual([
        { fn: "admin_set_referral_code", args: { target_email: "a@b.com", p_code: "GIO1234", p_discount_pct: 10, p_commission_pct: 30 } },
      ]);
    });

    it("muestra el mensaje de la EXCEPTION de BD tal cual (p.ej. código ya de otro colaborador)", async () => {
      state.role = "superadmin";
      state.rpcError = { message: "el código GIO1234 ya pertenece a otro colaborador" };
      const res = await setReferralCode("a@b.com", "GIO1234", 10, 30);
      expect(res).toEqual({ ok: false, error: "el código GIO1234 ya pertenece a otro colaborador" });
    });
  });

  describe("deactivateReferralCode", () => {
    it("rechaza sin rol superadmin y nunca llama al rpc", async () => {
      state.role = "collaborator";
      const res = await deactivateReferralCode("GIO1234");
      expect(res).toEqual({ ok: false, error: "No autorizado." });
      expect(state.rpcCalls).toHaveLength(0);
    });

    it("llama a admin_deactivate_referral_code con el código como superadmin", async () => {
      state.role = "superadmin";
      const res = await deactivateReferralCode("GIO1234");
      expect(res).toEqual({ ok: true });
      expect(state.rpcCalls).toEqual([{ fn: "admin_deactivate_referral_code", args: { p_code: "GIO1234" } }]);
    });
  });

  describe("markReferralEarningsPaid", () => {
    it("rechaza sin rol superadmin y nunca llama al rpc", async () => {
      state.role = "collaborator";
      const res = await markReferralEarningsPaid("GIO1234", 500);
      expect(res).toEqual({ ok: false, error: "No autorizado." });
      expect(state.rpcCalls).toHaveLength(0);
    });

    it("llama a admin_mark_earnings_paid con el código y el pendiente esperado como superadmin", async () => {
      state.role = "superadmin";
      const res = await markReferralEarningsPaid("GIO1234", 500);
      expect(res).toEqual({ ok: true });
      expect(state.rpcCalls).toEqual([
        { fn: "admin_mark_earnings_paid", args: { p_code: "GIO1234", p_expected_pending_cents: 500 } },
      ]);
    });

    it("propaga tal cual el guard de BD si el pendiente cambió entre medio", async () => {
      state.role = "superadmin";
      state.rpcError = { message: "el pendiente cambió — recarga la página" };
      const res = await markReferralEarningsPaid("GIO1234", 500);
      expect(res).toEqual({ ok: false, error: "el pendiente cambió — recarga la página" });
    });
  });
});
