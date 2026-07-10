// Llama al motor de carta en el server Next (Route Handler /api/chart) — el
// móvil NUNCA importa @aluna/ephemeris (sweph es nativo, solo corre server-side).
// Autentica con el access_token de la sesión Supabase (Authorization: Bearer),
// no con cookies (el móvil no tiene) — ver apps/web/lib/supabase/route-auth.ts.

import type { ChartResult, Aspect, HouseSystem, Zodiac } from "@aluna/core";
import { apiUrl } from "./config";

export type ChartKind = "natal" | "transits" | "solar_return" | "progressed";

export interface FetchChartParams {
  accessToken: string;
  profileId: string;
  kind: ChartKind;
  houseSystem?: HouseSystem;
  zodiac?: Zodiac;
}

export interface FetchChartResult {
  chart: ChartResult;
  solar: boolean;
  transitAspects?: Aspect[];
}

export class ChartApiError extends Error {}

export async function fetchChart(params: FetchChartParams): Promise<FetchChartResult> {
  const res = await fetch(`${apiUrl()}/api/chart`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${params.accessToken}`,
    },
    body: JSON.stringify({
      profileId: params.profileId,
      kind: params.kind,
      ...(params.houseSystem ? { houseSystem: params.houseSystem } : {}),
      ...(params.zodiac ? { zodiac: params.zodiac } : {}),
    }),
  });
  if (!res.ok) throw new ChartApiError(`chart_${res.status}`);
  const data = (await res.json()) as { chart?: ChartResult; solar?: boolean; transitAspects?: Aspect[] };
  if (!data.chart) throw new ChartApiError("chart_empty");
  return { chart: data.chart, solar: !!data.solar, transitAspects: data.transitAspects };
}
