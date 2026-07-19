import type { AlunaSupabaseClient } from "@aluna/supabase";
import { THEMES, MODES, DEFAULT_THEME, DEFAULT_MODE, type Theme, type Mode } from "./theme/themes";

const LOCALES = ["es", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export type ThemeState = { theme: Theme; mode: Mode; locale: Locale };

export function settingsToThemeState(row: {
  theme?: unknown; light_mode?: unknown; language?: unknown;
}): ThemeState {
  const theme = (THEMES as readonly string[]).includes(row.theme as string) ? (row.theme as Theme) : DEFAULT_THEME;
  const mode = (MODES as readonly string[]).includes(row.light_mode as string) ? (row.light_mode as Mode) : DEFAULT_MODE;
  const locale = (LOCALES as readonly string[]).includes(row.language as string) ? (row.language as Locale) : "es";
  return { theme, mode, locale };
}

export interface IntentMemoryRow {
  /** Json crudo de settings.intent — el llamador lo pasa a parseIntent. */
  intent: unknown;
  /** settings.memory_enabled (0019), default true (`!== false`). */
  memoryEnabled: boolean;
}

/**
 * Lee `settings.intent` + `settings.memory_enabled` (0019) en UNA consulta
 * combinada — pero si esa consulta falla ENTERA (columna `memory_enabled`
 * todavía sin migrar: dev sin 0019 aplicada), degrada a un segundo select con
 * SOLO `intent`, para no perder la línea de intención por una migración
 * pendiente.
 *
 * Hallazgo del review Fable: antes, `select("intent, memory_enabled")` sin
 * este fallback tiraba la fila ENTERA (data=null) cuando la columna no
 * existía — y con ella la intentLine, que antes de 0019 se leía sola con
 * `select("intent")` y sí funcionaba. `memoryEnabled` siempre por defecto
 * `true` (`!== false`) tanto si la columna existe y es null/true, como si se
 * degradó al fallback sin ella — mismo criterio de degradación segura que el
 * resto del sistema de memoria.
 */
export async function fetchIntentAndMemorySettings(
  supabase: AlunaSupabaseClient,
  userId: string,
): Promise<IntentMemoryRow> {
  try {
    const { data, error } = await supabase
      .from("settings")
      .select("intent, memory_enabled")
      .eq("user_id", userId)
      .maybeSingle();
    if (!error) {
      const row = data as { intent: unknown; memory_enabled?: boolean | null } | null;
      return { intent: row?.intent ?? null, memoryEnabled: row?.memory_enabled !== false };
    }
  } catch {
    // cae al fallback de abajo (misma degradación que un error explícito)
  }
  try {
    const { data } = await supabase.from("settings").select("intent").eq("user_id", userId).maybeSingle();
    return { intent: (data as { intent: unknown } | null)?.intent ?? null, memoryEnabled: true };
  } catch {
    return { intent: null, memoryEnabled: true };
  }
}
