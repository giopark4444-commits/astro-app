"use server";
import { createClient } from "@/lib/supabase/server";
import { getRole } from "@/lib/admin/roles";

export type MyReferralSummary = {
  code: string;
  discount_pct: number;
  commission_pct: number;
  referred_count: number;
  pending_cents: number;
  paid_cents: number;
};
export type MyReferralSummaryResult = { ok: true; row: MyReferralSummary | null } | { ok: false; error: string };

// Cast puntual al `.rpc()` (mismo espíritu que rpcClient en admin/actions.ts).
type RpcClient = { rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }> };
function rpcClient(supabase: Awaited<ReturnType<typeof createClient>>): RpcClient {
  return supabase as unknown as RpcClient;
}

/**
 * «Tu código» del panel /colab (brief T5): rpc my_referral_summary — SIN
 * guard de superadmin en la función de BD (solo agrega auth.uid() = owner),
 * pero la action sí exige collaborator O superadmin (mismo gate que la
 * página). Devuelve `row: null` (sin error) si el rol es válido pero
 * my_referral_summary no trae ninguna fila (todavía no tiene código propio).
 */
export async function myReferralSummary(): Promise<MyReferralSummaryResult> {
  const supabase = await createClient();
  const role = await getRole(supabase);
  if (role !== "collaborator" && role !== "superadmin") return { ok: false, error: "No autorizado." };

  try {
    const { data, error } = await rpcClient(supabase).rpc("my_referral_summary");
    if (error) return { ok: false, error: error.message };
    const rows = (data ?? []) as MyReferralSummary[];
    return { ok: true, row: rows[0] ?? null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo cargar tu código de referido." };
  }
}
