// packages/compute/src/__tests__/cache-key.test.ts
import { describe, it, expect } from "vitest";
import { cacheKey } from "../cache-key";
import type { ChartInput } from "@aluna/core";

const BASE: ChartInput = {
  year: 1984, month: 2, day: 5, hour: 9, minute: 0,
  timeZone: "America/Guayaquil", latitude: -0.2167, longitude: -78.5,
};

describe("cacheKey", () => {
  it("produce un hash estable (snapshot del formato de serialización)", () => {
    expect(cacheKey(BASE)).toMatchInlineSnapshot(`"8f3a7837f402ba27b0e7e04c27887ecfe7f56cc427ca08a228fb410324938e2d"`);
  });

  it("rellena defaults: sin opciones == con los defaults explícitos", () => {
    const explicit: ChartInput = {
      ...BASE, houseSystem: "placidus", zodiac: "tropical", nodeType: "true", lilithType: "mean",
    };
    expect(cacheKey(explicit)).toBe(cacheKey(BASE));
  });

  it("cambia con el sistema de casas", () => {
    expect(cacheKey({ ...BASE, houseSystem: "koch" })).not.toBe(cacheKey(BASE));
  });

  it("cambia con un dato de nacimiento (minuto)", () => {
    expect(cacheKey({ ...BASE, minute: 1 })).not.toBe(cacheKey(BASE));
  });

  it("en tropical, la ayanamsha NO afecta la clave", () => {
    expect(cacheKey({ ...BASE, ayanamsha: "fagan_bradley" })).toBe(cacheKey(BASE));
  });

  it("en sidereal, la ayanamsha SÍ afecta la clave", () => {
    const lahiri: ChartInput = { ...BASE, zodiac: "sidereal", ayanamsha: "lahiri" };
    const fagan: ChartInput = { ...BASE, zodiac: "sidereal", ayanamsha: "fagan_bradley" };
    expect(cacheKey(lahiri)).not.toBe(cacheKey(fagan));
  });

  it("sidereal por defecto usa lahiri (clave estable)", () => {
    const implicit: ChartInput = { ...BASE, zodiac: "sidereal" };
    const explicit: ChartInput = { ...BASE, zodiac: "sidereal", ayanamsha: "lahiri" };
    expect(cacheKey(implicit)).toBe(cacheKey(explicit));
  });

  it("el kind cambia la clave (natal vs solar_return)", () => {
    expect(cacheKey(BASE, "solar_return")).not.toBe(cacheKey(BASE, "natal"));
  });

  it("redondea lat/lon a 6 decimales: diferencia sub-micrográdica (7º decimal) NO cambia la clave", () => {
    expect(cacheKey({ ...BASE, latitude: -0.21670001 })).toBe(cacheKey(BASE));
  });

  it("una diferencia en el 6º decimal de lat SÍ cambia la clave", () => {
    expect(cacheKey({ ...BASE, latitude: -0.216701 })).not.toBe(cacheKey(BASE));
  });

  it("cambia con nodeType (true vs mean) y con lilithType (mean vs oscu)", () => {
    expect(cacheKey({ ...BASE, nodeType: "mean" })).not.toBe(cacheKey(BASE));
    expect(cacheKey({ ...BASE, lilithType: "oscu" })).not.toBe(cacheKey(BASE));
  });
});
