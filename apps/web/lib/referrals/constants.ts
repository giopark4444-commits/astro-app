// Constantes de referidos compartidas entre lib/referrals/actions.ts ("use
// server" — Next.js SOLO permite exportar funciones async desde un archivo
// así, ninguna constante) y sus tests/consumidores.

/** Cookie httpOnly que guarda el ?ref=CODIGO de la landing/login/signup hasta
 * que el onboarding termine (ver redeemFromCookie en actions.ts). httpOnly:
 * el navegador nunca la lee/toca — solo la escribe/borra el servidor. */
export const REFERRAL_COOKIE = "aluna_ref";
export const REFERRAL_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 días
export const REFERRAL_CODE_RE = /^[A-Z0-9]{4,20}$/;
