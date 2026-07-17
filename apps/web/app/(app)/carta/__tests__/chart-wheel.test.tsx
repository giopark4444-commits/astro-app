// apps/web/app/(app)/carta/__tests__/chart-wheel.test.tsx
// R5+: la rueda anima solo bajo `animated` — las líneas de aspecto llevan
// pathLength=1 (requisito de .draw-in, ver globals.css) y la clase draw-in
// solo aparece cuando animated=true. En estático (animated=false, toggles de
// casas/zodiaco tras la primera carga) el markup no debe llevar esas clases.

import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import type { BodyPosition, ChartResult } from "@aluna/core";
import { ChartWheel } from "../chart-wheel";

function body(overrides: Partial<BodyPosition> & { body: string; longitude: number }): BodyPosition {
  return {
    signDegree: 0, degree: 0, minute: 0, second: 0, speed: 1,
    retrograde: false, house: 1, dignity: null, sign: "aries",
    ...overrides,
  };
}

function makeChart(overrides: Partial<ChartResult> = {}): ChartResult {
  return {
    bodies: [
      body({ body: "sun", longitude: 125, sign: "leo", house: 5 }),
      body({ body: "moon", longitude: 95, sign: "cancer", house: 4 }),
      body({ body: "mars", longitude: 15, sign: "aries", house: 1 }),
    ],
    houses: {
      system: "placidus",
      cusps: [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330],
      ascendant: 0,
      midheaven: 270,
    },
    aspects: [
      { a: "sun", b: "moon", aspect: "square", angle: 90, orb: 1.2, applying: true, harmony: "hard" },
      { a: "sun", b: "mars", aspect: "trine", angle: 120, orb: 2.0, applying: false, harmony: "soft" },
    ],
    distribution: {
      elements: { fire: 2, earth: 0, air: 0, water: 1 },
      modalities: { cardinal: 1, fixed: 1, mutable: 1 },
      polarities: { yang: 2, yin: 1 },
      dominantElement: "fire",
      dominantModality: "cardinal",
    },
    patterns: [],
    meta: { julianDayUt: 2451545, julianDayEt: 2451545.0007, utcHour: 12, zodiac: "tropical" },
    ...overrides,
  };
}

const CHART = makeChart();

describe("ChartWheel — ceremonia de aspectos", () => {
  it("animated=true: las líneas de aspecto llevan pathLength=1 y la clase draw-in", () => {
    const { container } = render(<ChartWheel chart={CHART} solar={false} onSelect={vi.fn()} animated />);
    const lines = container.querySelectorAll("g.aspects line, g[class*='aspects'] line");
    expect(lines.length).toBe(CHART.aspects.length);
    lines.forEach((line) => {
      expect(line.getAttribute("pathLength")).toBe("1");
      expect(line.getAttribute("class")).toContain("draw-in");
    });
  });

  it("animated=true: el <svg> lleva data-ceremony y --aspects-delay calculado del ritmo de bodies", () => {
    const { container } = render(<ChartWheel chart={CHART} solar={false} onSelect={vi.fn()} animated />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("data-ceremony")).toBe("");
    // 3 cuerpos: delay 1040 + (3-1)*30 + 440 = 1540ms (WHEEL_CEREMONY de @aluna/core)
    expect(svg.style.getPropertyValue("--aspects-delay")).toBe("1540ms");
  });

  it("animated=false (estático, tras la primera carga): pathLength sigue, sin draw-in ni data-ceremony", () => {
    const { container } = render(<ChartWheel chart={CHART} solar={false} onSelect={vi.fn()} animated={false} />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("data-ceremony")).toBeNull();
    const lines = container.querySelectorAll("g.aspects line, g[class*='aspects'] line");
    expect(lines.length).toBe(CHART.aspects.length);
    lines.forEach((line) => {
      expect(line.getAttribute("pathLength")).toBe("1");
      expect(line.getAttribute("class") ?? "").not.toContain("draw-in");
    });
  });
});
