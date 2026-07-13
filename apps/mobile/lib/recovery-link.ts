// Supabase manda el enlace de recuperación de contraseña con los tokens de
// sesión en el FRAGMENTO de la URL (flujo implícito — el único que usa este
// proyecto, `flowType` nunca se fija a "pkce" en ningún cliente):
//   aluna://reset-password#access_token=...&refresh_token=...&type=recovery
//
// Dos cosas rompen la auto-detección que sí funciona en la web:
// 1. expo-router DESCARTA el fragmento al resolver la ruta del deep link —
//    ver node_modules/expo-router/build/fork/extractPathFromURL.js,
//    fromDeepLink(): arma el path con `res.host` + `res.pathname` + `res.search`,
//    nunca `res.hash`. useLocalSearchParams() nunca va a ver estos tokens.
// 2. El cliente Supabase de RN corre con `detectSessionInUrl: false` (lib/supabase.ts)
//    y aunque estuviera en true no importaría: en @supabase/auth-js esa
//    auto-detección está gateada por `isBrowser()` (GoTrueClient._initialize),
//    así que jamás se dispara fuera de un browser.
//
// Por eso reset-password.tsx lee la URL cruda con Linking.useLinkingURL() y
// este módulo puro la parsea a mano. Nota importante para quien conecte esto
// con onAuthStateChange: llamar a supabase.auth.setSession({access_token,
// refresh_token}) con el resultado dispara el evento 'SIGNED_IN' (o
// 'TOKEN_REFRESHED' si el access_token ya venció) — NUNCA 'PASSWORD_RECOVERY'.
// Ese evento solo lo emite auth-js desde su propia detección de URL (web-only,
// ver punto 2) o desde verifyOtp()/_exchangeCodeForSession() (flujos OTP/PKCE
// que este proyecto no usa). La señal real de "hay sesión de recovery" en
// móvil es: este parser encontró tokens Y setSession() no devolvió error.

export type RecoveryLinkResult =
  | { status: "tokens"; accessToken: string; refreshToken: string }
  | { status: "error"; description: string | null }
  | { status: "none" };

/** Params de la parte con los datos: el fragmento (`#...`) si existe, si no
 *  la query string (`?...`) — por si algún cliente/proxy lo reescribe. */
function paramsFromUrl(url: string): URLSearchParams | null {
  const hashIndex = url.indexOf("#");
  if (hashIndex >= 0 && hashIndex < url.length - 1) {
    return new URLSearchParams(url.slice(hashIndex + 1));
  }
  const queryIndex = url.indexOf("?");
  if (queryIndex >= 0 && queryIndex < url.length - 1) {
    return new URLSearchParams(url.slice(queryIndex + 1));
  }
  return null;
}

/** Extrae los tokens de sesión (o el error) de un deep link de recovery.
 *  `url` viene tal cual de Linking (Linking.useLinkingURL() / getInitialURL()). */
export function parseRecoveryLink(url: string | null | undefined): RecoveryLinkResult {
  if (!url) return { status: "none" };
  const params = paramsFromUrl(url);
  if (!params) return { status: "none" };

  // Supabase manda `#error=access_denied&error_code=otp_expired&error_description=...`
  // cuando el link ya se usó o venció.
  const errorDescription =
    params.get("error_description") ?? params.get("error_code") ?? params.get("error");
  if (errorDescription) return { status: "error", description: errorDescription };

  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (accessToken && refreshToken) return { status: "tokens", accessToken, refreshToken };

  return { status: "none" };
}
