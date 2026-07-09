// packages/core/src/bazi/labels.ts
// Glifos y romanizaciones = DATOS del dominio (spec §8): una sola fuente para web y
// móvil. Los NOMBRES ES/EN viven en la capa i18n de cada app. Hangul y romanización
// coreana revisada estándar; pinyin con tono.
import type { TenGod } from "./bazi";

export interface ScriptLabel {
  pinyin: string;
  hangul: string;
  romanKo: string;
}

/** Por índice de tronco (0=甲 … 9=癸). */
export const STEM_LABELS: readonly ScriptLabel[] = [
  { pinyin: "jiǎ", hangul: "갑", romanKo: "gap" },
  { pinyin: "yǐ", hangul: "을", romanKo: "eul" },
  { pinyin: "bǐng", hangul: "병", romanKo: "byeong" },
  { pinyin: "dīng", hangul: "정", romanKo: "jeong" },
  { pinyin: "wù", hangul: "무", romanKo: "mu" },
  { pinyin: "jǐ", hangul: "기", romanKo: "gi" },
  { pinyin: "gēng", hangul: "경", romanKo: "gyeong" },
  { pinyin: "xīn", hangul: "신", romanKo: "sin" },
  { pinyin: "rén", hangul: "임", romanKo: "im" },
  { pinyin: "guǐ", hangul: "계", romanKo: "gye" },
] as const;

/** Por índice de rama (0=子 … 11=亥). */
export const BRANCH_LABELS: readonly ScriptLabel[] = [
  { pinyin: "zǐ", hangul: "자", romanKo: "ja" },
  { pinyin: "chǒu", hangul: "축", romanKo: "chuk" },
  { pinyin: "yín", hangul: "인", romanKo: "in" },
  { pinyin: "mǎo", hangul: "묘", romanKo: "myo" },
  { pinyin: "chén", hangul: "진", romanKo: "jin" },
  { pinyin: "sì", hangul: "사", romanKo: "sa" },
  { pinyin: "wǔ", hangul: "오", romanKo: "o" },
  { pinyin: "wèi", hangul: "미", romanKo: "mi" },
  { pinyin: "shēn", hangul: "신", romanKo: "sin" },
  { pinyin: "yǒu", hangul: "유", romanKo: "yu" },
  { pinyin: "xū", hangul: "술", romanKo: "sul" },
  { pinyin: "hài", hangul: "해", romanKo: "hae" },
] as const;

/** Diez Dioses en coreano (십신). */
export const TEN_GOD_KO: Record<TenGod, string> = {
  peer: "비견",
  rob: "겁재",
  eating: "식신",
  hurting: "상관",
  wealth_indirect: "편재",
  wealth_direct: "정재",
  power_indirect: "편관",
  power_direct: "정관",
  resource_indirect: "편인",
  resource_direct: "정인",
} as const;
