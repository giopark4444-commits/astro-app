// Mapea un código de error/aviso (de la URL) a su clave de traducción en el namespace "auth".
const KEYS: Record<string, string> = {
  email: "errEmail",
  password: "errPassword",
  auth: "errAuth",
  confirm: "confirmEmail",
};

export function authMessageKey(code: string | undefined | null): string | null {
  return code ? (KEYS[code] ?? null) : null;
}
