import type { NextRequest } from "next/server";
import { createBrowserSupabaseClient, type AlunaSupabaseClient } from "@aluna/supabase";
import { createClient as createSsrClient } from "./server";
import { parseBearerToken } from "./bearer";

/**
 * Autentica una ruta tanto para la web (cookies vía @supabase/ssr) como para el
 * móvil (sin cookies, manda "Authorization: Bearer <access_token>" de su sesión
 * en memoria/AsyncStorage). El cliente devuelto ya lleva el token correcto en
 * sus headers, así que las consultas subsiguientes (`.from(...)`) respetan RLS
 * igual en ambos casos.
 */
export async function authenticateRoute(request: NextRequest) {
  const bearer = parseBearerToken(request.headers.get("authorization"));
  if (bearer) {
    const supabase = createBrowserSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${bearer}` } }, auth: { persistSession: false } },
    );
    const {
      data: { user },
    } = await supabase.auth.getUser(bearer);
    return { supabase, user };
  }
  const ssrClient = await createSsrClient();
  const {
    data: { user },
  } = await ssrClient.auth.getUser();
  // @supabase/ssr resuelve el mismo cliente con una firma de genéricos levemente
  // distinta a supabase-js bajo exactOptionalPropertyTypes (friction conocida
  // entre paquetes); en runtime es el mismo SupabaseClient<Database>.
  return { supabase: ssrClient as unknown as AlunaSupabaseClient, user };
}
