export type Credentials = { email: string; password: string };
export type AuthErrorCode = "email" | "password";
export type ParseResult = { ok: true; value: Credentials } | { ok: false; error: AuthErrorCode };
export type EmailParseResult = { ok: true; value: string } | { ok: false; error: "email" };

export function parseCredentials(input: { email?: unknown; password?: unknown }): ParseResult {
  const email = String(input.email ?? "").trim();
  const password = String(input.password ?? "");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: "email" };
  if (password.length < 8) return { ok: false, error: "password" };
  return { ok: true, value: { email, password } };
}

export function parseEmail(formData: FormData): EmailParseResult {
  const email = String(formData.get("email") ?? "").trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: "email" };
  return { ok: true, value: email };
}
