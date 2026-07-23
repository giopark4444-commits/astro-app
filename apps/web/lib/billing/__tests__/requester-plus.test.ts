import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isRequesterPlus } from "../requester-plus";

// isRequesterPlus extrae el patrón "¿es Plus?" que antes vivía duplicado en
// app/api/tarot/readings/route.ts y lib/reports/access.ts. Mismo estilo de
// mock encadenado que access.test.ts, pero probando el helper directo (sin
// pasar por una request/ruta).

type Sub = { status: string; current_period_end: string | null } | null;

function fakeSupabase(sub: Sub) {
  const maybeSingle = vi.fn(async () => ({ data: sub }));
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  return { supabase: { from } as never, from, select, eq, maybeSingle };
}

describe("isRequesterPlus", () => {
  beforeEach(() => {
    // Candado activo por default en estos tests (el default real de la app es
    // abierto — TODO PLANES, lib/plan-gate.ts — pero eso se cubre aparte).
    vi.stubEnv("ALUNA_ALL_ACCESS", "0");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("con ALUNA_ALL_ACCESS abierto (default actual), true SIN tocar la BD", async () => {
    vi.unstubAllEnvs();
    const { supabase, from } = fakeSupabase(null);
    const result = await isRequesterPlus(supabase, "u1");
    expect(result).toBe(true);
    expect(from).not.toHaveBeenCalled();
  });

  it("candado activo + sin fila de suscripción, false", async () => {
    const { supabase } = fakeSupabase(null);
    expect(await isRequesterPlus(supabase, "u1")).toBe(false);
  });

  it("candado activo + suscripción activa sin fecha de fin, true", async () => {
    const { supabase } = fakeSupabase({ status: "active", current_period_end: null });
    expect(await isRequesterPlus(supabase, "u1")).toBe(true);
  });

  it("candado activo + trialing con periodo futuro, true", async () => {
    const { supabase } = fakeSupabase({ status: "trialing", current_period_end: "2099-01-01T00:00:00Z" });
    expect(await isRequesterPlus(supabase, "u1")).toBe(true);
  });

  it("candado activo + active pero periodo ya vencido, false", async () => {
    const { supabase } = fakeSupabase({ status: "active", current_period_end: "2000-01-01T00:00:00Z" });
    expect(await isRequesterPlus(supabase, "u1")).toBe(false);
  });

  it("candado activo + suscripción cancelada, false", async () => {
    const { supabase } = fakeSupabase({ status: "cancelled", current_period_end: null });
    expect(await isRequesterPlus(supabase, "u1")).toBe(false);
  });

  it("consulta subscriptions por el user_id correcto", async () => {
    const { supabase, from, select, eq } = fakeSupabase(null);
    await isRequesterPlus(supabase, "user-123");
    expect(from).toHaveBeenCalledWith("subscriptions");
    expect(select).toHaveBeenCalledWith("status, current_period_end");
    expect(eq).toHaveBeenCalledWith("user_id", "user-123");
  });
});
