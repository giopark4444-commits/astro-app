import { describe, it, expect } from "vitest";
import sweph from "sweph";
import { initEphemeris } from "../init";

describe("sweph smoke", () => {
  it("calcula el Sol con archivos de efemérides (sin error)", () => {
    initEphemeris();
    const jd = sweph.utc_to_jd(2020, 1, 25, 15, 35, 0, sweph.constants.SE_GREG_CAL);
    expect(jd.flag).toBe(sweph.constants.OK);
    const [jdEt] = jd.data;
    const flags = sweph.constants.SEFLG_SWIEPH | sweph.constants.SEFLG_SPEED;
    const sun = sweph.calc(jdEt, sweph.constants.SE_SUN, flags);
    expect(sun.flag).toBe(flags); // si difiere, faltan archivos o hubo error
    expect(sun.data[0]).toBeGreaterThanOrEqual(0);
    expect(sun.data[0]).toBeLessThan(360);
  });
});
