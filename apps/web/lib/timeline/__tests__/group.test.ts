import { describe, expect, it } from "vitest";
import { groupTimelineYears } from "../group";
import type { TimelineEvent } from "../types";

const ev = (over: Partial<TimelineEvent> & Pick<TimelineEvent, "year" | "weight" | "kind">): TimelineEvent => ({
  id: `${over.kind}:${over.year}`,
  system: "life",
  ...over,
});

describe("groupTimelineYears", () => {
  it("marca las décadas de vida aunque no traigan eventos", () => {
    const rows = groupTimelineYears([], { birthYear: 1990, fromYear: 1990, toYear: 2020, todayYear: 2005 });
    const decadeYears = rows.filter((r) => r.isDecade).map((r) => r.year);
    expect(decadeYears).toEqual([1990, 2000, 2010, 2020]);
  });

  it("inserta HOY como su propia fila si el año no tenía nada más", () => {
    const rows = groupTimelineYears([], { birthYear: 1990, fromYear: 1990, toYear: 2020, todayYear: 2013 });
    const today = rows.find((r) => r.year === 2013);
    expect(today?.isToday).toBe(true);
    expect(today?.isFuture).toBe(false);
    const after = rows.find((r) => r.year === 2015);
    expect(after).toBeUndefined(); // año sin eventos ni década ni hoy: no genera fila
  });

  it("HOY queda ordenado entre eventos pasados y futuros", () => {
    const events = [
      ev({ year: 2000, weight: 3, kind: "saturn-return" }),
      ev({ year: 2030, weight: 3, kind: "uranus-opposition" }),
    ];
    const rows = groupTimelineYears(events, { birthYear: 1990, fromYear: 1990, toYear: 2035, todayYear: 2015 });
    const idxPast = rows.findIndex((r) => r.year === 2000);
    const idxToday = rows.findIndex((r) => r.isToday);
    const idxFuture = rows.findIndex((r) => r.year === 2030);
    expect(idxPast).toBeLessThan(idxToday);
    expect(idxToday).toBeLessThan(idxFuture);
    expect(rows.find((r) => r.year === 2030)?.isFuture).toBe(true);
  });

  it("cap de densidad: 1 sola card peso-3 visible, el resto a overflow", () => {
    const events = [
      ev({ year: 2010, weight: 3, kind: "saturn-return" }),
      ev({ year: 2010, weight: 2, kind: "personal-year-1" }),
      ev({ year: 2010, weight: 2, kind: "luck-pillar-change" }),
    ];
    const rows = groupTimelineYears(events, { birthYear: 1990, fromYear: 1990, toYear: 2020, todayYear: 2019 });
    const row = rows.find((r) => r.year === 2010)!;
    expect(row.visible).toHaveLength(1);
    expect(row.visible[0]!.kind).toBe("saturn-return");
    expect(row.overflow).toHaveLength(2);
  });

  it("cap de densidad: 4 eventos peso-2 en un año → 2 visibles + 2 en overflow", () => {
    const events = [
      ev({ year: 2010, weight: 2, kind: "personal-year-1" }),
      ev({ year: 2010, weight: 2, kind: "luck-pillar-change" }),
      ev({ year: 2010, weight: 2, kind: "pinnacle-change" }),
      ev({ year: 2010, weight: 2, kind: "luck-pillar-change", ordinal: 2 }),
    ];
    const rows = groupTimelineYears(events, { birthYear: 1990, fromYear: 1990, toYear: 2020, todayYear: 2019 });
    const row = rows.find((r) => r.year === 2010)!;
    expect(row.visible).toHaveLength(2);
    expect(row.overflow).toHaveLength(2);
  });

  it("los eventos de peso 1 son ticks y nunca cuentan para el cap", () => {
    const events = [
      ev({ year: 2010, weight: 2, kind: "personal-year-1" }),
      ev({ year: 2010, weight: 2, kind: "luck-pillar-change" }),
      ev({ year: 2010, weight: 1, kind: "jupiter-return" }),
      ev({ year: 2010, weight: 1, kind: "annual-clash" }),
    ];
    const rows = groupTimelineYears(events, { birthYear: 1990, fromYear: 1990, toYear: 2020, todayYear: 2019 });
    const row = rows.find((r) => r.year === 2010)!;
    expect(row.visible).toHaveLength(2);
    expect(row.overflow).toHaveLength(0);
    expect(row.ticks).toHaveLength(2);
  });
});
