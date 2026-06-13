export const THEMES = ["observatory", "aurora", "cosmic"] as const;
export const MODES = ["light", "dark", "auto"] as const;

export type Theme = (typeof THEMES)[number];
export type Mode = (typeof MODES)[number];
export type ResolvedMode = "light" | "dark";

export const DEFAULT_THEME: Theme = "observatory";
export const DEFAULT_MODE: Mode = "auto";

/** Resuelve el modo efectivo: 'auto' sigue la preferencia del sistema. */
export function resolveMode(mode: Mode, prefersDark: boolean): ResolvedMode {
  if (mode === "auto") return prefersDark ? "dark" : "light";
  return mode;
}

/** Cicla al siguiente tema (para un botón de "cambiar tema"). */
export function nextTheme(theme: Theme): Theme {
  const i = THEMES.indexOf(theme);
  return THEMES[(i + 1) % THEMES.length]!;
}
