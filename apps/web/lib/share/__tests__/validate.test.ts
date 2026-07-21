// apps/web/lib/share/__tests__/validate.test.ts
import { describe, expect, it } from "vitest";
import { DAY_MASTER_VOICE, TAROT_CARDS_ES, ZODIAC_SIGNS } from "@aluna/core";
import { parseShareParams } from "../validate";
import type { ShareCardParams } from "../types";

function sp(fields: Record<string, string>): URLSearchParams {
  return new URLSearchParams(fields);
}

const BASE_COMMON = { theme: "observatory", format: "story", detail: "1", locale: "es" };

const VALID = {
  numeros: { lens: "numeros", number: "1", labelKey: "lifePath", ...BASE_COMMON },
  carta: { lens: "carta", body: "sun", sign: "leo", ...BASE_COMMON },
  pilares: { lens: "pilares", dayStem: "jia", ...BASE_COMMON },
  tarot: { lens: "tarot", cardId: "fool", reversed: "0", ...BASE_COMMON },
  horoscopo: { lens: "horoscopo", sign: "leo", ...BASE_COMMON },
};

describe("parseShareParams — casos válidos por lente", () => {
  it("numeros: número simple", () => {
    const result = parseShareParams(sp(VALID.numeros));
    expect(result).toEqual({
      lens: "numeros",
      number: 1,
      labelKey: "lifePath",
      theme: "observatory",
      format: "story",
      detail: true,
      locale: "es",
    } satisfies ShareCardParams);
  });

  it("numeros: número maestro (11)", () => {
    const result = parseShareParams(sp({ ...VALID.numeros, number: "11" }));
    expect("error" in result).toBe(false);
    expect((result as { number: number }).number).toBe(11);
  });

  it("numeros: acepta los 12 números válidos (1-9, 11, 22, 33)", () => {
    for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33]) {
      const result = parseShareParams(sp({ ...VALID.numeros, number: String(n) }));
      expect("error" in result, `número ${n} debería ser válido`).toBe(false);
    }
  });

  it("carta: sol en signo", () => {
    const result = parseShareParams(sp(VALID.carta));
    expect(result).toEqual({
      lens: "carta",
      body: "sun",
      sign: "leo",
      theme: "observatory",
      format: "story",
      detail: true,
      locale: "es",
    } satisfies ShareCardParams);
  });

  it("carta: acepta los 3 body y los 12 signos", () => {
    for (const body of ["sun", "moon", "asc"]) {
      for (const sign of ZODIAC_SIGNS.map((s) => s.key)) {
        const result = parseShareParams(sp({ ...VALID.carta, body, sign }));
        expect("error" in result, `body=${body} sign=${sign} debería ser válido`).toBe(false);
      }
    }
  });

  it("pilares: día maestro", () => {
    const result = parseShareParams(sp(VALID.pilares));
    expect(result).toEqual({
      lens: "pilares",
      dayStem: "jia",
      theme: "observatory",
      format: "story",
      detail: true,
      locale: "es",
    } satisfies ShareCardParams);
  });

  it("pilares: acepta los 10 troncos celestes", () => {
    for (const dayStem of Object.keys(DAY_MASTER_VOICE)) {
      const result = parseShareParams(sp({ ...VALID.pilares, dayStem }));
      expect("error" in result, `dayStem=${dayStem} debería ser válido`).toBe(false);
    }
  });

  it("tarot: carta sin posición", () => {
    const result = parseShareParams(sp(VALID.tarot));
    expect(result).toEqual({
      lens: "tarot",
      cardId: "fool",
      reversed: false,
      theme: "observatory",
      format: "story",
      detail: true,
      locale: "es",
    } satisfies ShareCardParams);
  });

  it("tarot: carta invertida con posición válida", () => {
    const result = parseShareParams(sp({ ...VALID.tarot, reversed: "1", position: "past" }));
    expect(result).toEqual({
      lens: "tarot",
      cardId: "fool",
      reversed: true,
      position: "past",
      theme: "observatory",
      format: "story",
      detail: true,
      locale: "es",
    } satisfies ShareCardParams);
  });

  it("tarot: acepta las 78 cartas de TAROT_CARDS_ES", () => {
    for (const cardId of Object.keys(TAROT_CARDS_ES)) {
      const result = parseShareParams(sp({ ...VALID.tarot, cardId }));
      expect("error" in result, `cardId=${cardId} debería ser válido`).toBe(false);
    }
  });

  it("horoscopo: signo del día", () => {
    const result = parseShareParams(sp(VALID.horoscopo));
    expect(result).toEqual({
      lens: "horoscopo",
      sign: "leo",
      theme: "observatory",
      format: "story",
      detail: true,
      locale: "es",
    } satisfies ShareCardParams);
  });

  it("acepta los 6 temas, 3 formatos y 2 locales", () => {
    for (const theme of ["observatory", "aurora", "cosmic", "selva", "alba", "eclipse"]) {
      const result = parseShareParams(sp({ ...VALID.numeros, theme }));
      expect("error" in result, `theme=${theme} debería ser válido`).toBe(false);
    }
    for (const format of ["story", "feed", "square"]) {
      const result = parseShareParams(sp({ ...VALID.numeros, format }));
      expect("error" in result, `format=${format} debería ser válido`).toBe(false);
    }
    for (const locale of ["es", "en"]) {
      const result = parseShareParams(sp({ ...VALID.numeros, locale }));
      expect("error" in result, `locale=${locale} debería ser válido`).toBe(false);
    }
  });

  it("detail '0' se parsea como false", () => {
    const result = parseShareParams(sp({ ...VALID.numeros, detail: "0" }));
    expect("error" in result).toBe(false);
    expect((result as { detail: boolean }).detail).toBe(false);
  });
});

describe("parseShareParams — rechazos, un código por campo", () => {
  it("lens ausente -> bad_lens", () => {
    const { lens: _lens, ...rest } = VALID.numeros;
    expect(parseShareParams(sp(rest))).toEqual({ error: "bad_lens" });
  });

  it("lens inventado -> bad_lens", () => {
    expect(parseShareParams(sp({ ...VALID.numeros, lens: "runas" }))).toEqual({ error: "bad_lens" });
  });

  it("numeros: número fuera de whitelist (10) -> bad_number", () => {
    expect(parseShareParams(sp({ ...VALID.numeros, number: "10" }))).toEqual({ error: "bad_number" });
  });

  it("numeros: número no numérico -> bad_number", () => {
    expect(parseShareParams(sp({ ...VALID.numeros, number: "abc" }))).toEqual({ error: "bad_number" });
  });

  it("numeros: labelKey inventado -> bad_label_key", () => {
    expect(parseShareParams(sp({ ...VALID.numeros, labelKey: "destiny" }))).toEqual({ error: "bad_label_key" });
  });

  it("carta: body inventado -> bad_body", () => {
    expect(parseShareParams(sp({ ...VALID.carta, body: "mercury" }))).toEqual({ error: "bad_body" });
  });

  it("carta: sign inventado -> bad_sign", () => {
    expect(parseShareParams(sp({ ...VALID.carta, sign: "xxx" }))).toEqual({ error: "bad_sign" });
  });

  it("pilares: dayStem inventado -> bad_day_stem", () => {
    expect(parseShareParams(sp({ ...VALID.pilares, dayStem: "xxx" }))).toEqual({ error: "bad_day_stem" });
  });

  it("tarot: cardId inventado -> bad_card_id", () => {
    expect(parseShareParams(sp({ ...VALID.tarot, cardId: "xxx" }))).toEqual({ error: "bad_card_id" });
  });

  it("tarot: reversed inválido -> bad_reversed", () => {
    expect(parseShareParams(sp({ ...VALID.tarot, reversed: "yes" }))).toEqual({ error: "bad_reversed" });
  });

  it("tarot: position inválida -> bad_position", () => {
    expect(parseShareParams(sp({ ...VALID.tarot, position: "xxx" }))).toEqual({ error: "bad_position" });
  });

  it("horoscopo: sign inventado -> bad_sign", () => {
    expect(parseShareParams(sp({ ...VALID.horoscopo, sign: "xxx" }))).toEqual({ error: "bad_sign" });
  });

  it("theme inválido -> bad_theme", () => {
    expect(parseShareParams(sp({ ...VALID.numeros, theme: "xxx" }))).toEqual({ error: "bad_theme" });
  });

  it("format inválido -> bad_format", () => {
    expect(parseShareParams(sp({ ...VALID.numeros, format: "xxx" }))).toEqual({ error: "bad_format" });
  });

  it("detail inválido -> bad_detail", () => {
    expect(parseShareParams(sp({ ...VALID.numeros, detail: "yes" }))).toEqual({ error: "bad_detail" });
  });

  it("locale inválido -> bad_locale", () => {
    expect(parseShareParams(sp({ ...VALID.numeros, locale: "fr" }))).toEqual({ error: "bad_locale" });
  });
});
