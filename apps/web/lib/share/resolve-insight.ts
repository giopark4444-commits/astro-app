// apps/web/lib/share/resolve-insight.ts
// Traduce ShareCardParams (ya validados) en ResolvedInsight: TODO el texto sale
// de las capas de contenido existentes — nunca texto libre inventado aquí.
// Puro: sin I/O, sin React, sin Date (el render añade la fecha para "HOY").
import { DAY_MASTER_VOICE, HEAVENLY_STEMS, TAROT_CARDS_EN, TAROT_CARDS_ES, ZODIAC_SIGNS, isMaster, type WuXingElement } from "@aluna/core";
import { astroLabels } from "../content/astrology-labels";
import { SUN_FRAGMENT as SUN_FRAGMENT_ES, MOON_FRAGMENT as MOON_FRAGMENT_ES, ASC_FRAGMENT as ASC_FRAGMENT_ES } from "../content/core-reading-es";
import { SUN_FRAGMENT as SUN_FRAGMENT_EN, MOON_FRAGMENT as MOON_FRAGMENT_EN, ASC_FRAGMENT as ASC_FRAGMENT_EN } from "../content/core-reading-en";
import { HOROSCOPE_SIGNS_EN } from "../content/horoscope-en";
import { HOROSCOPE_SIGNS_ES } from "../content/horoscope-es";
import { NUMBER_MEANINGS_EN } from "../content/numerology-en";
import { NUMBER_MEANINGS_ES } from "../content/numerology-es";
import type {
  ResolvedInsight,
  ShareCardCarta,
  ShareCardHoroscopo,
  ShareCardNumeros,
  ShareCardParams,
  ShareCardPilares,
  ShareCardTarot,
  ShareLocale,
} from "./types";

// --- Labels locales cortos (categoría/UI, no "lectura") --------------------
// ELEMENT_NAME/POLARITY_NAME de packages/core/src/bazi/reading.ts NO están
// exportados (const sin `export`, ni siquiera accesibles por ruta profunda);
// el patrón ya usado en el repo ante esto (chat-context.ts, api/bazi-reading,
// messages/es.json `elWood`/`elFire`/...) es duplicar estos 5+2 valores cortos
// localmente. Mismo criterio para los eyebrows de numeros (namespace
// `numerology` de messages/es.json+en.json — resolve-insight es puro y no
// puede usar next-intl) y para "MAESTRO DEL DÍA"/"DAY MASTER" (término que ya
// aparece en la prosa de composeBaziReading) y "TAROT" (messages `tarot.eyebrow`).

const NUM_LABEL_ES: Record<string, string> = {
  lifePath: "Camino de Vida",
  expression: "Expresión",
  soulUrge: "Alma",
  personality: "Personalidad",
  birthday: "Día",
  maturity: "Madurez",
};
const NUM_LABEL_EN: Record<string, string> = {
  lifePath: "Life Path",
  expression: "Expression",
  soulUrge: "Soul Urge",
  personality: "Personality",
  birthday: "Birthday",
  maturity: "Maturity",
};

const MASTER_CHIP: Record<ShareLocale, string> = { es: "NÚMERO MAESTRO", en: "MASTER NUMBER" };

const ASC_LABEL: Record<ShareLocale, string> = { es: "Ascendente", en: "Ascendant" };

/** Conector "Sol EN Leo" / "Sun IN Leo" — ASC no lo usa ("Ascendente Escorpio"). */
const BODY_SIGN_CONNECTOR: Record<ShareLocale, string> = { es: "en", en: "in" };

const DAY_MASTER_EYEBROW: Record<ShareLocale, string> = { es: "MAESTRO DEL DÍA", en: "DAY MASTER" };

const ELEMENT_NAME: Record<ShareLocale, Record<WuXingElement, string>> = {
  es: { wood: "Madera", fire: "Fuego", earth: "Tierra", metal: "Metal", water: "Agua" },
  en: { wood: "Wood", fire: "Fire", earth: "Earth", metal: "Metal", water: "Water" },
};

const POLARITY_NAME: Record<ShareLocale, { yin: string; yang: string }> = {
  es: { yin: "yin", yang: "yang" },
  en: { yin: "Yin", yang: "Yang" },
};

const TAROT_EYEBROW = "TAROT";

const REVERSED_CHIP: Record<ShareLocale, string> = { es: "INVERTIDA", en: "REVERSED" };

const HOROSCOPE_EYEBROW: Record<ShareLocale, string> = { es: "HOY", en: "TODAY" };

// --- Helpers -----------------------------------------------------------

/** Primera letra en mayúscula + punto final si no lo tiene ya (los fragmentos
 *  de core-reading-*.ts y el resto de DAY_MASTER_VOICE vienen en minúscula). */
function capitalizeSentence(s: string): string {
  const trimmed = s.trim();
  if (!trimmed) return trimmed;
  const capped = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return /[.!?…]$/.test(capped) ? capped : `${capped}.`;
}

function stemOf(key: string) {
  const stem = HEAVENLY_STEMS.find((s) => s.key === key);
  if (!stem) throw new Error(`Tronco celeste desconocido: ${key}`);
  return stem;
}

function signOf(key: string) {
  const sign = ZODIAC_SIGNS.find((s) => s.key === key);
  if (!sign) throw new Error(`Signo desconocido: ${key}`);
  return sign;
}

// --- Resolvers por lente -------------------------------------------------

function resolveNumeros(p: ShareCardNumeros): ResolvedInsight {
  const meanings = p.locale === "en" ? NUMBER_MEANINGS_EN : NUMBER_MEANINGS_ES;
  const labels = p.locale === "en" ? NUM_LABEL_EN : NUM_LABEL_ES;
  const quote = meanings[p.number]!.essence;
  const eyebrow = (labels[p.labelKey] ?? p.labelKey).toUpperCase();
  const chips = isMaster(p.number) ? [MASTER_CHIP[p.locale]] : [];
  return {
    eyebrow,
    quote,
    glyph: { kind: "number", value: String(p.number) },
    chips,
    // Spread condicional (no `accentChipIndex: undefined`): exactOptionalPropertyTypes
    // distingue "la clave no está" de "la clave está con valor undefined".
    ...(chips.length > 0 ? { accentChipIndex: 0 } : {}),
  };
}

function resolveCarta(p: ShareCardCarta): ResolvedInsight {
  const L = astroLabels(p.locale);
  const fragments =
    p.locale === "en"
      ? { sun: SUN_FRAGMENT_EN, moon: MOON_FRAGMENT_EN, asc: ASC_FRAGMENT_EN }
      : { sun: SUN_FRAGMENT_ES, moon: MOON_FRAGMENT_ES, asc: ASC_FRAGMENT_ES };
  const quote = capitalizeSentence(fragments[p.body][p.sign] ?? "");
  const signLabel = L.signs[p.sign] ?? p.sign;
  const bodyLabel = p.body === "asc" ? ASC_LABEL[p.locale] : (L.bodies[p.body] ?? p.body);
  const title =
    p.body === "asc" ? `${bodyLabel} ${signLabel}` : `${bodyLabel} ${BODY_SIGN_CONNECTOR[p.locale]} ${signLabel}`;
  const signDef = signOf(p.sign);
  const chips = [L.elements[signDef.element] ?? signDef.element, L.modalities[signDef.modality] ?? signDef.modality];

  return {
    eyebrow: bodyLabel.toUpperCase(),
    title,
    quote,
    glyph: { kind: "zodiac", value: p.sign },
    chips,
    accentChipIndex: 0,
  };
}

function resolvePilares(p: ShareCardPilares): ResolvedInsight {
  const voice = DAY_MASTER_VOICE[p.dayStem]?.[p.locale] ?? "";
  const sepIdx = voice.indexOf(":");
  const title = sepIdx >= 0 ? voice.slice(0, sepIdx).trim() : voice.trim();
  const restRaw = sepIdx >= 0 ? voice.slice(sepIdx + 1).trim() : "";
  const quote = capitalizeSentence(restRaw);

  const stemDef = stemOf(p.dayStem);
  const elementLabel = ELEMENT_NAME[p.locale][stemDef.element];
  const polarityLabel = stemDef.yin ? POLARITY_NAME[p.locale].yin : POLARITY_NAME[p.locale].yang;

  return {
    eyebrow: DAY_MASTER_EYEBROW[p.locale],
    title,
    quote,
    glyph: { kind: "hanzi", value: stemDef.hanzi },
    chips: [elementLabel, polarityLabel],
    accentChipIndex: 0,
  };
}

function resolveTarot(p: ShareCardTarot): ResolvedInsight {
  const cards = p.locale === "en" ? TAROT_CARDS_EN : TAROT_CARDS_ES;
  const card = cards[p.cardId]!;
  const keywordChips = card.keywords.slice(0, 3).map((k) => k.toUpperCase());
  const chips = p.reversed ? [REVERSED_CHIP[p.locale], ...keywordChips] : keywordChips;

  return {
    eyebrow: TAROT_EYEBROW,
    title: card.name,
    quote: card.essence,
    glyph: { kind: "tarot", value: p.cardId },
    chips,
    ...(p.reversed ? { accentChipIndex: 0 } : {}),
  };
}

function resolveHoroscopo(p: ShareCardHoroscopo): ResolvedInsight {
  const L = astroLabels(p.locale);
  const signs = p.locale === "en" ? HOROSCOPE_SIGNS_EN : HOROSCOPE_SIGNS_ES;

  return {
    eyebrow: HOROSCOPE_EYEBROW[p.locale],
    title: L.signs[p.sign] ?? p.sign,
    quote: signs[p.sign]!.essence,
    glyph: { kind: "zodiac", value: p.sign },
    chips: [],
  };
}

/** Punto de entrada único: resuelve el contenido de una tarjeta ya validada.
 *  `detail:false` no se usa aquí — el render decide si omite los chips; esta
 *  función siempre devuelve el insight completo. */
export function resolveInsight(params: ShareCardParams): ResolvedInsight {
  switch (params.lens) {
    case "numeros":
      return resolveNumeros(params);
    case "carta":
      return resolveCarta(params);
    case "pilares":
      return resolvePilares(params);
    case "tarot":
      return resolveTarot(params);
    case "horoscopo":
      return resolveHoroscopo(params);
  }
}
