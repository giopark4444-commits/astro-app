// apps/web/lib/share/validate.ts
// Parseo + whitelist ESTRICTA de los query params de una tarjeta compartible.
// Cada campo tiene su propio código de error (nunca un "bad_request" genérico)
// para que el caller pueda dar feedback específico. Puro: sin I/O, sin React.
import { DAY_MASTER_VOICE, TAROT_CARDS_ES, TAROT_SPREADS, ZODIAC_SIGNS } from "@aluna/core";
import { HOROSCOPE_SIGNS_ES } from "../content/horoscope-es";
import { SHARE_FORMATS, SHARE_THEMES, type ShareFormat, type ShareTheme } from "./palette";
import type {
  ShareCardCarta,
  ShareCardHoroscopo,
  ShareCardNumeros,
  ShareCardParams,
  ShareCardPilares,
  ShareCardTarot,
  ShareLocale,
} from "./types";

export interface ShareParamsError {
  error: string;
}

// --- Whitelists ------------------------------------------------------------

/** Los labelKey reales que produce NumSelection en numeros/numerology-view.tsx
 *  (más numeros/selection.ts) — el hero (lifePath) y los 5 lentes del núcleo. */
const NUM_LABEL_KEYS = ["lifePath", "expression", "soulUrge", "personality", "birthday", "maturity"] as const;

/** 1-9 + los 3 números maestros (11/22/33) — mismo criterio que isMaster de @aluna/core. */
const NUM_VALID_NUMBERS = new Set<number>([1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33]);

const ZODIAC_KEYS = new Set(ZODIAC_SIGNS.map((s) => s.key));

/** 10 troncos celestes (jia..gui) — claves de DAY_MASTER_VOICE. */
const DAY_STEM_KEYS = new Set(Object.keys(DAY_MASTER_VOICE));

/** 78 cartas de TAROT_CARDS_ES (import directo del barrel — sin sharp, RN-safe). */
const TAROT_CARD_IDS = new Set(Object.keys(TAROT_CARDS_ES));

/** Roles válidos de posición, de las 3 tiradas soportadas (daily/three/celtic-cross). */
const TAROT_POSITION_ROLES = new Set(TAROT_SPREADS.flatMap((spread) => spread.positions.map((p) => p.role)));

/** Intersección ZODIAC_SIGNS ∩ HOROSCOPE_SIGNS_ES (hoy son los mismos 12 signos,
 *  pero se calcula explícitamente por si algún día divergen). */
const HOROSCOPE_SIGN_KEYS = new Set([...ZODIAC_KEYS].filter((key) => key in HOROSCOPE_SIGNS_ES));

// --- Helpers -----------------------------------------------------------

function isError<T>(v: T | ShareParamsError): v is ShareParamsError {
  return typeof v === "object" && v !== null && "error" in v;
}

interface ShareCommonFields {
  theme: ShareTheme;
  format: ShareFormat;
  detail: boolean;
  locale: ShareLocale;
}

function parseCommonFields(searchParams: URLSearchParams): ShareCommonFields | ShareParamsError {
  const theme = searchParams.get("theme");
  if (!theme || !(SHARE_THEMES as readonly string[]).includes(theme)) return { error: "bad_theme" };

  const format = searchParams.get("format");
  if (!format || !(SHARE_FORMATS as readonly string[]).includes(format)) return { error: "bad_format" };

  const detailRaw = searchParams.get("detail");
  if (detailRaw !== "0" && detailRaw !== "1") return { error: "bad_detail" };

  const locale = searchParams.get("locale");
  if (locale !== "es" && locale !== "en") return { error: "bad_locale" };

  return {
    theme: theme as ShareTheme,
    format: format as ShareFormat,
    detail: detailRaw === "1",
    locale,
  };
}

function parseNumerosFields(
  searchParams: URLSearchParams,
): Omit<ShareCardNumeros, keyof ShareCommonFields | "lens"> | ShareParamsError {
  const numberRaw = searchParams.get("number");
  const number = numberRaw === null || numberRaw === "" ? NaN : Number(numberRaw);
  if (!Number.isInteger(number) || !NUM_VALID_NUMBERS.has(number)) return { error: "bad_number" };

  const labelKey = searchParams.get("labelKey");
  if (!labelKey || !(NUM_LABEL_KEYS as readonly string[]).includes(labelKey)) return { error: "bad_label_key" };

  return { number, labelKey };
}

function parseCartaFields(
  searchParams: URLSearchParams,
): Omit<ShareCardCarta, keyof ShareCommonFields | "lens"> | ShareParamsError {
  const body = searchParams.get("body");
  if (body !== "sun" && body !== "moon" && body !== "asc") return { error: "bad_body" };

  const sign = searchParams.get("sign");
  if (!sign || !ZODIAC_KEYS.has(sign)) return { error: "bad_sign" };

  return { body, sign };
}

function parsePilaresFields(
  searchParams: URLSearchParams,
): Omit<ShareCardPilares, keyof ShareCommonFields | "lens"> | ShareParamsError {
  const dayStem = searchParams.get("dayStem");
  if (!dayStem || !DAY_STEM_KEYS.has(dayStem)) return { error: "bad_day_stem" };

  return { dayStem };
}

function parseTarotFields(
  searchParams: URLSearchParams,
): Omit<ShareCardTarot, keyof ShareCommonFields | "lens"> | ShareParamsError {
  const cardId = searchParams.get("cardId");
  if (!cardId || !TAROT_CARD_IDS.has(cardId)) return { error: "bad_card_id" };

  const reversedRaw = searchParams.get("reversed");
  if (reversedRaw !== "0" && reversedRaw !== "1") return { error: "bad_reversed" };

  const positionRaw = searchParams.get("position");
  if (positionRaw !== null) {
    if (!TAROT_POSITION_ROLES.has(positionRaw)) return { error: "bad_position" };
    return { cardId, reversed: reversedRaw === "1", position: positionRaw };
  }

  return { cardId, reversed: reversedRaw === "1" };
}

function parseHoroscopoFields(
  searchParams: URLSearchParams,
): Omit<ShareCardHoroscopo, keyof ShareCommonFields | "lens"> | ShareParamsError {
  const sign = searchParams.get("sign");
  if (!sign || !HOROSCOPE_SIGN_KEYS.has(sign)) return { error: "bad_sign" };

  return { sign };
}

/** Punto de entrada único: parsea + valida (whitelist estricta) los query
 *  params de una tarjeta compartible. Un código de error por campo — nunca
 *  un genérico. Estructuralmente no puede colar PII: solo los campos de
 *  dominio de ShareCardParams existen en el resultado. */
export function parseShareParams(searchParams: URLSearchParams): ShareCardParams | ShareParamsError {
  const common = parseCommonFields(searchParams);
  if (isError(common)) return common;

  const lens = searchParams.get("lens");
  switch (lens) {
    case "numeros": {
      const fields = parseNumerosFields(searchParams);
      if (isError(fields)) return fields;
      return { lens: "numeros", ...fields, ...common };
    }
    case "carta": {
      const fields = parseCartaFields(searchParams);
      if (isError(fields)) return fields;
      return { lens: "carta", ...fields, ...common };
    }
    case "pilares": {
      const fields = parsePilaresFields(searchParams);
      if (isError(fields)) return fields;
      return { lens: "pilares", ...fields, ...common };
    }
    case "tarot": {
      const fields = parseTarotFields(searchParams);
      if (isError(fields)) return fields;
      return { lens: "tarot", ...fields, ...common };
    }
    case "horoscopo": {
      const fields = parseHoroscopoFields(searchParams);
      if (isError(fields)) return fields;
      return { lens: "horoscopo", ...fields, ...common };
    }
    default:
      return { error: "bad_lens" };
  }
}
