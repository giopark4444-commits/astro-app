import type { createClient } from "@/lib/supabase/server";

export type Role = "superadmin" | "collaborator";

// Cast puntual al estilo de app/(app)/actions.ts (settingsBuilder/intentBuilder):
// "roles" recién existe desde la migración 0015 — hasta que Gio la aplique en
// el Supabase remoto, cualquier lectura de esta tabla puede reventar (tabla
// inexistente), así que el tipo del builder se acota a lo mínimo que usamos.
type RolesBuilder = {
  select: (cols: string) => { maybeSingle: () => Promise<{ data: { role: string } | null }> };
};
function rolesBuilder(supabase: Awaited<ReturnType<typeof createClient>>): RolesBuilder {
  return supabase.from("roles") as unknown as RolesBuilder;
}

/**
 * Rol de la cuenta autenticada (lee la fila propia — RLS de `roles` ya la
 * acota a `auth.uid() = user_id`, así que no hace falta resolver el user_id a
 * mano). Devuelve null si no tiene fila (usuario común, el caso normal) O si
 * la consulta revienta por cualquier motivo — el más esperable durante este
 * desarrollo: la migración 0015 todavía no está aplicada en el Supabase
 * remoto y la tabla no existe.
 *
 * ⚠️ Lección del repo: PostgrestBuilder NO expone `.catch` como una Promise
 * normal — el único wrapper seguro es try/catch alrededor del `await`, nunca
 * encadenar `.catch(...)` a la query.
 */
export async function getRole(supabase: Awaited<ReturnType<typeof createClient>>): Promise<Role | null> {
  try {
    const { data } = await rolesBuilder(supabase).select("role").maybeSingle();
    const role = data?.role;
    return role === "superadmin" || role === "collaborator" ? role : null;
  } catch {
    return null;
  }
}
