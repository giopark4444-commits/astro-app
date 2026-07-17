import { describe, expect, it } from "vitest";
import { buildBackSvg, type BackConfig } from "../back-svg";

const base: BackConfig = { bg: "#1a1a2e", border: "#c9a227", symbol: "enso" };

describe("buildBackSvg", () => {
  it("produces a well-formed SVG string", () => {
    const svg = buildBackSvg(base);
    expect(svg.trim().startsWith("<svg")).toBe(true);
    expect(svg.trim().endsWith("</svg>")).toBe(true);
  });

  it("uses the 350x600 viewBox", () => {
    const svg = buildBackSvg(base);
    expect(svg).toContain('viewBox="0 0 350 600"');
    expect(svg).toContain('width="350"');
    expect(svg).toContain('height="600"');
  });

  it("includes the bg and border colors passed", () => {
    const svg = buildBackSvg({ bg: "#112233", border: "#aabbcc", symbol: "star" });
    expect(svg).toContain("#112233");
    expect(svg).toContain("#aabbcc");
  });

  it("produces distinct markup per symbol", () => {
    const enso = buildBackSvg({ ...base, symbol: "enso" });
    const star = buildBackSvg({ ...base, symbol: "star" });
    const moon = buildBackSvg({ ...base, symbol: "moon" });

    expect(enso).not.toBe(star);
    expect(enso).not.toBe(moon);
    expect(star).not.toBe(moon);

    // enso draws an arc path; star draws 8 radiating lines; moon draws a crescent path.
    expect(enso).toContain("<path");
    expect((star.match(/<line/g) ?? []).length).toBeGreaterThanOrEqual(8);
    expect(moon).toContain("<path");
  });

  it("falls back to a safe default for an invalid symbol", () => {
    // @ts-expect-error intentionally invalid input to test runtime robustness
    const svg = buildBackSvg({ ...base, symbol: "not-a-symbol" });
    expect(svg.trim().startsWith("<svg")).toBe(true);
    expect(svg.trim().endsWith("</svg>")).toBe(true);
    expect(svg).toContain('viewBox="0 0 350 600"');
  });
});
