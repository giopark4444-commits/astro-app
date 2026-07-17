/**
 * Lógica pura del modo Colorido (T1, color-vivo). Vive aparte de
 * `theme-context.tsx` (que lo re-exporta) porque ese módulo importa
 * react-native y no puede cargarse en el entorno "node" de vitest — mismo
 * mecanismo que `chip-colors.ts` con `components/ui.tsx` (ver AGENTS.md /
 * vitest.config.ts).
 */
export type PaletteMode = "gold" | "colorful";

/** Default "gold": cero cambio visual para quien no opta por Colorido. */
export const DEFAULT_PALETTE_MODE: PaletteMode = "gold";

export function isPaletteMode(v: string | null): v is PaletteMode {
  return v === "gold" || v === "colorful";
}
