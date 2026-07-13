const MAX_BYTES = 5_000_000;
const OK_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export function validateAvatarFile(file: { type: string; size: number }):
  { ok: true } | { ok: false; error: "type" | "size" } {
  if (!OK_TYPES.has(file.type)) return { ok: false, error: "type" };
  if (file.size > MAX_BYTES) return { ok: false, error: "size" };
  return { ok: true };
}

/** Ruta en el bucket `avatars`. El primer segmento DEBE ser el uid (RLS). */
export function avatarPath(userId: string): string {
  return `${userId}/avatar`;
}
