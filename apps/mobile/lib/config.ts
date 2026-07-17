// apps/mobile/lib/config.ts
// Config por entorno. EXPO_PUBLIC_API_URL manda (build/CI); extra.apiUrl es el
// fallback de desarrollo (IP LAN del Mac de Gio — actualizar si cambia de red).
import Constants from "expo-constants";

/** Si la URL apunta a localhost y corremos en un DISPOSITIVO (Expo Go),
 *  "localhost" es el teléfono, no el Mac — las imágenes del tarot y toda la
 *  API fallarían en silencio. Metro ya conoce la IP LAN del Mac (hostUri,
 *  p.ej. "192.168.0.103:8081"): la sustituimos conservando el puerto de la
 *  API. En web/simulador localhost sí es el Mac y hostUri también es
 *  localhost, así que la sustitución es un no-op. */
function resolveLanHost(url: string): string {
  if (!/^https?:\/\/(localhost|127\.0\.0\.1)([:/]|$)/.test(url)) return url;
  const hostUri = Constants.expoConfig?.hostUri;
  const lanHost = hostUri?.split(":")[0];
  if (!lanHost || lanHost === "localhost" || lanHost === "127.0.0.1") return url;
  return url.replace(/localhost|127\.0\.0\.1/, lanHost);
}

export function apiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return resolveLanHost(fromEnv);
  const fromExtra = Constants.expoConfig?.extra?.apiUrl as string | undefined;
  if (!fromExtra) throw new Error("Falta apiUrl (EXPO_PUBLIC_API_URL o expo.extra.apiUrl)");
  return resolveLanHost(fromExtra);
}
