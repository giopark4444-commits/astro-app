// apps/web/lib/share/__tests__/resolve-insight.test.ts
// Igualdad EXACTA contra las fuentes de contenido reales — nunca contra un
// string reescrito a mano en el test (si el contenido cambia, el test lo nota).
import { describe, expect, it } from "vitest";
import { DAY_MASTER_VOICE, HEAVENLY_STEMS, TAROT_CARDS_ES, TAROT_CARDS_EN } from "@aluna/core";
import { NUMBER_MEANINGS_ES } from "../../content/numerology-es";
import { NUMBER_MEANINGS_EN } from "../../content/numerology-en";
import { SUN_FRAGMENT as SUN_ES, MOON_FRAGMENT as MOON_ES, ASC_FRAGMENT as ASC_ES } from "../../content/core-reading-es";
import { MOON_FRAGMENT as MOON_EN } from "../../content/core-reading-en";
import { HOROSCOPE_SIGNS_ES } from "../../content/horoscope-es";
import { HOROSCOPE_SIGNS_EN } from "../../content/horoscope-en";
import { resolveInsight } from "../resolve-insight";
import type { ShareCardParams } from "../types";

const COMMON = { format: "story", theme: "observatory", detail: true } as const;

function stemOf(key: string) {
  const stem = HEAVENLY_STEMS.find((s) => s.key === key);
  if (!stem) throw new Error(`stem desconocido: ${key}`);
  return stem;
}

describe("resolveInsight — numeros", () => {
  it("ES: número simple (no maestro) — quote == NUMBER_MEANINGS_ES[n].essence", () => {
    const params: ShareCardParams = { lens: "numeros", number: 1, labelKey: "lifePath", locale: "es", ...COMMON };
    const insight = resolveInsight(params);
    expect(insight.quote).toBe(NUMBER_MEANINGS_ES[1]!.essence);
    expect(insight.eyebrow).toBe("CAMINO DE VIDA");
    expect(insight.glyph).toEqual({ kind: "number", value: "1" });
    expect(insight.chips).toEqual([]);
  });

  it("EN: número simple — quote == NUMBER_MEANINGS_EN[n].essence, eyebrow por labelKey", () => {
    const params: ShareCardParams = { lens: "numeros", number: 1, labelKey: "soulUrge", locale: "en", ...COMMON };
    const insight = resolveInsight(params);
    expect(insight.quote).toBe(NUMBER_MEANINGS_EN[1]!.essence);
    expect(insight.eyebrow).toBe("SOUL URGE");
  });

  it("ES: número maestro (11) trae el chip de número maestro", () => {
    const params: ShareCardParams = { lens: "numeros", number: 11, labelKey: "expression", locale: "es", ...COMMON };
    const insight = resolveInsight(params);
    expect(insight.eyebrow).toBe("EXPRESIÓN");
    expect(insight.chips).toEqual(["NÚMERO MAESTRO"]);
    expect(insight.glyph).toEqual({ kind: "number", value: "11" });
  });

  it("EN: número maestro (22) trae el chip localizado", () => {
    const params: ShareCardParams = { lens: "numeros", number: 22, labelKey: "maturity", locale: "en", ...COMMON };
    const insight = resolveInsight(params);
    expect(insight.chips).toEqual(["MASTER NUMBER"]);
  });

  it("numeros no define title", () => {
    const params: ShareCardParams = { lens: "numeros", number: 3, labelKey: "birthday", locale: "es", ...COMMON };
    const insight = resolveInsight(params);
    expect(insight.title).toBeUndefined();
  });
});

describe("resolveInsight — carta", () => {
  it("ES sol en Leo: title, quote capitalizada+punto, chips elemento+modalidad", () => {
    const params: ShareCardParams = { lens: "carta", body: "sun", sign: "leo", locale: "es", ...COMMON };
    const insight = resolveInsight(params);
    expect(insight.title).toBe("Sol en Leo");
    const raw = SUN_ES.leo!;
    expect(raw.endsWith(".")).toBe(false); // fuente en minúscula sin punto, confirma que el test capitaliza de verdad
    expect(insight.quote).toBe(`${raw[0]!.toUpperCase()}${raw.slice(1)}.`);
    // "chart" (no "zodiac"): la lente carta pinta la rueda natal decorativa de
    // chart-motif.tsx — value = body, sign = signo del sector donde va el foco.
    expect(insight.glyph).toEqual({ kind: "chart", value: "sun", sign: "leo" });
    expect(insight.chips).toEqual(["Fuego", "Fijo"]);
  });

  it("ES luna en Cáncer", () => {
    const params: ShareCardParams = { lens: "carta", body: "moon", sign: "cancer", locale: "es", ...COMMON };
    const insight = resolveInsight(params);
    expect(insight.title).toBe("Luna en Cáncer");
    const raw = MOON_ES.cancer!;
    expect(insight.quote).toBe(`${raw[0]!.toUpperCase()}${raw.slice(1)}.`);
    expect(insight.glyph).toEqual({ kind: "chart", value: "moon", sign: "cancer" });
    expect(insight.chips).toEqual(["Agua", "Cardinal"]);
  });

  it("ES ascendente Escorpio: title sin 'en'", () => {
    const params: ShareCardParams = { lens: "carta", body: "asc", sign: "scorpio", locale: "es", ...COMMON };
    const insight = resolveInsight(params);
    expect(insight.title).toBe("Ascendente Escorpio");
    const raw = ASC_ES.scorpio!;
    expect(insight.quote).toBe(`${raw[0]!.toUpperCase()}${raw.slice(1)}.`);
    expect(insight.eyebrow).toBe("ASCENDENTE");
    expect(insight.glyph).toEqual({ kind: "chart", value: "asc", sign: "scorpio" });
  });

  it("EN moon in Cancer", () => {
    const params: ShareCardParams = { lens: "carta", body: "moon", sign: "cancer", locale: "en", ...COMMON };
    const insight = resolveInsight(params);
    expect(insight.title).toBe("Moon in Cancer");
    const raw = MOON_EN.cancer!;
    expect(insight.quote).toBe(`${raw[0]!.toUpperCase()}${raw.slice(1)}.`);
    expect(insight.eyebrow).toBe("MOON");
    expect(insight.glyph).toEqual({ kind: "chart", value: "moon", sign: "cancer" });
  });
});

describe("resolveInsight — pilares", () => {
  it("ES jia: split título/quote de DAY_MASTER_VOICE, hanzi, chips elemento+yang", () => {
    const params: ShareCardParams = { lens: "pilares", dayStem: "jia", locale: "es", ...COMMON };
    const insight = resolveInsight(params);
    const voice = DAY_MASTER_VOICE.jia!.es;
    const [rawTitle, ...restParts] = voice.split(":");
    const rest = restParts.join(":").trim();
    expect(insight.title).toBe(rawTitle!.trim());
    expect(insight.quote).toBe(`${rest[0]!.toUpperCase()}${rest.slice(1)}`);
    expect(insight.glyph).toEqual({ kind: "hanzi", value: stemOf("jia").hanzi });
    expect(insight.chips).toEqual(["Madera", "yang"]);
  });

  it("EN gui: yin polarity, water element", () => {
    const params: ShareCardParams = { lens: "pilares", dayStem: "gui", locale: "en", ...COMMON };
    const insight = resolveInsight(params);
    const voice = DAY_MASTER_VOICE.gui!.en;
    const [rawTitle, ...restParts] = voice.split(":");
    const rest = restParts.join(":").trim();
    expect(insight.title).toBe(rawTitle!.trim());
    expect(insight.quote).toBe(`${rest[0]!.toUpperCase()}${rest.slice(1)}`);
    expect(insight.glyph).toEqual({ kind: "hanzi", value: stemOf("gui").hanzi });
    expect(insight.chips).toEqual(["Water", "Yin"]);
  });

  it("eyebrow es fijo (Maestro del Día / Day Master)", () => {
    const es = resolveInsight({ lens: "pilares", dayStem: "bing", locale: "es", ...COMMON });
    const en = resolveInsight({ lens: "pilares", dayStem: "bing", locale: "en", ...COMMON });
    expect(es.eyebrow).toBe("MAESTRO DEL DÍA");
    expect(en.eyebrow).toBe("DAY MASTER");
  });
});

describe("resolveInsight — tarot", () => {
  it("ES derecha: title/quote == TAROT_CARDS_ES.fool, chips = 3 keywords en mayúsculas", () => {
    const params: ShareCardParams = {
      lens: "tarot", cardId: "fool", reversed: false, locale: "es", ...COMMON,
    };
    const insight = resolveInsight(params);
    const card = TAROT_CARDS_ES.fool!;
    expect(insight.title).toBe(card.name);
    expect(insight.quote).toBe(card.essence);
    expect(insight.glyph).toEqual({ kind: "tarot", value: "fool" });
    expect(insight.chips).toEqual(card.keywords.slice(0, 3).map((k) => k.toUpperCase()));
  });

  it("ES invertida: INVERTIDA va primero en los chips, quote == reversed.path (no essence)", () => {
    const params: ShareCardParams = {
      lens: "tarot", cardId: "fool", reversed: true, locale: "es", ...COMMON,
    };
    const insight = resolveInsight(params);
    const card = TAROT_CARDS_ES.fool!;
    expect(insight.chips).toEqual(["INVERTIDA", ...card.keywords.slice(0, 3).map((k) => k.toUpperCase())]);
    expect(insight.quote).toBe(card.reversed.path);
    expect(insight.quote).not.toBe(card.essence);
  });

  it("EN invertida: REVERSED va primero, quote == reversed.path (no essence)", () => {
    const params: ShareCardParams = {
      lens: "tarot", cardId: "magician", reversed: true, locale: "en", ...COMMON,
    };
    const insight = resolveInsight(params);
    const card = TAROT_CARDS_EN.magician!;
    expect(insight.title).toBe(card.name);
    expect(insight.quote).toBe(card.reversed.path);
    expect(insight.quote).not.toBe(card.essence);
    expect(insight.chips).toEqual(["REVERSED", ...card.keywords.slice(0, 3).map((k) => k.toUpperCase())]);
  });

  it("ES derecha: quote == essence (no reversed.path)", () => {
    const params: ShareCardParams = {
      lens: "tarot", cardId: "moon", reversed: false, locale: "es", ...COMMON,
    };
    const insight = resolveInsight(params);
    const card = TAROT_CARDS_ES.moon!;
    expect(insight.quote).toBe(card.essence);
    expect(insight.quote).not.toBe(card.reversed.path);
  });

  it("EN derecha: quote == essence (no reversed.path)", () => {
    const params: ShareCardParams = {
      lens: "tarot", cardId: "moon", reversed: false, locale: "en", ...COMMON,
    };
    const insight = resolveInsight(params);
    const card = TAROT_CARDS_EN.moon!;
    expect(insight.quote).toBe(card.essence);
    expect(insight.quote).not.toBe(card.reversed.path);
  });
});

describe("resolveInsight — horoscopo", () => {
  it("ES: eyebrow HOY, title = nombre del signo, quote == HOROSCOPE_SIGNS_ES[sign].essence", () => {
    const params: ShareCardParams = { lens: "horoscopo", sign: "leo", locale: "es", ...COMMON };
    const insight = resolveInsight(params);
    expect(insight.eyebrow).toBe("HOY");
    expect(insight.title).toBe("Leo");
    expect(insight.quote).toBe(HOROSCOPE_SIGNS_ES.leo!.essence);
    expect(insight.glyph).toEqual({ kind: "zodiac", value: "leo" });
    expect(insight.chips).toEqual([]);
  });

  it("EN: eyebrow TODAY, quote == HOROSCOPE_SIGNS_EN[sign].essence", () => {
    const params: ShareCardParams = { lens: "horoscopo", sign: "aries", locale: "en", ...COMMON };
    const insight = resolveInsight(params);
    expect(insight.eyebrow).toBe("TODAY");
    expect(insight.title).toBe("Aries");
    expect(insight.quote).toBe(HOROSCOPE_SIGNS_EN.aries!.essence);
  });
});
