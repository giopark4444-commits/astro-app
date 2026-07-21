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

/** Distribuye `Omit` sobre la unión (a diferencia de `Omit` liso, que colapsa
 *  `keyof` de una unión a la intersección de claves y perdería los campos
 *  propios de cada variante). */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/** Lo que un ShareButton necesita del caller: solo los campos de dominio de la
 *  lente (sin PII, ver arriba) — nunca format/theme/detail/locale, que el
 *  propio modal decide vía use-share-image (estado de usuario, no del dato). */
export type ShareLensParams = DistributiveOmit<ShareCardParams, "format" | "theme" | "detail" | "locale">;

/** Contenido ya resuelto, listo para pintar — todo el texto sale de las capas
 *  de contenido existentes (numerology-es/en, core-reading-es/en, DAY_MASTER_VOICE,
 *  TAROT_CARDS_ES/EN, HOROSCOPE_SIGNS_ES/EN). Nunca texto libre. */
export interface ResolvedGlyph {
  kind: "number" | "zodiac" | "hanzi" | "tarot" | "chart";
  value: string;
  /** Solo para kind "chart": el signo del sector natal donde va el foco (el
   *  `sign` de ShareCardCarta, sin más — sigue sin ser PII). El resto de kinds
   *  nunca la define. */
  sign?: string;
}

export interface ResolvedInsight {
  eyebrow: string;
  title?: string;
  quote: string;
  glyph: ResolvedGlyph;
  chips: string[];
  /** Índice del chip que se pinta en acento (chip--acc: elemento/maestro/invertida)
   *  — undefined si ningún chip es acento. Se calcula aquí (no en card-template,
   *  que ya no conoce la lente original) porque la regla difiere por lente: en
   *  numeros/carta/pilares el chip 0 siempre es acento; en tarot SOLO cuando la
   *  carta está invertida (el chip "INVERTIDA" que resolveTarot antepone). */
  accentChipIndex?: number;
}
