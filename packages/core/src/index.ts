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
export * from "./constants/colors";

// Dominio de carta astral (puro)
export * from "./astrology/types";
export { normalizeAngle, signOfLongitude, angularSeparation } from "./astrology/signs";
export { moonPhase, type MoonPhase } from "./astrology/moon-phase";
export { houseOfLongitude } from "./astrology/houses";
export { dignityOf } from "./astrology/dignity";
export { detectAspects, detectAspectsBetween } from "./astrology/aspects";
export type { AspectPoint, AspectOptions } from "./astrology/aspects";
export { computeDistribution, quadrantOfHouse } from "./astrology/distribution";
export { detectPatterns } from "./astrology/patterns";
export { scoreLifeAreas, scoreTone, LIFE_AREAS } from "./astrology/life-areas";
export type { LifeArea, LifeAreaScore, ScoreTone, AreaDriver } from "./astrology/life-areas";
export {
  solarHouseOf, solarPlacements, signAspectsToSign, scoreLifeAreasBySolarHouse,
  SOLAR_HOUSE_AREAS,
} from "./astrology/solar-houses";
export type {
  SolarBodyInput, SolarHousePlacement, SignAspect, SolarHouseDriver, SolarLifeAreaScore,
} from "./astrology/solar-houses";
export { TRANSIT_WEIGHT, BENEFIC, MALEFIC } from "./astrology/life-areas";
export { synastryReport, SYNASTRY_THEMES } from "./astrology/synastry";
export type {
  SynastryReport,
  SynastryTheme,
  SynastryThemeScore,
  SynastryTone,
  SynastryDriver,
} from "./astrology/synastry";
export { WHEEL, pointAt, annularSector, spreadBodies } from "./astrology/wheel-geometry";
export {
  WHEEL_CEREMONY, WHEEL_CEREMONY_ASPECTS, ceremonyTotalMs,
  type WheelCeremonyPhase, type WheelCeremonyPhaseKey,
} from "./astrology/wheel-ceremony";

// Cuatro Pilares (八字 Ba Zi / 사주 Saju) — sistema sexagenario, RN-safe
export {
  computeBaZi,
  yearPillar,
  monthPillar,
  dayPillar,
  hourPillar,
  gregorianToJDN,
  hiddenStems,
  tenGod,
  TEN_GODS,
  HEAVENLY_STEMS,
  EARTHLY_BRANCHES,
} from "./bazi/bazi";
export type { BaZiInput, BaZiResult, Pillar, StemDef, BranchDef, TenGod, TenGodDef, WuXingElement } from "./bazi/bazi";
export { WU_XING_COLORS } from "./bazi/colors";
export { sexagenaryIndex, nayin, NAYIN, type NayinDef } from "./bazi/nayin";
export { lifeStage, TWELVE_STAGES, type StageKey, type StageDef } from "./bazi/stages";
export {
  detectInteractions, branchPairInteractions, TRINES,
  type Interaction, type InteractionType, type PillarPos, type PillarSet,
} from "./bazi/interactions";
export {
  symbolicStars, voidBranches, STARS,
  type StarKey, type StarDef, type StarHit,
} from "./bazi/stars";
export {
  dayMasterStrength, favorableElements, seasonState, elementAt,
  STRENGTH_THRESHOLDS, STRENGTH_WEIGHTS,
  type DayMasterStrength, type StrengthDriver, type StrengthVerdict, type SeasonState,
} from "./bazi/strength";
export {
  luckDirection, luckPillars, annualPillars,
  type LuckDirection, type LuckPillarItem, type LuckSequence, type LuckInput, type AnnualPillarItem,
} from "./bazi/luck";
export { STEM_LABELS, BRANCH_LABELS, TEN_GOD_KO, type ScriptLabel } from "./bazi/labels";

// Facturación (Aluna Plus / Dodo Payments) — puro, compartido web+móvil
export { isPlusActive, type SubscriptionStatus, type SubscriptionRow } from "./billing/subscription";

// Manifestaciones — fase derivada del tiempo, puro, RN-safe (sin efemérides)
export { manifestationPhase, HORIZONS, type Horizon } from "./manifestations/phase";

// Intención del usuario (cuestionario de primera entrada)
export { parseIntent, orderAreasByFocus, INTENT_GOALS, RELATIONSHIP_STATUSES } from "./intent";
export type { UserIntent, IntentGoal, RelationshipStatus } from "./intent";

// Signo solar aproximado por fecha (gauge zodiacal del cuestionario de primera entrada)
export { sunSignFromDate } from "./astrology/sun-sign";

// Glosario de significados ("toca y entiende") — contenido único, compartido web+móvil
export { glossaryEntry, GLOSSARY_ES, GLOSSARY_EN, type GlossaryEntry } from "./glossary";
export { planetMeaningKey, dignityMeaningKey, patternMeaningKey, houseSystemMeaningKey, interactionKey } from "./glossary/keys";

// Tarot — el mazo como datos puros (78 cartas, correspondencias Golden Dawn)
export * from "./tarot/types";
export { TAROT_DECK, TAROT_DECKS, cardById } from "./tarot/deck";
