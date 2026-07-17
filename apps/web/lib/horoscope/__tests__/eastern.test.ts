import path from "node:path";
import { describe, expect, it } from "vitest";
import { setEphePath } from "@aluna/ephemeris";
import { dayPillar, EARTHLY_BRANCHES, scoreTone } from "@aluna/core";
import {
  EASTERN_ANIMALS, EASTERN_AREAS, computeEasternHoroscope, cachedEasternHoroscope,
  resolveEasternPeriodRange,
} from "../eastern";

// Los tests corren con cwd apps/web → la carpeta .se1 vive dos niveles arriba.
setEphePath(path.join(process.cwd(), "..", "..", "packages", "ephemeris", "ephe"));

const NOW = "2026-07-13T21:00:00Z"; // lunes 13-jul-2026, 16:00 en Bogotá — año 丙午

describe("resolveEasternPeriodRange", () => {
  it("year = Lichun a Lichun (丙午: 4-feb-2026 04:02 hora China = 3-feb ~20:02 UTC → 4-feb-2027)", () => {
    const r = resolveEasternPeriodRange("year", "utc", NOW);
    expect(r.fromIso.slice(0, 13)).toBe("2026-02-03T20");
    expect(r.toIso.slice(0, 10)).toBe("2027-02-04");
  });
  it("today/week/month usan las mismas anclas de calendario que western", () => {
    const r = resolveEasternPeriodRange("today", "America/Bogota", NOW);
    expect(r.localDate).toBe("2026-07-13");
    expect(r.fromIso.slice(0, 10)).toBe("2026-07-13");
    const w = resolveEasternPeriodRange("week", "America/Bogota", NOW);
    expect(w.fromIso.slice(0, 10)).toBe("2026-07-13"); // lunes
  });
});

describe("frontera Lichun (anti-funa)", () => {
  it("20-ene-2026: el año oriental sigue siendo 乙巳 (serpiente, 2025)", () => {
    const p = computeEasternHoroscope("rat", "today", "utc", "2026-01-20T12:00:00Z");
    expect(p.solarYear).toBe(2025);
    expect(p.pillars.year).toMatchObject({ stem: 1, branch: 5 }); // 乙巳
    expect(p.pillars.year.animal).toBe("snake");
  });
  it("10-feb-2026: ya es 丙午 (caballo)", () => {
    const p = computeEasternHoroscope("rat", "today", "utc", "2026-02-10T12:00:00Z");
    expect(p.solarYear).toBe(2026);
    expect(p.pillars.year).toMatchObject({ stem: 2, branch: 6 }); // 丙午
    expect(p.pillars.year.animal).toBe("horse");
  });
});

describe("tabla Tai Sui del año 丙午 (rama del año = 午)", () => {
  // Tradición: 值 = misma rama, 冲 = rama opuesta (+6), 害 = par de daño 丑午,
  // 自刑 = solo 辰午酉亥 se auto-castigan, 破 = par de ruptura 卯午.
  const EXPECTED: Record<string, string[]> = {
    rat: ["chong"], ox: ["hai"], tiger: [], rabbit: ["po"], dragon: [], snake: [],
    horse: ["zhi", "zixing"], goat: [], monkey: [], rooster: [], dog: [], pig: [],
  };
  for (const animal of EASTERN_ANIMALS) {
    it(`${animal} → [${EXPECTED[animal]!.join(", ") || "—"}]`, () => {
      const p = computeEasternHoroscope(animal, "year", "utc", NOW);
      expect((p.taiSui ?? []).map((h) => h.kind)).toEqual(EXPECTED[animal]);
    });
  }
  it("fuera de la vista año, taiSui es null", () => {
    expect(computeEasternHoroscope("horse", "today", "utc", NOW).taiSui).toBeNull();
  });
});

describe("choque del día", () => {
  it("13-jul-2026 (día 戊子): el caballo está en 冲 con la rama del día", () => {
    const day = dayPillar(2026, 7, 13);
    expect(day.branch).toBe(0); // ancla: rama 子 (rata)
    const clashAnimal = EARTHLY_BRANCHES[day.branch]!.animal;
    const p = computeEasternHoroscope("horse", "today", "America/Bogota", NOW);
    expect(p.pillars.day.branch).toBe(day.branch);
    expect(p.clash).toEqual({ withAnimal: clashAnimal });
    expect(p.interactions.some((h) => h.pillar === "day" && h.type === "clash")).toBe(true);
  });
});

describe("áreas", () => {
  it("exactamente 5 áreas en orden canónico, scores 0-100, tone coherente", () => {
    const p = computeEasternHoroscope("horse", "year", "utc", NOW);
    expect(p.areas.map((a) => a.area)).toEqual([...EASTERN_AREAS]);
    for (const a of p.areas) {
      expect(a.score).toBeGreaterThanOrEqual(0);
      expect(a.score).toBeLessThanOrEqual(100);
      expect(a.tone).toBe(scoreTone(a.score));
    }
  });
  it("los drivers SIEMPRE coinciden con la tabla de interacciones (anti-funa: nunca contradicen)", () => {
    const cases = [["horse", "year"], ["rat", "today"], ["goat", "month"]] as const;
    for (const [animal, period] of cases) {
      const p = computeEasternHoroscope(animal, period, "America/Bogota", NOW);
      const table = new Set(p.interactions.map((h) => `${h.pillar}:${h.type}:${h.withBranch}`));
      for (const area of p.areas) {
        for (const d of area.drivers) {
          expect(table.has(`${d.pillar}:${d.type}:${d.withBranch}`)).toBe(true);
          expect(d.delta).not.toBe(0);
        }
      }
    }
  });
  it("六合 con el año: la cabra en 丙午 lista al caballo en armonías y el driver empuja love", () => {
    const p = computeEasternHoroscope("goat", "year", "utc", NOW);
    expect(p.harmonies).toContain("horse");
    const love = p.areas.find((a) => a.area === "love")!;
    expect(love.drivers.some((d) => d.type === "six_combo" && d.delta > 0)).toBe(true);
  });
  it("sin interacciones el baseline es neutro (~50-60, tone mixed)", () => {
    // 10-jul-2026: día 酉, mes 未, año 午. El tigre (寅) no forma NINGÚN par
    // clásico con esas tres ramas (寅午 es medio trino, que branchPairInteractions
    // no emite par a par — decisión H2 documentada en el motor).
    const p = computeEasternHoroscope("tiger", "today", "utc", "2026-07-10T12:00:00Z");
    expect(dayPillar(2026, 7, 10).branch).toBe(9); // ancla: rama 酉
    expect(p.interactions).toEqual([]);
    for (const a of p.areas) {
      expect(a.score).toBeGreaterThanOrEqual(50);
      expect(a.score).toBeLessThanOrEqual(60);
      expect(a.tone).toBe("mixed");
      expect(a.drivers).toEqual([]);
    }
  });
});

describe("vista año: 節 del rango", () => {
  it("jieDates son múltiplos de 30° en fase Lichun, dentro del rango; monthChange = primer 節", () => {
    const p = computeEasternHoroscope("horse", "year", "utc", NOW);
    expect(p.jieDates.length).toBeGreaterThanOrEqual(11);
    expect(p.jieDates.length).toBeLessThanOrEqual(13);
    for (const j of p.jieDates) {
      const off = (((j.solarLongitude - 315) % 30) + 30) % 30;
      expect(Math.min(off, 30 - off)).toBeLessThan(0.01);
      expect(j.atIso >= p.range.fromIso && j.atIso <= p.range.toIso).toBe(true);
    }
    expect(p.monthChange).toEqual({ atIso: p.jieDates[0]!.atIso });
  });
});

describe("natalHits (capa personal opcional)", () => {
  it("cruza los pilares natales contra los del periodo, par a par", () => {
    const natal = {
      year: { stem: 0, branch: 0 },  // 子 → 冲 con el año 午
      month: { stem: 2, branch: 2 }, // 寅
      day: { stem: 4, branch: 6 },   // 午 → 自刑 con el año 午
    };
    const p = computeEasternHoroscope("horse", "year", "utc", NOW, natal);
    expect(p.natalHits).toBeDefined();
    expect(p.natalHits!.some(
      (h) => h.natalPillar === "year" && h.periodPillar === "year" && h.type === "clash",
    )).toBe(true);
    const q = computeEasternHoroscope("horse", "year", "utc", NOW);
    expect(q.natalHits).toBeUndefined();
  });
});

describe("cachedEasternHoroscope", () => {
  it("misma clave devuelve el MISMO objeto (hit)", () => {
    const a = cachedEasternHoroscope("rat", "today", "America/Bogota", NOW);
    const b = cachedEasternHoroscope("rat", "today", "America/Bogota", "2026-07-13T23:59:00Z");
    expect(b).toBe(a); // misma fecha local → hit
  });
});

describe("determinismo y validación", () => {
  it("mismo input → payload idéntico (sin Date.now ni Math.random)", () => {
    const a = computeEasternHoroscope("dog", "week", "America/Bogota", NOW);
    const b = computeEasternHoroscope("dog", "week", "America/Bogota", NOW);
    expect(b).toEqual(a);
  });
  it("animal inválido lanza", () => {
    expect(() => computeEasternHoroscope("aquarius", "today", "utc", NOW)).toThrow();
  });
  it("tz inválida cae a utc en el payload", () => {
    expect(computeEasternHoroscope("rat", "today", "No/Existe", NOW).tz).toBe("utc");
  });
});
