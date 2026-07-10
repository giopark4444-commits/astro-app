// apps/mobile/lib/config.ts
// Config por entorno. EXPO_PUBLIC_API_URL manda (build/CI); extra.apiUrl es el
// fallback de desarrollo (IP LAN del Mac de Gio — actualizar si cambia de red).
import Constants from "expo-constants";

export function apiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv;
  const fromExtra = Constants.expoConfig?.extra?.apiUrl as string | undefined;
  if (!fromExtra) throw new Error("Falta apiUrl (EXPO_PUBLIC_API_URL o expo.extra.apiUrl)");
  return fromExtra;
}
