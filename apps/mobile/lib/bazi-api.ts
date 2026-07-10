// apps/mobile/lib/bazi-api.ts
// Llama /api/bazi con Bearer (patrón de chart-api.ts). El motor sexagenario corre
// client-side desde @aluna/core; el server solo aporta pilares + datos astronómicos.
import type { Pillar } from "@aluna/core";
import { apiUrl } from "./config";

export interface BaZiData {
  year: Pillar;
  month: Pillar;
  day: Pillar;
  hour: Pillar | null;
  solarYear: number;
  timeKnown: boolean;
  gender: "feminine" | "masculine" | "neutral";
  birthYear: number;
  daysToPrevJie: number;
  daysToNextJie: number;
}

export class BaZiApiError extends Error {}

export async function fetchBaZi(params: { accessToken: string; profileId: string }): Promise<BaZiData> {
  const res = await fetch(`${apiUrl()}/api/bazi`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${params.accessToken}` },
    body: JSON.stringify({ profileId: params.profileId }),
  });
  if (!res.ok) throw new BaZiApiError(`bazi_${res.status}`);
  const data = (await res.json()) as Partial<BaZiData>;
  if (!data.year || !data.month || !data.day) throw new BaZiApiError("bazi_empty");
  return data as BaZiData;
}
