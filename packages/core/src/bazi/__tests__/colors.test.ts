import { describe, it, expect } from "vitest";
import { WU_XING_COLORS } from "../colors";

describe("WU_XING_COLORS", () => {
  it("matches the byte-identical literals from pilares.module.css / pilares.tsx EL_COLOR today", () => {
    expect(WU_XING_COLORS).toEqual({
      wood: "#7fb069", fire: "#e0795a", earth: "#d4a85f", metal: "#b8b6c8", water: "#7aaae0",
    });
  });
  it("only 'fire' matches the zodiac ELEMENT_INK value — the two domains must stay separate", () => {
    // Regression guard for the "never merge" constraint: earth/water Wu Xing ≠ earth/water zodiac.
    expect(WU_XING_COLORS.earth).not.toBe("#7fb069"); // zodiac earth
    expect(WU_XING_COLORS.water).not.toBe("#9b8fd6"); // zodiac water (ELEMENT_INK, not ELEMENT_FILL)
    expect(WU_XING_COLORS.fire).toBe("#e0795a"); // the one key that DOES agree
  });
});
