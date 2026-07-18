// apps/web/app/(app)/numeros/__tests__/selection.test.ts
import { describe, it, expect } from "vitest";
import { isMobileViewport } from "../selection";
import type { NumSelection } from "../selection";

describe("NumSelection", () => {
  it("tipa el estado del sheet actual y expone el viewport compartido", () => {
    const sel: NumSelection = { kind: "number", labelKey: "lifePath", glossKey: "glossLifePath", trace: { value: 7, steps: [] } as never };
    expect(sel.kind).toBe("number");
    const orig = window.matchMedia;
    window.matchMedia = ((q: string) => ({ matches: false, media: q })) as never;
    expect(isMobileViewport()).toBe(false);
    window.matchMedia = orig;
  });
});
