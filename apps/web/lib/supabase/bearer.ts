// Sin dependencias (ni next/headers ni supabase-js) a propósito: lo importan
// tanto route-auth.ts (Node) como middleware.ts (Edge), y un import liviano
// evita arrastrar código no-Edge-safe al bundle del middleware.

/** Extrae el token de un header "Authorization: Bearer <token>"; null si no aplica. */
export function parseBearerToken(header: string | null): string | null {
  return header?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || null;
}
