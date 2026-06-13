import { describe, it, expect } from "vitest";
import { personalCycles, pinnacles, challenges } from "../cycles";

const GIO = { year: 1984, month: 2, day: 5 };

describe("personalCycles", () => {
  it("año personal 2026 = mes(2)+día(5)+año(2026->10->1) -> 8", () => {
    const c = personalCycles(GIO, { year: 2026, month: 6, day: 13 });
    expect(c.personalYear.value).toBe(8);
  });
});

describe("pinnacles", () => {
  it("produce 4 pináculos con edades, primero termina a 36 - LP(single)", () => {
    const p = pinnacles(GIO); // LP 11 -> single 2 -> primer fin = 34
    expect(p).toHaveLength(4);
    expect(p[0]).toMatchObject({ startAge: 0, endAge: 34 });
    expect(p[1]).toMatchObject({ startAge: 35, endAge: 43 });
    expect(p[3].endAge).toBeNull();
  });
});

describe("challenges", () => {
  it("produce 4 desafíos (valores absolutos de diferencias)", () => {
    const c = challenges(GIO); // m2 d5 y(1984->4): c1=|2-5|=3, c2=|5-4|=1, c3=|3-1|=2, c4=|2-4|=2
    expect(c.map((x) => x.value)).toEqual([3, 1, 2, 2]);
  });
});
