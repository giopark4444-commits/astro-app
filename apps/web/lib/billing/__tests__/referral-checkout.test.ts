import { describe, it, expect } from "vitest";
import { resolveReferralMetadata } from "../referral-checkout";

function fakeSupabase(rpc: () => Promise<{ data: unknown; error: { message: string } | null }>) {
  return { rpc };
}

describe("resolveReferralMetadata", () => {
  it("código activo con descuento: devuelve { referral_code }", async () => {
    const supabase = fakeSupabase(async () => ({ data: "GIO1234", error: null }));
    await expect(resolveReferralMetadata(supabase)).resolves.toEqual({ referral_code: "GIO1234" });
  });

  it("sin referido / sin descuento (rpc devuelve null): undefined", async () => {
    const supabase = fakeSupabase(async () => ({ data: null, error: null }));
    await expect(resolveReferralMetadata(supabase)).resolves.toBeUndefined();
  });

  it("si el rpc falla (p.ej. migración 0016 sin aplicar): undefined, nunca lanza", async () => {
    const supabase = fakeSupabase(async () => ({ data: null, error: { message: "function does not exist" } }));
    await expect(resolveReferralMetadata(supabase)).resolves.toBeUndefined();
  });

  it("nunca lanza si el cliente entero revienta (throw síncrono/async)", async () => {
    const supabase = fakeSupabase(async () => {
      throw new Error("boom");
    });
    await expect(resolveReferralMetadata(supabase)).resolves.toBeUndefined();
  });

  it("data con un tipo inesperado (no string): undefined", async () => {
    const supabase = fakeSupabase(async () => ({ data: 123, error: null }));
    await expect(resolveReferralMetadata(supabase)).resolves.toBeUndefined();
  });
});
