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
