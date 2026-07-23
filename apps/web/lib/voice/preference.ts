// Preferencia de voz — por DISPOSITIVO, no por cuenta. Las voces instaladas
// (Web Speech API) dependen del navegador/SO donde corre, así que guardarlas
// en localStorage es lo correcto: sincronizarlas a la cuenta apuntaría a una
// voz que quizás no existe en el próximo dispositivo.

const KEY_PREFIX = "aluna:voice:";

/** URI de la voz elegida por el usuario para `locale`, o null si no eligió ninguna
 * (usa el auto-match por idioma). SSR-safe: sin `window`, siempre null. */
export function getPreferredVoiceURI(locale: "es" | "en"): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(KEY_PREFIX + locale);
  } catch {
    return null; // localStorage puede lanzar (Safari privado, cuota, etc.)
  }
}

/** Guarda la voz elegida para `locale`. `uri: null` la borra (vuelve al auto-match). */
export function setPreferredVoiceURI(locale: "es" | "en", uri: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (uri === null) {
      window.localStorage.removeItem(KEY_PREFIX + locale);
    } else {
      window.localStorage.setItem(KEY_PREFIX + locale, uri);
    }
  } catch {
    // dispositivo sin localStorage utilizable: la preferencia simplemente no persiste.
  }
}

/** Voces instaladas que calzan con `locale` ("es"/"en"). SSR-safe: [] en servidor. */
export function listVoices(locale: "es" | "en"): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  return window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith(locale));
}
