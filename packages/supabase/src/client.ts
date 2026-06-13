// packages/supabase/src/client.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Cliente público/anon. RN-safe: no usa APIs de DOM, corre en web y móvil.
 * Respeta RLS (solo ve las filas del usuario autenticado); la URL y la llave
 * anon/publishable son públicas. Nota: en React Native la sesión es en memoria
 * por defecto; la persistencia con AsyncStorage se cableará al construir el
 * cliente móvil (Plan 5).
 */
export function createBrowserSupabaseClient(
  url: string,
  anonKey: string,
): SupabaseClient<Database> {
  return createClient<Database>(url, anonKey);
}
