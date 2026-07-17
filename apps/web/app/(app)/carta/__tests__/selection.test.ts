import { describe, it, expect } from "vitest";
import type { Selection } from "../selection";
import { SIGN_GLYPH, PLANET_GLYPH } from "../glyphs";

describe("Selection", () => {
  it("discrimina por kind (compila y estrecha)", () => {
    const sels: Selection[] = [
      { kind: "core" },
      { kind: "body", body: { body: "sun", sign: "aquarius", degree: 15, minute: 57, second: 0, house: 11, dignity: null, retrograde: false, speed: 1.01, longitude: 315.95 } as never },
      { kind: "aspect", aspect: { a: "sun", b: "moon", aspect: "trine", orb: 1.2, applying: true, harmony: "soft" } as never },
      { kind: "house", house: 7 },
      { kind: "sign", sign: "aquarius" },
      { kind: "pattern", pattern: { type: "stellium", bodies: ["sun", "mercury", "venus"] } },
      { kind: "ascendant", sign: "pisces", degree: 26, minute: 6 },
    ];
    expect(sels).toHaveLength(7);
  });
});

describe("glifos compartidos", () => {
  it("cubre los 12 signos y los planetas", () => {
    expect(SIGN_GLYPH.aquarius).toBeTruthy();
    expect(Object.keys(SIGN_GLYPH)).toHaveLength(12);
    expect(PLANET_GLYPH.sun).toBeTruthy();
  });
});
