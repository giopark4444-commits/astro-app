// packages/core/src/index.ts
export const ALUNA_CORE_VERSION = "0.0.0";

// Numerología
export { computeNumerology } from "./numerology/compute";
export * from "./numerology/types";
export {
  lifePath, expression, soulUrge, personality, birthday, maturity,
} from "./numerology/core-numbers";
export { personalCycles, pinnacles, challenges } from "./numerology/cycles";
export { inclusionTable, karmicLessons, hiddenPassion } from "./numerology/karmic";
export { reduce, reduceWithTrace, digitsSum, isMaster } from "./numerology/reduction";

// Constantes de astrología (para los planes 2+)
export * from "./constants/astrology";

// Dominio de carta astral (puro)
export * from "./astrology/types";
export { normalizeAngle, signOfLongitude, angularSeparation } from "./astrology/signs";
export { houseOfLongitude } from "./astrology/houses";
export { dignityOf } from "./astrology/dignity";
export { detectAspects, detectAspectsBetween } from "./astrology/aspects";
export type { AspectPoint, AspectOptions } from "./astrology/aspects";
export { computeDistribution, quadrantOfHouse } from "./astrology/distribution";
export { detectPatterns } from "./astrology/patterns";
export { scoreLifeAreas, scoreTone, LIFE_AREAS } from "./astrology/life-areas";
export type { LifeArea, LifeAreaScore, ScoreTone, AreaDriver } from "./astrology/life-areas";
export { synastryReport, SYNASTRY_THEMES } from "./astrology/synastry";
export type {
  SynastryReport,
  SynastryTheme,
  SynastryThemeScore,
  SynastryTone,
  SynastryDriver,
} from "./astrology/synastry";

// Cuatro Pilares (八字 Ba Zi / 사주 Saju) — sistema sexagenario, RN-safe
export {
  computeBaZi,
  yearPillar,
  monthPillar,
  dayPillar,
  hourPillar,
  gregorianToJDN,
  HEAVENLY_STEMS,
  EARTHLY_BRANCHES,
} from "./bazi/bazi";
export type { BaZiInput, BaZiResult, Pillar, StemDef, BranchDef } from "./bazi/bazi";
