import { describe, it, expect } from "vitest";
import { profileToChartInput, isSolarChart } from "../chart";

const base = {
  birth_date: "1990-02-04",
  birth_time: "14:00",
  time_known: true,
  latitude: -2.17,
  longitude: -79.92,
  time_zone: "America/Guayaquil",
};

describe("profileToChartInput", () => {
  it("mapea fecha/hora/lugar conocidos", () => {
    expect(profileToChartInput(base)).toMatchObject({
      year: 1990,
      month: 2,
      day: 4,
      hour: 14,
      minute: 0,
      timeZone: "America/Guayaquil",
      latitude: -2.17,
      longitude: -79.92,
    });
  });

  it("hora desconocida → mediodía local", () => {
    const p = { ...base, birth_time: null, time_known: false };
    const i = profileToChartInput(p);
    expect(i.hour).toBe(12);
    expect(i.minute).toBe(0);
  });

  it("pasa opciones de casas/zodiaco/ayanamsha", () => {
    const i = profileToChartInput(base, { houseSystem: "koch", zodiac: "sidereal", ayanamsha: "lahiri" });
    expect(i.houseSystem).toBe("koch");
    expect(i.zodiac).toBe("sidereal");
    expect(i.ayanamsha).toBe("lahiri");
  });

  it("no fija opciones ausentes (exactOptionalPropertyTypes)", () => {
    const i = profileToChartInput(base);
    expect("houseSystem" in i).toBe(false);
    expect("zodiac" in i).toBe(false);
  });
});

describe("isSolarChart", () => {
  it("true si no se conoce la hora", () => {
    expect(isSolarChart({ time_known: false, birth_time: "14:00" })).toBe(true);
  });
  it("true si birth_time es null aunque time_known sea true", () => {
    expect(isSolarChart({ time_known: true, birth_time: null })).toBe(true);
  });
  it("false con hora conocida", () => {
    expect(isSolarChart({ time_known: true, birth_time: "14:00" })).toBe(false);
  });
});
