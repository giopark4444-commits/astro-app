"use server";
import { createClient } from "@/lib/supabase/server";
import { getRole } from "@/lib/admin/roles";
import { sanitizeNavOrder, type NavKey } from "@/lib/admin/nav-order";

export type ActionResult = { ok: true } | { ok: false; error: string };
export type RoleRow = { email: string; role: string; user_id: string };
export type ListRolesResult = { ok: true; roles: RoleRow[] } | { ok: false; error: string };

// REGLA DURA (brief admin-panel): cada server action re-verifica el rol en
// servidor. La página /admin ya redirige si no eres superadmin, pero eso
// NUNCA es suficiente — cualquiera de estas acciones puede invocarse directo.
// Tipado como el caso de error puro (subtipo de ActionResult Y de
// ListRolesResult) para poder devolverlo tal cual desde cualquiera de las dos.
async function requireSuperadmin(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<{ ok: false; error: string } | null> {
  const role = await getRole(supabase);
  return role === "superadmin" ? null : { ok: false, error: "No autorizado." };
}

// Cast puntual al `.rpc()`: la versión instalada de postgrest-js infiere mal
// los args de una función con múltiples parámetros nombrados cuando el
// Database generado a mano no trae el shape completo de metadata que espera
// su resolución de overloads (mismo espíritu que el resto de los shims de
// este repo — ConfigUpsert abajo, settingsBuilder/intentBuilder en
// app/(app)/actions.ts — para bugs de tipos upstream, nunca para runtime).
type RpcClient = {
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
};
function rpcClient(supabase: Awaited<ReturnType<typeof createClient>>): RpcClient {
  return supabase as unknown as RpcClient;
}

/** Guarda el orden de la nav en app_config (key 'nav_order'). Sanea el input
 * otra vez server-side — nunca confía en lo que mande el cliente. */
export async function saveNavOrder(order: unknown): Promise<ActionResult> {
  const supabase = await createClient();
  const denied = await requireSuperadmin(supabase);
  if (denied) return denied;

  const clean = sanitizeNavOrder(order);
  try {
    // Cast puntual (mismo patrón que settingsBuilder en app/(app)/actions.ts):
    // exactOptionalPropertyTypes + el bug conocido de postgrest-js con upsert.
    type ConfigUpsert = {
      upsert: (v: { key: string; value: NavKey[]; updated_at: string }) => Promise<{ error: { message: string } | null }>;
    };
    const builder = supabase.from("app_config") as unknown as ConfigUpsert;
    const { error } = await builder.upsert({ key: "nav_order", value: clean, updated_at: new Date().toISOString() });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo guardar el orden." };
  }
}

/** Lista completa de roles (rpc admin_list_roles) para la sección
 * Colaboradores. Si la migración 0015 no está aplicada (función/tabla
 * inexistente), esto falla y la UI muestra el banner de migración pendiente. */
export async function listRoles(): Promise<ListRolesResult> {
  const supabase = await createClient();
  const denied = await requireSuperadmin(supabase);
  if (denied) return denied;

  try {
    const { data, error } = await rpcClient(supabase).rpc("admin_list_roles");
    if (error) return { ok: false, error: error.message };
    return { ok: true, roles: (data ?? []) as RoleRow[] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo cargar la lista de roles." };
  }
}

/** Concede/actualiza un rol por email (rpc admin_grant_role). Los mensajes de
 * EXCEPTION de la función de BD (email inexistente, rol inválido) llegan tal
 * cual en `error.message` — se muestran con dignidad en la UI. */
export async function grantRole(email: string, role: string): Promise<ActionResult> {
  const supabase = await createClient();
  const denied = await requireSuperadmin(supabase);
  if (denied) return denied;

  if (role !== "superadmin" && role !== "collaborator") {
    return { ok: false, error: "Rol inválido." };
  }

  try {
    const { error } = await rpcClient(supabase).rpc("admin_grant_role", { target_email: email, target_role: role });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo conceder el rol." };
  }
}

/** Quita el rol de una cuenta por email (rpc admin_revoke_role). El lockout
 * guard (no auto-revocarse el superadmin) vive en la función de BD; su
 * EXCEPTION también llega tal cual. */
export async function revokeRole(email: string): Promise<ActionResult> {
  const supabase = await createClient();
  const denied = await requireSuperadmin(supabase);
  if (denied) return denied;

  try {
    const { error } = await rpcClient(supabase).rpc("admin_revoke_role", { target_email: email });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo quitar el rol." };
  }
}

// — Referidos (brief referidos-brief T4) — mismo patrón que arriba: guard de
// rol server-side SIEMPRE, RPCs guardadas por is_superadmin() en la propia
// función de BD, mensajes de EXCEPTION propagados tal cual.

export type ReferralSummaryRow = {
  code: string;
  owner_email: string;
  discount_pct: number;
  commission_pct: number;
  active: boolean;
  referred_count: number;
  pending_cents: number;
  paid_cents: number;
  clawback_cents: number;
};
export type ListReferralSummaryResult = { ok: true; rows: ReferralSummaryRow[] } | { ok: false; error: string };

/** Tabla del panel (rpc admin_referral_summary). Si la migración 0017 no está
 * aplicada, la UI muestra el mismo banner de migración pendiente que ya usa
 * la sección Colaboradores. */
export async function listReferralSummary(): Promise<ListReferralSummaryResult> {
  const supabase = await createClient();
  const denied = await requireSuperadmin(supabase);
  if (denied) return denied;

  try {
    const { data, error } = await rpcClient(supabase).rpc("admin_referral_summary");
    if (error) return { ok: false, error: error.message };
    return { ok: true, rows: (data ?? []) as ReferralSummaryRow[] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo cargar el resumen de referidos." };
  }
}

/** Crea/edita el código de un colaborador (rpc admin_set_referral_code,
 * upsert por email — v1 es 1 código por colaborador). Valida los porcentajes
 * server-side ANTES de llamar al rpc (defensa en profundidad, mismo espíritu
 * que grantRole con el rol); la función de BD igual los revalida. */
export async function setReferralCode(
  email: string,
  code: string,
  discountPct: number,
  commissionPct: number,
): Promise<ActionResult> {
  const supabase = await createClient();
  const denied = await requireSuperadmin(supabase);
  if (denied) return denied;

  if (!Number.isInteger(discountPct) || discountPct < 0 || discountPct > 100) {
    return { ok: false, error: "Descuento inválido: debe estar entre 0 y 100." };
  }
  if (!Number.isInteger(commissionPct) || commissionPct < 0 || commissionPct > 100) {
    return { ok: false, error: "Comisión inválida: debe estar entre 0 y 100." };
  }

  try {
    const { error } = await rpcClient(supabase).rpc("admin_set_referral_code", {
      target_email: email,
      p_code: code,
      p_discount_pct: discountPct,
      p_commission_pct: commissionPct,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo guardar el código de referido." };
  }
}

/** Desactiva un código (rpc admin_deactivate_referral_code) — no borra
 * histórico de referidos/ganancias, solo deja de aceptar canjes nuevos. */
export async function deactivateReferralCode(code: string): Promise<ActionResult> {
  const supabase = await createClient();
  const denied = await requireSuperadmin(supabase);
  if (denied) return denied;

  try {
    const { error } = await rpcClient(supabase).rpc("admin_deactivate_referral_code", { p_code: code });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo desactivar el código." };
  }
}

/** «Marcar pagado» (rpc admin_mark_earnings_paid) — Gio ya le pagó al
 * colaborador POR FUERA de Dodo; esto marca todo lo pendiente de ese código
 * como pagado (pending -> paid, paid_at = now()). `expectedPendingCents` es
 * el `pending_cents` que el panel le mostró a Gio ANTES de apretar el botón
 * — la función de BD lo revalida contra el pendiente REAL en ese momento y
 * lanza si cambió entre medio (nueva ganancia, otro reembolso), para no
 * pagarle de más/de menos sin que se entere. Ese mensaje de EXCEPTION llega
 * tal cual en `error.message`. */
export async function markReferralEarningsPaid(code: string, expectedPendingCents: number): Promise<ActionResult> {
  const supabase = await createClient();
  const denied = await requireSuperadmin(supabase);
  if (denied) return denied;

  try {
    const { error } = await rpcClient(supabase).rpc("admin_mark_earnings_paid", {
      p_code: code,
      p_expected_pending_cents: expectedPendingCents,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo marcar la comisión como pagada." };
  }
}
