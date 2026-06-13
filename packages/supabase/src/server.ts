// packages/supabase/src/server.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Cliente service-role. SECRETO, SOLO SERVIDOR: omite RLS (lo usa el servicio de
 * cómputo para escribir en `charts`). Nunca debe entrar en un bundle de cliente
 * — por eso se exporta únicamente desde "@aluna/supabase/server", no desde el index.
 * Sin sesión persistente: es una conexión de backend sin usuario.
 */
export function createServiceSupabaseClient(
  url: string,
  serviceRoleKey: string,
): SupabaseClient<Database> {
  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
