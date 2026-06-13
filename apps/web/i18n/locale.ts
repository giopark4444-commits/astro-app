export const SUPPORTED_LOCALES = ["es", "en"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "es";
export const LOCALE_COOKIE = "locale";

/** Resuelve el valor crudo de la cookie a un locale soportado (o el default). */
export function resolveLocale(raw: string | undefined | null): Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(raw ?? "") ? (raw as Locale) : DEFAULT_LOCALE;
}
