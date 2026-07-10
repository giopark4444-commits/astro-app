import { describe, it, expect } from "vitest";
// El brief original de esta tarea pedía `import { chipColors } from "../../components/ui"`,
// pero ui.tsx importa react-native (View/Text/StyleSheet/Animated), y el entorno "node"
// de vitest (ver vitest.config.ts) no puede parsear ese paquete — el mismo problema que
// documentó Task 1 con `Platform`. Solución: chipColors vive en el módulo puro
// lib/chip-colors.ts (sin imports de RN); components/ui.tsx lo re-exporta para que las
// pantallas sigan pudiendo importarlo desde "../../components/ui" si lo prefieren.
import { chipColors } from "../chip-colors";
import { makeTokens } from "../../theme/tokens";

describe("chipColors", () => {
  const t = makeTokens("observatory", "dark");
  it("seleccionado: acento pleno con texto onAcc", () => {
    expect(chipColors(t, true)).toEqual({ bg: t.acc, fg: t.onAcc, border: t.acc });
  });
  it("no seleccionado: transparente con borde hairline", () => {
    expect(chipColors(t, false)).toEqual({ bg: "transparent", fg: t.textDim, border: t.accHair });
  });
});
