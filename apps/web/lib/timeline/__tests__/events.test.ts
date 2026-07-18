import { describe, expect, it } from "vitest";
import {
  lifePath,
  personalCycles,
  pinnacles,
  reduce,
  yearPillar,
  monthPillar,
  dayPillar,
  annualPillars,
  luckPillars,
  type BirthDate,
  type PillarSet,
  type LuckInput,
} from "@aluna/core";
import {
  numerologyEvents,
  baziEvents,
  confluenceEvents,
  mergeTimeline,
} from "../events";
import type { TimelineEvent } from "../types";

const BIRTH: BirthDate = { year: 1990, month: 3, day: 15 };

describe("numerologyEvents — personal-year-1 cadence", () => {
  it("recurs every 9 years across the range", () => {
    const events = numerologyEvents(BIRTH, 1990, 2060).filter(
      (e) => e.kind === "personal-year-1",
    );
    expect(events.length).toBeGreaterThan(3);
    const years = events.map((e) => e.year);
    for (let i = 1; i < years.length; i++) {
      expect(years[i]! - years[i - 1]!).toBe(9);
    }
    for (const e of events) {
      expect(e.system).toBe("numerology");
      expect(e.weight).toBe(2);
      expect(e.id).toBe(`numerology:personal-year-1:${e.year}`);
      const py = personalCycles(BIRTH, { year: e.year, month: 1, day: 1 }).personalYear.value;
      expect(py).toBe(1);
    }
  });

  it("only includes years within [fromYear, toYear]", () => {
    const events = numerologyEvents(BIRTH, 2000, 2010).filter(
      (e) => e.kind === "personal-year-1",
    );
    for (const e of events) {
      expect(e.year).toBeGreaterThanOrEqual(2000);
      expect(e.year).toBeLessThanOrEqual(2010);
    }
  });
});

describe("numerologyEvents — pinnacle-change age→year conversion", () => {
  it("matches the manual firstEnd computation for a known birth", () => {
    const firstEnd = 36 - reduce(lifePath(BIRTH).value, { preserveMasters: false });
    const all = pinnacles(BIRTH);
    const expectedYears = [
      BIRTH.year + all[1]!.startAge, // p2 starts at firstEnd+1
      BIRTH.year + all[2]!.startAge, // p3 starts at firstEnd+10
      BIRTH.year + all[3]!.startAge, // p4 starts at firstEnd+19
    ];
    expect(all[1]!.startAge).toBe(firstEnd + 1);
    expect(all[2]!.startAge).toBe(firstEnd + 10);
    expect(all[3]!.startAge).toBe(firstEnd + 19);

    const events = numerologyEvents(BIRTH, 1990, 2100).filter(
      (e) => e.kind === "pinnacle-change",
    );
    expect(events.map((e) => e.year)).toEqual(expectedYears);
    for (const e of events) {
      expect(e.system).toBe("numerology");
      expect(e.weight).toBe(2);
      expect(typeof e.ordinal).toBe("number");
      expect(e.meta?.pinnacleValue).toBeTypeOf("number");
      expect(e.id).toBe(`numerology:pinnacle-change:${e.year}:${e.ordinal}`);
    }
  });
});

describe("baziEvents — luck-pillar-change + annual-clash", () => {
  // Fixture natal PillarSet built from core's pure functions (no ephemeris):
  // day pillar is real calendar math; month pillar uses an arbitrary but fixed
  // sun-longitude value since we're only testing OUR derivation logic, not
  // core's astronomical correctness (that's covered by core's own test suite).
  const year = yearPillar(1990);
  const month = monthPillar(year.stem, 354);
  const day = dayPillar(1990, 3, 15);
  const pillars: PillarSet = { year, month, day };

  const luckInput: LuckInput = {
    pillars,
    gender: "masculine",
    birthYear: 1990,
    daysToPrevJie: 20,
    daysToNextJie: 10,
  };
  const [luck] = luckPillars(luckInput);

  it("emits one luck-pillar-change per LuckPillarItem", () => {
    const events = baziEvents(luck!, [], BIRTH.month);
    const changes = events.filter((e) => e.kind === "luck-pillar-change");
    expect(changes.length).toBe(luck!.pillars.length);
    changes.forEach((e, i) => {
      const item = luck!.pillars[i]!;
      expect(e.year).toBe(item.startYear);
      expect(e.weight).toBe(2);
      expect(e.ordinal).toBe(i + 1);
      expect(e.system).toBe("bazi");
      expect(e.meta?.tenGod).toBe(item.tenGod);
      expect(e.meta?.startAge).toBe(item.startAge);
      expect(e.id).toBe(`bazi:luck-pillar-change:${item.startYear}:${i + 1}`);
    });
  });

  it("emits annual-clash only for years whose annual branch clashes vs the DAY branch, cadence ~12y", () => {
    const annual = annualPillars(pillars, 1990, 60);
    const events = baziEvents(luck!, annual, BIRTH.month);
    const clashes = events.filter((e) => e.kind === "annual-clash");
    expect(clashes.length).toBeGreaterThan(1);

    const years = clashes.map((e) => e.year);
    for (let i = 1; i < years.length; i++) {
      expect(years[i]! - years[i - 1]!).toBe(12);
    }
    for (const e of clashes) {
      expect(e.weight).toBe(1);
      expect(e.system).toBe("bazi");
      expect(e.id).toBe(`bazi:annual-clash:${e.year}`);
    }

    // Cross-check against the raw annual marks directly.
    const expectedYears = annual
      .filter((a) => a.marks.some((m) => m.type === "clash" && m.vs === "day"))
      .map((a) => a.year);
    expect(years).toEqual(expectedYears);
  });

  it("flags lichunAmbiguous when birth month is January or February", () => {
    const eventsJan = baziEvents(luck!, [], 1);
    const eventsFeb = baziEvents(luck!, [], 2);
    const eventsMar = baziEvents(luck!, [], 3);
    for (const e of eventsJan) expect(e.meta?.lichunAmbiguous).toBe(true);
    for (const e of eventsFeb) expect(e.meta?.lichunAmbiguous).toBe(true);
    for (const e of eventsMar) expect(e.meta?.lichunAmbiguous).toBeUndefined();
  });
});

describe("confluenceEvents", () => {
  const make = (kind: TimelineEvent["kind"], year: number): TimelineEvent => ({
    id: `x:${kind}:${year}`,
    year,
    system: "life",
    kind,
    weight: 1,
  });

  it("detects years where >=2 tracked kinds coincide, only in the future, capped at 3, earliest first", () => {
    const events: TimelineEvent[] = [
      // past coincidence (2010) — must be excluded even though it matches
      make("jupiter-return", 2010),
      make("personal-year-1", 2010),
      // future coincidences
      make("jupiter-return", 2030),
      make("personal-year-1", 2030),
      make("jupiter-return", 2035),
      make("luck-pillar-change", 2035),
      make("personal-year-1", 2040),
      make("luck-pillar-change", 2040),
      make("jupiter-return", 2045), // only 1 kind this year — not a confluence
      // a 4th qualifying future year to verify the cap
      make("jupiter-return", 2050),
      make("personal-year-1", 2050),
    ];
    const result = confluenceEvents(events, 2026, 2060);
    expect(result.length).toBe(3);
    expect(result.map((e) => e.year)).toEqual([2030, 2035, 2040]);
    for (const e of result) {
      expect(e.system).toBe("life");
      expect(e.kind).toBe("confluence");
      expect(e.weight).toBe(2);
      expect(e.id).toBe(`life:confluence:${e.year}`);
      expect(typeof e.meta?.signals).toBe("string");
    }
  });

  it("returns nothing when there are fewer than 2 matches in any future year", () => {
    const events: TimelineEvent[] = [make("jupiter-return", 2030), make("saturn-return", 2030)];
    expect(confluenceEvents(events, 2026, 2060)).toEqual([]);
  });
});

describe("mergeTimeline", () => {
  it("flattens, dedupes by id, and sorts by year asc, weight desc, id asc", () => {
    const a: TimelineEvent[] = [
      { id: "life:birth:1990", year: 1990, system: "life", kind: "birth", weight: 3 },
      { id: "numerology:personal-year-1:2026", year: 2026, system: "numerology", kind: "personal-year-1", weight: 2 },
    ];
    const b: TimelineEvent[] = [
      { id: "bazi:annual-clash:2026", year: 2026, system: "bazi", kind: "annual-clash", weight: 1 },
      // duplicate id — should be deduped, first occurrence wins
      { id: "life:birth:1990", year: 1990, system: "life", kind: "birth", weight: 3, meta: { dup: true } },
      { id: "astro:jupiter-return:2000", year: 2000, system: "astro", kind: "jupiter-return", weight: 1 },
    ];
    const merged = mergeTimeline([a, b]);
    expect(merged.map((e) => e.id)).toEqual([
      "life:birth:1990",
      "astro:jupiter-return:2000",
      "numerology:personal-year-1:2026",
      "bazi:annual-clash:2026",
    ]);
    expect(merged.find((e) => e.id === "life:birth:1990")!.meta).toBeUndefined();
  });
});
