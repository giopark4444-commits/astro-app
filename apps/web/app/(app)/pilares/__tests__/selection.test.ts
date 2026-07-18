// apps/web/app/(app)/pilares/__tests__/selection.test.ts
import { describe, it, expect } from "vitest";
import type { PilarSelection } from "../selection";
import { isMobileViewport } from "../selection";

describe("PilarSelection", () => {
  it("discrimina por kind (compila y estrecha)", () => {
    const sels: PilarSelection[] = [
      { kind: "reading" },
      { kind: "pillar", which: "day", pillar: { stem: 0, branch: 0 } as never },
      { kind: "element", element: "wood", count: 3 },
      { kind: "decade", glyph: "甲子", god: "peer", nayinLabel: "Oro en el mar", startYear: 1998, startAge: 8 },
      { kind: "term", key: "bazi.term.daymaster" },
    ];
    expect(sels).toHaveLength(5);
  });

  it("isMobileViewport es ejecutable y devuelve boolean (runtime real, no solo tipos)", () => {
    const orig = window.matchMedia;
    window.matchMedia = ((q: string) => ({ matches: true, media: q })) as never;
    expect(isMobileViewport()).toBe(true);
    window.matchMedia = orig;
  });
});
