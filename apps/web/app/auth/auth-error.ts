// Mapea un código de error/aviso (de la URL) a su clave de traducción en el namespace "auth".
const KEYS: Record<string, string> = {
  email: "errEmail",
  password: "errPassword",
  auth: "errAuth",
  confirm: "confirmEmail",
  reset_sent: "resetLinkSent",
  reset_invalid: "errResetLink",
  reset_ok: "resetSuccess",
};

export function authMessageKey(code: string | undefined | null): string | null {
  return code ? (KEYS[code] ?? null) : null;
}
