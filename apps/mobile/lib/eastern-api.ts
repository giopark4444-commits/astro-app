// Llama a /api/horoscope/eastern (Next, server-only). Mismo patrón que
// horoscope-api.ts (Bearer token de la sesión Supabase, no cookies) — el
// móvil nunca calcula el motor Tong Shu localmente.
//
// El payload viaja SOLO como tipo: apps/web/lib/horoscope/eastern.ts es
// server-only (importa @aluna/ephemeris) y apps/mobile no depende de
// apps/web, así que el shape se copia acá (espejo de EasternPayload) en vez
// de importarse.
import { EARTHLY_BRANCHES, type InteractionType, type WuXingElement } from "@aluna/core";
import { apiUrl } from "./config";
import type { HoroscopePeriod } from "./horoscope-api";

export type EasternAnimal =
  | "rat" | "ox" | "tiger" | "rabbit" | "dragon" | "snake"
  | "horse" | "goat" | "monkey" | "rooster" | "dog" | "pig";

/** Los 12 animales en orden de rama (índice = índice de rama 子…亥) — mismo
 *  cálculo local que horoscopo-view.tsx (web): no depende del motor
 *  server-only, solo de @aluna/core (client/RN-safe). */
export const EASTERN_ANIMALS: readonly EasternAnimal[] =
  EARTHLY_BRANCHES.map((b) => b.animal as EasternAnimal);

export function isEasternAnimal(a: string): a is EasternAnimal {
  return (EASTERN_ANIMALS as readonly string[]).includes(a);
}

/** Índice de rama (0-11) del animal dado — usado por el picker y por
 *  EasternSky-móvil para pintar el par en hanzi/hangul. */
export function eastAnimalBranch(a: EasternAnimal): number {
  return EASTERN_ANIMALS.indexOf(a);
}

export type EasternArea = "work" | "money" | "love" | "health" | "luck";
export const EASTERN_AREAS: readonly EasternArea[] = ["work", "money", "love", "health", "luck"];

export type EasternPillarKey = "year" | "month" | "day";

/** 破 no existe en InteractionType de @aluna/core; el motor lo calcula aparte. */
export type EasternInteractionType = InteractionType | "po";

export interface EasternPillar {
  stem: number;
  branch: number;
  stemHanzi: string;
  branchHanzi: string;
  animal: EasternAnimal;
}

export interface EasternPeriodPillars {
  year: EasternPillar;
  month: EasternPillar | null;
  day: EasternPillar | null;
}

export interface EasternInteractionHit {
  pillar: EasternPillarKey;
  type: EasternInteractionType;
  withBranch: number;
  withAnimal: EasternAnimal;
  favorable: boolean;
  element?: WuXingElement;
}

export interface EasternDriver extends EasternInteractionHit {
  delta: number;
}

export interface EasternAreaScore {
  area: EasternArea;
  score: number;
  tone: "low" | "mixed" | "high";
  drivers: EasternDriver[];
}

export type TaiSuiKind = "zhi" | "chong" | "hai" | "zixing" | "po";
export interface TaiSuiHit { kind: TaiSuiKind }

export type PillarPosWithHour = "year" | "month" | "day" | "hour";
export interface EasternNatalHit {
  natalPillar: PillarPosWithHour;
  periodPillar: EasternPillarKey;
  type: EasternInteractionType;
  natalBranch: number;
  withBranch: number;
  favorable: boolean;
}

export type WuXingRelation = "same" | "generates" | "controls" | "controlled_by" | "generated_by";
export interface EasternWuXing {
  periodElement: WuXingElement;
  animalElement: WuXingElement;
  relation: WuXingRelation;
}

export interface EasternPayload {
  animal: EasternAnimal;
  period: HoroscopePeriod;
  tz: string;
  range: { fromIso: string; toIso: string };
  solarYear: number;
  pillars: EasternPeriodPillars;
  jieDates: Array<{ atIso: string; solarLongitude: number }>;
  interactions: EasternInteractionHit[];
  clash: { withAnimal: EasternAnimal } | null;
  harmonies: EasternAnimal[];
  taiSui: TaiSuiHit[] | null;
  monthChange: { atIso: string } | null;
  wuXing: EasternWuXing;
  toneBalance: "favorable" | "tense" | "mixed";
  areas: EasternAreaScore[];
  natalHits?: EasternNatalHit[];
}

export interface FetchEasternHoroscopeParams {
  accessToken: string;
  animal?: string | null;
  period: HoroscopePeriod;
  tz: string;
  profileId?: string | null;
}

export class EasternHoroscopeApiError extends Error {}

export async function fetchEasternHoroscope(params: FetchEasternHoroscopeParams): Promise<EasternPayload> {
  const res = await fetch(`${apiUrl()}/api/horoscope/eastern`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${params.accessToken}` },
    body: JSON.stringify({
      period: params.period,
      tz: params.tz,
      ...(params.animal ? { animal: params.animal } : {}),
      ...(params.profileId ? { profileId: params.profileId } : {}),
    }),
  });
  if (!res.ok) throw new EasternHoroscopeApiError(`eastern_${res.status}`);
  return (await res.json()) as EasternPayload;
}
