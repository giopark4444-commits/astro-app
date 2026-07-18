// Metadata de atribución de referido para /api/billing/checkout (brief T6,
// preparado/latente — el descuento real en Dodo llega en una fase futura con
// llave). Nunca lanza: sin la migración 0016 aplicada, esto simplemente no
// agrega metadata (el checkout sigue funcionando con normalidad).

// Shim mínimo del cliente (mismo espíritu que rpcClient en admin/actions.ts):
// acotado a `.rpc()`, evita pelear con la unión de generics de
// createServerClient<Database> bajo exactOptionalPropertyTypes.
type RpcCapable = { rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }> };

/**
 * Si el usuario autenticado (el mismo `supabase` de la request, con su RLS
 * normal — no hace falta service role) está referido por un código activo
 * con `discount_pct > 0`, `my_referral_code_for_checkout()` (definer, ver
 * 0016 — resuelve esto sin que el referido necesite leer `referral_codes`
 * directo, que RLS solo deja ver a su owner) devuelve ese código. Se adjunta
 * SIEMPRE como `{ referral_code }` a la sesión de Dodo — respaldo de
 * atribución manual mientras no haya discount codes reales de Dodo
 * conectados (ver TODO-Dodo en route.ts). `undefined` si no aplica.
 */
export async function resolveReferralMetadata(supabase: unknown): Promise<{ referral_code: string } | undefined> {
  try {
    const { data, error } = await (supabase as RpcCapable).rpc("my_referral_code_for_checkout");
    if (error || typeof data !== "string" || !data) return undefined;
    return { referral_code: data };
  } catch {
    return undefined;
  }
}
