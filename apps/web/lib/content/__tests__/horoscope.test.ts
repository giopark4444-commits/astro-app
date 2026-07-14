import { describe, expect, it } from "vitest";
import { ZODIAC_SIGNS } from "@aluna/core";
import { HOROSCOPE_SIGNS_ES, SOLAR_HOUSE_LABELS_ES, composeWesternProse } from "../horoscope-es";
import { HOROSCOPE_SIGNS_EN, SOLAR_HOUSE_LABELS_EN } from "../horoscope-en";
import type { WesternPayload } from "@/lib/horoscope/western";

const PAYLOAD: WesternPayload = {
  sign: "aquarius", period: "today", tz: "utc",
  range: { fromIso: "2026-07-13T00:00:00Z", toIso: "2026-07-13T23:59:59Z" },
  houses: [{ body: "sun", sign: "cancer", house: 6, retrograde: false }],
  signAspects: [{ body: "saturn", sign: "aries", aspect: "sextile", harmony: "soft" }],
  events: [{ kind: "lunation", atIso: "2026-07-13T10:00:00Z", phase: "full", sign: "capricorn", longitude: 291, eclipse: null }],
  areas: [
    { area: "work", score: 62, tone: "high", drivers: [{ body: "jupiter", house: 10, favorable: true }] },
    { area: "love", score: 41, tone: "mixed", drivers: [{ body: "saturn", house: 7, favorable: false }] },
  ],
};

describe("bloques de signos", () => {
  it("los 12 signos existen en ambos idiomas con 3 campos no vacíos", () => {
    for (const s of ZODIAC_SIGNS) {
      for (const dict of [HOROSCOPE_SIGNS_ES, HOROSCOPE_SIGNS_EN]) {
        const b = dict[s.key];
        expect(b, s.key).toBeDefined();
        expect(b!.essence.length).toBeGreaterThan(20);
        expect(b!.flow.length).toBeGreaterThan(20);
        expect(b!.shadow.length).toBeGreaterThan(20);
      }
    }
  });
  it("las 12 casas solares tienen etiqueta en ambos idiomas", () => {
    for (let h = 1; h <= 12; h++) {
      expect(SOLAR_HOUSE_LABELS_ES[h]!.length).toBeGreaterThan(5);
      expect(SOLAR_HOUSE_LABELS_EN[h]!.length).toBeGreaterThan(5);
    }
  });
});

describe("composeWesternProse", () => {
  it("teje párrafos desde el payload sin inventar: menciona el driver mayor y el evento", () => {
    const parts = composeWesternProse("es", PAYLOAD);
    const all = parts.join(" ");
    expect(parts.length).toBeGreaterThanOrEqual(2);
    expect(all).toContain(SOLAR_HOUSE_LABELS_ES[10]!); // casa del driver más fuerte
    expect(all.toLowerCase()).toContain("luna llena");
    expect(all).not.toContain("undefined");
  });
});
