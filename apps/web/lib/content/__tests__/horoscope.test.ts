import { describe, expect, it } from "vitest";
import { ZODIAC_SIGNS } from "@aluna/core";
import {
  HOROSCOPE_SIGNS_ES,
  SOLAR_HOUSE_LABELS_ES,
  composeWesternProse,
  HOROSCOPE_ANIMALS_ES,
  composeEasternProse,
  type EasternProsePayload,
} from "../horoscope-es";
import { HOROSCOPE_SIGNS_EN, SOLAR_HOUSE_LABELS_EN, HOROSCOPE_ANIMALS_EN } from "../horoscope-en";
import type { WesternPayload } from "@/lib/horoscope/western";

const EASTERN_ANIMALS = [
  "rat", "ox", "tiger", "rabbit", "dragon", "snake",
  "horse", "goat", "monkey", "rooster", "dog", "pig",
] as const;

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

describe("bloques de animales", () => {
  it("los 12 animales existen en ambos idiomas con 3 campos no vacíos", () => {
    for (const animal of EASTERN_ANIMALS) {
      for (const dict of [HOROSCOPE_ANIMALS_ES, HOROSCOPE_ANIMALS_EN]) {
        const b = dict[animal];
        expect(b, animal).toBeDefined();
        expect(b!.essence.length).toBeGreaterThan(20);
        expect(b!.flow.length).toBeGreaterThan(20);
        expect(b!.shadow.length).toBeGreaterThan(20);
      }
    }
  });
});

describe("composeEasternProse", () => {
  const BASE: EasternProsePayload = {
    animal: "rat",
    period: "today",
    clash: null,
    harmonies: [],
    taiSui: null,
    monthChange: null,
    toneBalance: "favorable",
  };

  it("devuelve al menos 3 párrafos y nunca 'undefined'", () => {
    const parts = composeEasternProse("es", BASE);
    expect(parts.length).toBeGreaterThanOrEqual(3);
    expect(parts.join(" ")).not.toContain("undefined");
  });

  it("menciona el choque cuando el payload trae clash", () => {
    const withClash: EasternProsePayload = { ...BASE, clash: { withAnimal: "horse" } };
    const parts = composeEasternProse("es", withClash);
    const all = parts.join(" ").toLowerCase();
    expect(all).toContain("choque");
    expect(all).toContain("caballo");
  });

  it("no menciona el choque cuando clash es null", () => {
    const parts = composeEasternProse("es", BASE);
    const all = parts.join(" ").toLowerCase();
    expect(all).not.toContain("choque");
  });

  it("menciona las armonías cuando el payload trae harmonies", () => {
    const withHarmony: EasternProsePayload = { ...BASE, harmonies: ["ox"] };
    const parts = composeEasternProse("es", withHarmony);
    const all = parts.join(" ").toLowerCase();
    expect(all).toContain("armon");
  });

  it("menciona Tai Sui cuando viene en el payload", () => {
    const withTaiSui: EasternProsePayload = { ...BASE, taiSui: [{ kind: "chong" }] };
    const parts = composeEasternProse("es", withTaiSui);
    expect(parts.join(" ").toLowerCase()).toContain("tai sui");
  });

  it("menciona el cambio de mes (節) cuando viene en el payload", () => {
    const withMonthChange: EasternProsePayload = { ...BASE, monthChange: { atIso: "2026-08-07T12:00:00Z" } };
    const parts = composeEasternProse("es", withMonthChange);
    expect(parts.join(" ")).toMatch(/mes|節/);
  });

  it("cierra con flow cuando toneBalance es favorable y con shadow cuando es tense", () => {
    const fav = composeEasternProse("es", { ...BASE, toneBalance: "favorable" });
    const tense = composeEasternProse("es", { ...BASE, toneBalance: "tense" });
    expect(fav[fav.length - 1]).toBe(HOROSCOPE_ANIMALS_ES.rat!.flow);
    expect(tense[tense.length - 1]).toBe(HOROSCOPE_ANIMALS_ES.rat!.shadow);
  });

  it("compone en inglés con la voz del diccionario EN", () => {
    const parts = composeEasternProse("en", { ...BASE, animal: "horse" });
    expect(parts[0]).toBe(HOROSCOPE_ANIMALS_EN.horse!.essence);
  });
});
