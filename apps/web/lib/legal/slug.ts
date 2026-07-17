// Mapeo puro slug→documento legal (extraído para poder testearlo sin montar
// la página de Next — brief ajustes-web T3/T5).
import { TERMS_ES, PRIVACY_ES, DISCLAIMER_ES, type LegalDoc } from "@/lib/content/legal-es";
import { TERMS_EN, PRIVACY_EN, DISCLAIMER_EN } from "@/lib/content/legal-en";

export const LEGAL_SLUGS = ["terminos", "privacidad", "descargo"] as const;
export type LegalSlug = (typeof LEGAL_SLUGS)[number];

const DOCS: Record<LegalSlug, Record<"es" | "en", LegalDoc>> = {
  terminos: { es: TERMS_ES, en: TERMS_EN },
  privacidad: { es: PRIVACY_ES, en: PRIVACY_EN },
  descargo: { es: DISCLAIMER_ES, en: DISCLAIMER_EN },
};

export function isLegalSlug(slug: string): slug is LegalSlug {
  return (LEGAL_SLUGS as readonly string[]).includes(slug);
}

/** null si el slug no existe — el caller decide notFound(). */
export function getLegalDoc(slug: string, locale: string): LegalDoc | null {
  if (!isLegalSlug(slug)) return null;
  return DOCS[slug][locale === "en" ? "en" : "es"];
}
