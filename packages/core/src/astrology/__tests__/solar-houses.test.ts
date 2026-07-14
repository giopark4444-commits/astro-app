import { describe, expect, it } from "vitest";
import {
  solarHouseOf, solarPlacements, signAspectsToSign, scoreLifeAreasBySolarHouse,
  SOLAR_HOUSE_AREAS,
} from "../solar-houses";

describe("solarHouseOf", () => {
  it("una longitud dentro del signo base es casa 1; el siguiente signo, casa 2; con wrap", () => {
    // Acuario = índice 10 → 300°..330°
    expect(solarHouseOf("aquarius", 315)).toBe(1);
    expect(solarHouseOf("aquarius", 335)).toBe(2);  // Piscis
    expect(solarHouseOf("aquarius", 5)).toBe(3);    // Aries (wrap)
    expect(solarHouseOf("aries", 5)).toBe(1);
    expect(solarHouseOf("aries", 355)).toBe(12);    // Piscis para Aries
  });
});

describe("signAspectsToSign", () => {
  it("detecta aspectos mayores por signo (whole-sign)", () => {
    const asps = signAspectsToSign("leo", [
      { body: "saturn", longitude: 310, retrograde: false }, // Acuario → oposición
      { body: "mars", longitude: 15, retrograde: false },    // Aries → trígono
      { body: "venus", longitude: 125, retrograde: false },  // Leo → conjunción
      { body: "moon", longitude: 95, retrograde: false },    // Cáncer → semisextil (menor) NO sale
    ]);
    const byBody = Object.fromEntries(asps.map((a) => [a.body, a]));
    expect(byBody.saturn!.aspect).toBe("opposition");
    expect(byBody.saturn!.harmony).toBe("hard");
    expect(byBody.mars!.aspect).toBe("trine");
    expect(byBody.venus!.aspect).toBe("conjunction");
    expect(byBody.moon).toBeUndefined();
  });
});

describe("scoreLifeAreasBySolarHouse", () => {
  it("benéfico en casa del área sube; maléfico baja; drivers explican", () => {
    const up = scoreLifeAreasBySolarHouse([
      { body: "jupiter", sign: "virgo", house: 2, retrograde: false },
    ]);
    const money = up.find((a) => a.area === "money")!;
    expect(money.score).toBeGreaterThan(50);
    expect(money.drivers[0]).toEqual({ body: "jupiter", house: 2, favorable: true });

    const down = scoreLifeAreasBySolarHouse([
      { body: "saturn", sign: "virgo", house: 10, retrograde: false },
    ]);
    const work = down.find((a) => a.area === "work")!;
    expect(work.score).toBeLessThan(50);
    expect(work.drivers[0]!.favorable).toBe(false);
  });
  it("todas las casas 1..12 están mapeadas a alguna área", () => {
    const covered = new Set(Object.values(SOLAR_HOUSE_AREAS).flat());
    for (let h = 1; h <= 12; h++) expect(covered.has(h)).toBe(true);
  });
  it("sin placements, todo 50/mixed", () => {
    for (const a of scoreLifeAreasBySolarHouse([])) {
      expect(a.score).toBe(50);
      expect(a.tone).toBe("mixed");
    }
  });
});
