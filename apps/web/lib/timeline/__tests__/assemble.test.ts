import { describe, expect, it, beforeAll } from "vitest";
import { assembleTimeline, type TimelineProfile } from "../assemble";
import type { TimelineResult } from "../types";

// Real ephemeris (like returns.test.ts) — no mocks, exercises the actual
// sweph-backed retornos finder + the full 4-system assembly.

const PROFILE: TimelineProfile = {
  birth_date: "1990-03-15",
  birth_time: null,
  time_known: false,
  latitude: 40.4168,
  longitude: -3.7038,
  time_zone: "Europe/Madrid",
  gender: "masculine",
};

const NOW_ISO = "2026-07-18T00:00:00.000Z";

describe("assembleTimeline", () => {
  let result: TimelineResult;
  let wallMs: number;

  beforeAll(() => {
    const t0 = performance.now();
    result = assembleTimeline(PROFILE, NOW_ISO);
    wallMs = performance.now() - t0;
    // eslint-disable-next-line no-console
    console.log(`[assembleTimeline] wall time: ${wallMs.toFixed(0)}ms`);
  });

  it("runs well under the 2s cold target", () => {
    expect(wallMs).toBeLessThan(2000);
  });

  it("spans birth year to current year + 10", () => {
    expect(result.birthYear).toBe(1990);
    expect(result.fromYear).toBe(1990);
    expect(result.toYear).toBe(2036);
    expect(result.todayIso).toBe(NOW_ISO);
  });

  it("has exactly one birth event", () => {
    const births = result.events.filter((e) => e.kind === "birth");
    expect(births.length).toBe(1);
    expect(births[0]!.year).toBe(1990);
    expect(births[0]!.system).toBe("life");
  });

  it("finds at least one saturn-return", () => {
    const saturn = result.events.filter((e) => e.kind === "saturn-return");
    expect(saturn.length).toBeGreaterThanOrEqual(1);
  });

  it("has 9 luck-pillar-change events (one full 大運 sequence)", () => {
    const luck = result.events.filter((e) => e.kind === "luck-pillar-change");
    expect(luck.length).toBe(9);
  });

  it("personal-year-1 recurs roughly every 9 years across the range", () => {
    const py1 = result.events.filter((e) => e.kind === "personal-year-1");
    const expected = (result.toYear - result.birthYear) / 9;
    expect(py1.length).toBeGreaterThanOrEqual(Math.floor(expected) - 1);
    expect(py1.length).toBeLessThanOrEqual(Math.ceil(expected) + 1);
  });

  it("has at least one pinnacle-change", () => {
    const pinnacles = result.events.filter((e) => e.kind === "pinnacle-change");
    expect(pinnacles.length).toBeGreaterThanOrEqual(1);
  });

  it("caps confluences at 3, all in the future (>= current year)", () => {
    const currentYear = 2026;
    const confluences = result.events.filter((e) => e.kind === "confluence");
    expect(confluences.length).toBeLessThanOrEqual(3);
    for (const c of confluences) {
      expect(c.year).toBeGreaterThanOrEqual(currentYear);
    }
  });

  it("is sorted by year ascending", () => {
    for (let i = 1; i < result.events.length; i++) {
      expect(result.events[i]!.year).toBeGreaterThanOrEqual(result.events[i - 1]!.year);
    }
  });

  it("has unique ids", () => {
    const ids = result.events.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
