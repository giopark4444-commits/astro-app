// Llama a /api/horoscope/western (Next, server-only: sweph nativo). El móvil
// NUNCA calcula esto localmente — mismo patrón que chart-api.ts: Bearer token
// de la sesión Supabase (Authorization header), no cookies.
import { apiUrl } from "./config";

export type HoroscopePeriod = "today" | "week" | "month" | "year";
export type LifeArea = "love" | "money" | "work" | "health" | "mood" | "luck";
export type ScoreTone = "low" | "mixed" | "high";

export interface SolarHousePlacement { body: string; sign: string; house: number; retrograde: boolean }
export interface SignAspect { body: string; sign: string; aspect: string; harmony: "hard" | "soft" | "neutral" }
export interface SolarHouseDriver { body: string; house: number; favorable: boolean }
export interface SolarLifeAreaScore { area: LifeArea; score: number; tone: ScoreTone; drivers: SolarHouseDriver[] }
// Espejo exacto de SkyEvent en packages/ephemeris/src/events.ts — el endpoint
// serializa ese discriminated union directo a JSON, así que cada variante trae
// SOLO sus campos (nunca los de las otras dos).
export type SkyEventJson =
  | { kind: "lunation"; atIso: string; phase: "new" | "full"; sign: string; longitude: number; eclipse: "solar" | "lunar" | null }
  | { kind: "station"; atIso: string; body: string; direction: "retrograde" | "direct"; sign: string }
  | { kind: "ingress"; atIso: string; body: string; fromSign: string; toSign: string };
export interface NatalHit {
  a: string; b: string; aspect: string; orb: number; harmony: "hard" | "soft" | "neutral";
  exactIso: string | null;
}
export interface WesternHoroscopePayload {
  sign: string;
  period: HoroscopePeriod;
  tz: string;
  range: { fromIso: string; toIso: string };
  houses: SolarHousePlacement[];
  signAspects: SignAspect[];
  events: SkyEventJson[];
  areas: SolarLifeAreaScore[];
  natalHits?: NatalHit[];
}

export interface FetchWesternHoroscopeParams {
  accessToken: string;
  sign?: string | null;
  period: HoroscopePeriod;
  tz: string;
  profileId?: string | null;
}

export class HoroscopeApiError extends Error {}

export async function fetchWesternHoroscope(params: FetchWesternHoroscopeParams): Promise<WesternHoroscopePayload> {
  const res = await fetch(`${apiUrl()}/api/horoscope/western`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${params.accessToken}` },
    body: JSON.stringify({
      period: params.period,
      tz: params.tz,
      ...(params.sign ? { sign: params.sign } : {}),
      ...(params.profileId ? { profileId: params.profileId } : {}),
    }),
  });
  if (!res.ok) throw new HoroscopeApiError(`horoscope_${res.status}`);
  return (await res.json()) as WesternHoroscopePayload;
}
