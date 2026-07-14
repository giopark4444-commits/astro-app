import { describe, expect, it } from "vitest";
import { parseHoroscopeReading, factsBlock } from "../parse";

describe("parseHoroscopeReading", () => {
  it("extrae {reading} de un stream con ruido alrededor", () => {
    expect(parseHoroscopeReading('bla {"reading":"El cielo te pide raíz."} fin'))
      .toEqual({ reading: "El cielo te pide raíz." });
  });
  it("null si falta el campo o el JSON está roto", () => {
    expect(parseHoroscopeReading('{"otra":"cosa"}')).toBeNull();
    expect(parseHoroscopeReading("nada")).toBeNull();
  });
});

describe("factsBlock", () => {
  it("lista casas, eventos y áreas en líneas planas (sin JSON)", () => {
    const txt = factsBlock("es", {
      sign: "leo", period: "week", tz: "utc",
      range: { fromIso: "2026-07-13T00:00:00Z", toIso: "2026-07-19T23:59:59Z" },
      houses: [{ body: "mars", sign: "virgo", house: 2, retrograde: false }],
      signAspects: [],
      events: [{ kind: "station", atIso: "2026-07-18T03:00:00Z", body: "mercury", direction: "retrograde", sign: "leo" }],
      areas: [{ area: "money", score: 44, tone: "mixed", drivers: [{ body: "mars", house: 2, favorable: false }] }],
    });
    expect(txt).toContain("Marte");
    expect(txt).toContain("casa 2");
    expect(txt.toLowerCase()).toContain("retrógrado");
    expect(txt).not.toContain("{");
  });
});
