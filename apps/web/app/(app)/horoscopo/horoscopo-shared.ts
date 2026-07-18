// Helpers module-level COMPARTIDOS por la vista occidental y la oriental del
// horóscopo. Extraídos del monolito horoscopo-view.tsx (Fase 3, Task 2) sin
// cambiar su valor ni su tipo — MOVE puro. Los helpers de una sola rama
// (SIGN_GLYPH/PLANET_GLYPH → western; EASTERN_ANIMALS/INTERACTION_GLYPH/cap →
// eastern) viven en su propia subvista, no aquí.
import type { HoroscopePeriod } from "@/lib/horoscope/western";

// Variation Selector-15 (U+FE0E): fuerza presentación TEXTO (no emoji a color)
// en los glifos de signo/planeta (occidental) y en los hanzi de rama de los
// chips de animal (oriental). Mismo valor que el literal invisible original.
export const TEXT_VS = "︎";

export const PERIODS: HoroscopePeriod[] = ["yesterday", "today", "tomorrow", "week", "month", "year"];
export const PERIOD_KEY: Record<HoroscopePeriod, string> = {
  yesterday: "periodYesterday", today: "periodToday", tomorrow: "periodTomorrow",
  week: "periodWeek", month: "periodMonth", year: "periodYear",
};
export const AREA_KEY: Record<string, string> = {
  love: "areaLove", money: "areaMoney", work: "areaWork",
  health: "areaHealth", mood: "areaMood", luck: "areaLuck",
};
export const TONE_KEY: Record<string, string> = { high: "toneHigh", mixed: "toneMixed", low: "toneLow" };
