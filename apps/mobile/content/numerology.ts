// Acceso a la voz de numerología por idioma. Las pantallas/componentes piden el
// contenido para el locale activo y no ramifican ES/EN en línea.

import type { Locale } from "../lib/i18n-context";
import type { NumberMeaning } from "./numerology-es";
import {
  GLOSS as GLOSS_ES,
  LABELS as LABELS_ES,
  NUMBER_MEANINGS_ES,
  PERSONAL_DAY_ES,
  POSITION_LENS_ES,
} from "./numerology-es";
import {
  GLOSS_EN,
  LABELS_EN,
  NUMBER_MEANINGS_EN,
  PERSONAL_DAY_EN,
  POSITION_LENS_EN,
} from "./numerology-en";

export type { NumberMeaning };

export type PositionKey = keyof typeof LABELS_ES;

interface NumerologyContent {
  meanings: Record<number, NumberMeaning>;
  lens: Record<string, string>;
  labels: Record<string, string>;
  gloss: Record<string, string>;
  personalDay: Record<number, string>;
}

const ES: NumerologyContent = {
  meanings: NUMBER_MEANINGS_ES,
  lens: POSITION_LENS_ES,
  labels: LABELS_ES,
  gloss: GLOSS_ES,
  personalDay: PERSONAL_DAY_ES,
};

const EN: NumerologyContent = {
  meanings: NUMBER_MEANINGS_EN,
  lens: POSITION_LENS_EN,
  labels: LABELS_EN,
  gloss: GLOSS_EN,
  personalDay: PERSONAL_DAY_EN,
};

/** Devuelve la voz de numerología para el locale dado. */
export function numerologyContent(locale: Locale): NumerologyContent {
  return locale === "en" ? EN : ES;
}
