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
