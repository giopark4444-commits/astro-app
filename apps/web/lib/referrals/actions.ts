"use server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { REFERRAL_COOKIE, REFERRAL_COOKIE_MAX_AGE_SECONDS, REFERRAL_CODE_RE } from "./constants";

export type RedeemResult = { ok: true } | { ok: false; error: string };

// Cast puntual al `.rpc()` (mismo espíritu que rpcClient en admin/actions.ts):
// la versión instalada de postgrest-js infiere mal los args nombrados.
type RpcClient = { rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ error: { message: string } | null }> };
function rpcClient(supabase: Awaited<ReturnType<typeof createClient>>): RpcClient {
  return supabase as unknown as RpcClient;
}

/**
 * Guarda el código de `?ref=` en cookie httpOnly (30 días) para canjearlo
 * cuando el onboarding termine. Nunca lanza: un `?ref=` roto, ausente, o con
 * formato inválido simplemente no guarda nada — jamás debe afectar el
 * login/signup.
 */
export async function captureReferralCode(rawCode: string | null | undefined): Promise<void> {
  const code = (rawCode ?? "").trim().toUpperCase();
  if (!REFERRAL_CODE_RE.test(code)) return;
  try {
    const store = await cookies();
    store.set(REFERRAL_COOKIE, code, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: REFERRAL_COOKIE_MAX_AGE_SECONDS,
      path: "/",
    });
  } catch {
    // best effort: si por lo que sea no se puede fijar la cookie acá, el
    // campo manual de /ajustes sigue siendo la vía de respaldo.
  }
}

/**
 * Canjea el código guardado en la cookie `aluna_ref` (llamado justo después
 * de que el onboarding crea el birth_profile — ver
 * app/onboarding/actions.ts). Silencioso siempre: un código inválido, ya
 * canjeado, o la migración 0016 sin aplicar NUNCA deben romper el onboarding.
 * Borra la cookie al terminar, haya ido bien o mal — es un intento único.
 */
export async function redeemFromCookie(): Promise<void> {
  const store = await cookies();
  const code = store.get(REFERRAL_COOKIE)?.value;
  if (!code) return;
  try {
    const supabase = await createClient();
    await rpcClient(supabase).rpc("redeem_referral_code", { p_code: code });
  } catch {
    // silencioso a propósito (ver brief T3): jamás romper el onboarding.
  } finally {
    store.delete(REFERRAL_COOKIE);
  }
}

/**
 * Canje manual desde /ajustes (sección Cuenta): «¿Tienes un código de
 * referido?». A diferencia de redeemFromCookie, este SÍ reporta el error de
 * la EXCEPTION de BD (código inválido, ya tienes uno aplicado, etc.) para
 * mostrarlo con dignidad en el form.
 */
export async function redeemReferralCode(rawCode: string): Promise<RedeemResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autorizado." };

  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, error: "Ingresa un código." };

  try {
    const { error } = await rpcClient(supabase).rpc("redeem_referral_code", { p_code: code });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo aplicar el código." };
  }
}
