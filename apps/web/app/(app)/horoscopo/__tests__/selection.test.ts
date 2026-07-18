// apps/web/app/(app)/horoscopo/__tests__/selection.test.ts
import { describe, it, expect } from "vitest";
import { isMobileViewport } from "../selection";
import type { HoroscopoSelection } from "../selection";

describe("HoroscopoSelection", () => {
  it("tipa el estado del sheet actual y expone el viewport compartido", () => {
    const sels: HoroscopoSelection[] = [
      { kind: "reading" },
      { kind: "area", area: "work", level: "high", drivers: [{ label: "Júpiter", glossKey: "glossJupiter", glyph: "♃" }] },
      { kind: "term", key: "eclipseSolar" },
    ];
    expect(sels).toHaveLength(3);

    const orig = window.matchMedia;
    window.matchMedia = ((q: string) => ({ matches: false, media: q })) as never;
    expect(isMobileViewport()).toBe(false);
    window.matchMedia = orig;
  });
});
