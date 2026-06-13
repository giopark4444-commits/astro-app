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
