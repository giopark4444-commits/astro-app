// apps/mobile/lib/scores-api.ts
// Cliente de /api/scores ("Tu energía de hoy": 6 áreas de vida 0..100 desde los
// tránsitos al natal) con Bearer — mismo patrón que synastry-api.ts/chart-api.ts.
// El cómputo (motor de efemérides + scoreLifeAreas) es server-only; el móvil
// NUNCA importa @aluna/ephemeris. Los tipos de área/driver SÍ vienen de
// @aluna/core (import type — puro TS, sin motor nativo, erased en build).
import type { AreaDriver, LifeArea, ScoreTone } from "@aluna/core";
import { apiUrl } from "./config";

export type ScoresPeriod = "today" | "week" | "month" | "year";

export interface ScoreAreaResult {
  area: LifeArea;
  score: number;
  tone: ScoreTone;
  drivers: AreaDriver[];
}

export interface ScoresResponse {
  period: ScoresPeriod;
  areas: ScoreAreaResult[];
}

export class ScoresApiError extends Error {
  constructor(public status: number) {
    super(`scores_${status}`);
  }
}

export async function fetchScores(params: {
  accessToken: string;
  profileId: string;
  period: ScoresPeriod;
}): Promise<ScoresResponse> {
  const res = await fetch(`${apiUrl()}/api/scores`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${params.accessToken}` },
    body: JSON.stringify({ profileId: params.profileId, period: params.period }),
  });
  if (!res.ok) throw new ScoresApiError(res.status);
  return (await res.json()) as ScoresResponse;
}
