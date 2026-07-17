// Contenido de "Ayuda y soporte" / "Síguenos" en Ajustes (brief ajustes-web T2).

// TODO-Gio: confirmar dominio/correo real de soporte antes de lanzamiento.
export const SUPPORT_EMAIL = "hola@aluna.app";

export interface SocialLink {
  key: string;
  label: string;
  href: string;
}

// href vacío = TODO Gio (aún no hay cuenta creada); la UI solo renderiza las
// filas con href no vacío y oculta la sección entera si ninguna lo tiene.
export const SOCIAL_LINKS: SocialLink[] = [
  { key: "instagram", label: "Instagram", href: "" },
  { key: "tiktok", label: "TikTok", href: "" },
  { key: "x", label: "X", href: "" },
];
