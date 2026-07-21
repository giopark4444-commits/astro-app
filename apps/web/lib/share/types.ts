// apps/web/lib/share/types.ts
// Tipos puros de las tarjetas compartibles. Unión discriminada por `lens`:
// estructuralmente IMPOSIBLE incluir PII (nombre/fecha/lugar) — cada variante
// solo lleva las claves de dominio necesarias para resolver contenido ya
// existente en las capas de contenido (nunca texto libre, nunca datos del
// perfil). Sin I/O, sin React.
import type { ShareFormat, ShareTheme } from "./palette";

export type ShareLocale = "es" | "en";

/** Campos comunes a toda tarjeta, independientes de la lente. */
interface ShareCardCommon {
  format: ShareFormat;
  theme: ShareTheme;
  detail: boolean;
  locale: ShareLocale;
}

export interface ShareCardNumeros extends ShareCardCommon {
  lens: "numeros";
  number: number;
  labelKey: string;
}

export interface ShareCardCarta extends ShareCardCommon {
  lens: "carta";
  body: "sun" | "moon" | "asc";
  sign: string;
}

export interface ShareCardPilares extends ShareCardCommon {
  lens: "pilares";
  dayStem: string;
}

export interface ShareCardTarot extends ShareCardCommon {
  lens: "tarot";
  cardId: string;
  reversed: boolean;
  position?: string;
}

export interface ShareCardHoroscopo extends ShareCardCommon {
  lens: "horoscopo";
  sign: string;
}

export type ShareCardParams =
  | ShareCardNumeros
  | ShareCardCarta
  | ShareCardPilares
  | ShareCardTarot
  | ShareCardHoroscopo;

export type ShareLens = ShareCardParams["lens"];

/** Contenido ya resuelto, listo para pintar — todo el texto sale de las capas
 *  de contenido existentes (numerology-es/en, core-reading-es/en, DAY_MASTER_VOICE,
 *  TAROT_CARDS_ES/EN, HOROSCOPE_SIGNS_ES/EN). Nunca texto libre. */
export interface ResolvedGlyph {
  kind: "number" | "zodiac" | "hanzi" | "tarot";
  value: string;
}

export interface ResolvedInsight {
  eyebrow: string;
  title?: string;
  quote: string;
  glyph: ResolvedGlyph;
  chips: string[];
}
