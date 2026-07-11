import { describe, it, expect } from "vitest";
import { ELEMENT_INK, ELEMENT_FILL, ASPECT_COLORS } from "../colors";

describe("ELEMENT_INK / ELEMENT_FILL / ASPECT_COLORS", () => {
  it("match the byte-identical literals from wheel-colors.ts / ChartWheel.tsx today", () => {
    expect(ELEMENT_INK).toEqual({
      fire: "#e0795a", earth: "#7fb069", air: "#7aaae0", water: "#9b8fd6",
    });
    expect(ELEMENT_FILL).toEqual({
      fire: "rgba(224,121,90,0.12)", earth: "rgba(127,176,105,0.12)",
      air: "rgba(122,170,224,0.12)", water: "rgba(150,140,214,0.12)",
    });
    expect(ASPECT_COLORS).toEqual({
      hard: "rgba(224,121,90,0.55)", soft: "rgba(122,170,224,0.5)", neutral: "rgba(231,201,134,0.4)",
    });
  });
});
