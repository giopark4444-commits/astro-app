// Helpers de servidor sobre el ledger de créditos (migración 0022): envuelven
// los RPCs `spend_credits` / `grant_credits` / `bump_chat_usage` con un cliente
// service-role. NUNCA lanzan: cualquier error de red o del RPC se traduce a un
// valor "seguro" — false para gasto/abono (fail-closed, no se cobra ni se
// abona ante la duda) y null para el contador de uso (fail-open, el llamador
// no debe bloquear al usuario por un problema de infraestructura).
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceSupabaseClient } from "@aluna/supabase/server";

/**
 * Cliente service-role para créditos. Mismas env vars que
 * app/api/chart-reading/route.ts: si falta alguna, el premium queda apagado
 * (null) en vez de reventar — el caller decide cómo degradar.
 */
export function getCreditsServiceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  try {
    // URL presente pero malformada no debe tumbar al caller; premium simplemente queda apagado.
    return createServiceSupabaseClient(url, serviceKey);
  } catch {
    return null;
  }
}

/** Descuenta créditos (fail-closed): red/rpc caído o saldo insuficiente → false, nunca lanza. */
export async function spendCredits(
  svc: SupabaseClient,
  userId: string,
  amount: number,
  ref: string,
): Promise<boolean> {
  try {
    const { data, error } = await svc.rpc("spend_credits", {
      p_user: userId,
      p_amount: amount,
      p_ref: ref,
    });
    if (error) return false;
    return data === true;
  } catch {
    return false;
  }
}

/** Abona créditos (compra/refill/refund/regalo), idempotente por `ref`. Error → false, nunca lanza. */
export async function grantCredits(
  svc: SupabaseClient,
  userId: string,
  amount: number,
  kind: "purchase" | "refill" | "refund" | "grant",
  ref: string,
): Promise<boolean> {
  try {
    const { data, error } = await svc.rpc("grant_credits", {
      p_user: userId,
      p_amount: amount,
      p_kind: kind,
      p_ref: ref,
    });
    if (error) return false;
    return data === true;
  } catch {
    return false;
  }
}

/** Revierte un gasto: abona con kind "refund" y ref namespaced `refund:<spendRef>`. */
export async function refundSpend(
  svc: SupabaseClient,
  userId: string,
  amount: number,
  spendRef: string,
): Promise<boolean> {
  return grantCredits(svc, userId, amount, "refund", `refund:${spendRef}`);
}

/** Suma un turno de chat al contador diario. Fail-open: error de red/rpc → null, el llamador no bloquea. */
export async function bumpChatUsage(svc: SupabaseClient, userId: string): Promise<number | null> {
  try {
    const { data, error } = await svc.rpc("bump_chat_usage", { p_user: userId });
    if (error || typeof data !== "number") return null;
    return data;
  } catch {
    return null;
  }
}
