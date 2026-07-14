// apps/mobile/lib/synastry-api.ts
// Cliente de /api/synastry (compatibilidad) con Bearer — mismo patrón que
// chart-api.ts. El cómputo (motor de efemérides + synastryReport) es
// server-only; el móvil NUNCA importa @aluna/ephemeris ni @aluna/core/astrology.
import { apiUrl } from "./config";

export type SynastryTheme = "attraction" | "communication" | "harmony" | "growth";
export type SynastryTone = "low" | "mixed" | "high";

export interface SynastryDriver {
  a: string;
  b: string;
  aspect: string;
  orb: number;
  harmony: "soft" | "hard" | "neutral";
  favorable: boolean;
}

export interface SynastryThemeScore {
  key: SynastryTheme;
  score: number;
  tone: SynastryTone;
  drivers: SynastryDriver[];
}

export interface SynastryReport {
  overall: number;
  tone: SynastryTone;
  themes: SynastryThemeScore[];
  aspects: unknown[];
}

export class SynastryApiError extends Error {
  constructor(public status: number) {
    super(`synastry_${status}`);
  }
}

export async function fetchSynastry(params: {
  accessToken: string;
  profileIdA: string;
  profileIdB: string;
}): Promise<SynastryReport> {
  const res = await fetch(`${apiUrl()}/api/synastry`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${params.accessToken}` },
    body: JSON.stringify({ profileIdA: params.profileIdA, profileIdB: params.profileIdB }),
  });
  if (!res.ok) throw new SynastryApiError(res.status);
  return (await res.json()) as SynastryReport;
}
