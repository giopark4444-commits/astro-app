import { describe, it, expect } from "vitest";
import { makeTokens, fonts, type as typeScale, THEMES } from "../../theme/tokens";

describe("tokens del rediseño R1", () => {
  it("expone las 8 variantes de fuente de marca (sin pesos sintetizados)", () => {
    expect(fonts.serif).toBe("CormorantGaramond_500Medium");
    expect(fonts.serifItalic).toBe("CormorantGaramond_500Medium_Italic");
    expect(fonts.serifSemi).toBe("CormorantGaramond_600SemiBold");
    expect(fonts.serifBold).toBe("CormorantGaramond_700Bold");
    expect(fonts.sans).toBe("Quicksand_400Regular");
    expect(fonts.sansMedium).toBe("Quicksand_500Medium");
    expect(fonts.sansSemi).toBe("Quicksand_600SemiBold");
    expect(fonts.sansBold).toBe("Quicksand_700Bold");
  });
  it("expone la escala tipográfica del SPEC", () => {
    // lg2:19 = el paso de "énfasis/voz/lectura" de la regla de 4 tamaños de Gio
    // (13/15/19/24), añadido por el build movil-astros-mockups (T1).
    expect(typeScale).toEqual({ xs2: 11, xs: 12, sm: 13, md: 15, lg: 17, lg2: 19, xl: 20, xl2: 24, xl3: 32, displaySm: 44, display: 60 });
  });
  it("bgGlow, glass y accText existen en las 6 paletas", () => {
    for (const theme of THEMES) {
      for (const mode of ["light", "dark"] as const) {
        const t = makeTokens(theme, mode);
        expect(t.bgGlow, `${theme}/${mode}`).toBeTruthy();
        expect(t.glass, `${theme}/${mode}`).toBeTruthy();
        expect(t.accText, `${theme}/${mode}`).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });
});
