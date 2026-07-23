// Lado CLIENTE del toggle premium ✨ (Task 8): encendido/apagado por
// dispositivo en localStorage — mismo patrón que lib/voice-mode.ts, sin
// migración de BD. El chat lo lee/escribe con getPremiumEnabled()/
// setPremiumEnabled(); otros componentes que arman su propio fetch (las
// lentes, Task 6) leen el MISMO valor con el alias readPremiumFlagForRequest()
// — mismo dato, nombre que expresa intención en ese call-site ("¿mando
// premium:true en este request?") en vez del nombre orientado a UI de toggle.
const KEY = "aluna:premium";

/** SSR-safe: en el server (sin `window`) siempre false. */
export function getPremiumEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setPremiumEnabled(on: boolean): void {
  try {
    window.localStorage.setItem(KEY, on ? "1" : "0");
  } catch {
    /* sin storage (Safari privado): la elección vive solo esta visita */
  }
}

/** Alias documentado de getPremiumEnabled(): mismo valor, para call-sites
 *  (p. ej. las lentes) que arman su propio fetch a /api/chat y quieren
 *  preguntar "¿mando premium:true?" en vez de leer un getter de UI. */
export function readPremiumFlagForRequest(): boolean {
  return getPremiumEnabled();
}
