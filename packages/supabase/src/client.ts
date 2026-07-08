// packages/supabase/src/client.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Tipo del 3er parámetro de createClient<Database>(...), tomado por reflexión
// en vez de nombrado a mano — así no se desincroniza si supabase-js cambia la
// forma exacta de sus genéricos (SchemaName, etc.) entre versiones.
type ClientOptions = Parameters<typeof createClient<Database>>[2];

/**
 * Cliente público/anon. RN-safe: no usa APIs de DOM, corre en web y móvil.
 * Respeta RLS (solo ve las filas del usuario autenticado); la URL y la llave
 * anon/publishable son públicas. `options` se pasa tal cual a createClient —
 * el móvil lo usa para dar un `auth.storage` de AsyncStorage (sesión sin eso
 * vive solo en memoria); la web no lo necesita (usa @supabase/ssr aparte).
 */
export function createBrowserSupabaseClient(
  url: string,
  anonKey: string,
  options?: ClientOptions,
): SupabaseClient<Database> {
  return createClient<Database>(url, anonKey, options);
}
