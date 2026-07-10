import type { ThemeTokens } from "../theme/tokens";

/**
 * Colores puros del Chip "control" según su estado de selección. Vive aparte de
 * `components/ui.tsx` (que lo re-exporta) porque ese módulo importa react-native
 * y no puede cargarse en el entorno "node" de vitest (ver AGENTS.md / vitest.config.ts:
 * la suite de `lib/` solo cubre lógica pura). Al ser un módulo sin imports de RN,
 * `chipColors` queda testeable de forma aislada.
 */
export function chipColors(
  t: ThemeTokens,
  selected: boolean,
): { bg: string; fg: string; border: string } {
  return selected
    ? { bg: t.acc, fg: t.onAcc, border: t.acc }
    : { bg: "transparent", fg: t.textDim, border: t.accHair };
}
