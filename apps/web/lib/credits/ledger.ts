// Helpers de servidor sobre el ledger de créditos (migración 0022): envuelven
// los RPCs `spend_credits` / `grant_credits` / `bump_chat_usage` con un cliente
// service-role. NUNCA lanzan: cualquier error de red o del RPC se traduce a un
// valor "seguro" — false para gasto (fail-closed, no se cobra ante la duda),
// tri-estado para abono (ver `grantCredits`: colapsar "ya abonado" y "error
// real" en un solo booleano deja al cliente que SÍ pagó sin sus créditos para
// siempre si el caller solo loguea y responde 200) y null para el contador de
// uso (fail-open, el llamador no debe bloquear al usuario por un problema de
// infraestructura).
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

/**
 * Abona créditos (compra/refill/refund/regalo), idempotente por `ref`.
 * Tri-estado — NO colapsar "ya abonado" y "error real" en un solo booleano:
 * un cliente que pagó (pack o refill de suscripción) y cuyo abono falla por
 * un problema transitorio de red/rpc quedaría sin créditos para siempre si el
 * caller solo loguea `false` y responde 200 (Dodo no reintenta un 200).
 * - "granted": el RPC abonó ahora (`data === true`).
 * - "duplicate": el RPC ya había visto este `ref` antes — `unique_violation`
 *   dentro de `grant_credits` (`data === false`), la idempotencia funcionando
 *   como se espera, nada que reintentar.
 * - "error": fallo real de red o del RPC (o `throw`) — el abono NO se
 *   realizó. El caller debe tratarlo como abono pendiente y forzar un retry
 *   (p.ej. 500 al webhook de Dodo, que sí reintenta ante 5xx). Nunca lanza.
 */
export async function grantCredits(
  svc: SupabaseClient,
  userId: string,
  amount: number,
  kind: "purchase" | "refill" | "refund" | "grant",
  ref: string,
): Promise<"granted" | "duplicate" | "error"> {
  try {
    const { data, error } = await svc.rpc("grant_credits", {
      p_user: userId,
      p_amount: amount,
      p_kind: kind,
      p_ref: ref,
    });
    if (error) return "error";
    if (data === true) return "granted";
    if (data === false) return "duplicate";
    return "error"; // shape inesperado del RPC (ni true ni false): no asumir "ya abonado", tratar como error real
  } catch {
    return "error";
  }
}

/**
 * Revierte un gasto: abona con kind "refund" y ref namespaced
 * `refund:<spendRef>`. Mantiene firma booleana para sus callers actuales
 * (chat/area-reading, Tasks 5-6), que no necesitan distinguir el motivo:
 * "granted" y "duplicate" son éxito (el refund ya existía = objetivo
 * cumplido, mismo criterio que antes), solo "error" es `false`.
 */
export async function refundSpend(
  svc: SupabaseClient,
  userId: string,
  amount: number,
  spendRef: string,
): Promise<boolean> {
  const result = await grantCredits(svc, userId, amount, "refund", `refund:${spendRef}`);
  return result !== "error";
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
