// apps/mobile/lib/chart-reading-api.ts
// Tiers IA de la lectura de carta (Profunda/Completa) vía /api/chart-reading con
// Bearer. La web recibe el texto en streaming; en RN leemos la respuesta
// ACUMULADA (sin efecto máquina — spec §3.4) y parseamos el objeto
// {essence,flow,shadow}. Un HIT de caché vuelve como JSON estructurado directo.
import type { BodyReading } from "../content/astrology-readings-es";
import { API_URL } from "./supabase";

export class ChartReadingApiError extends Error {}

/** Extrae {essence,flow,shadow} del texto del modelo; null si no parsea completo. */
export function parseReadingText(text: string): BodyReading | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const o = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
    if (typeof o.essence === "string" && typeof o.flow === "string" && typeof o.shadow === "string") {
      return { essence: o.essence, flow: o.flow, shadow: o.shadow };
    }
  } catch {
    /* cae a null */
  }
  return null;
}

export async function fetchChartReading(params: {
  accessToken: string;
  body: string;
  sign: string;
  house: number;
  dignity: string | null;
  length: "profunda" | "completa";
  locale: "es" | "en";
  profileName: string;
}): Promise<{ available: false } | { available: true; reading: BodyReading }> {
  if (!API_URL) throw new ChartReadingApiError("apiUrl no configurado");
  const res = await fetch(`${API_URL}/api/chart-reading`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${params.accessToken}` },
    body: JSON.stringify({
      body: params.body, sign: params.sign, house: params.house, dignity: params.dignity,
      length: params.length, locale: params.locale, profileName: params.profileName,
    }),
  });
  if (!res.ok) throw new ChartReadingApiError(`reading_${res.status}`);
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const data = (await res.json()) as { available?: boolean; meaning?: BodyReading };
    if (!data.available || !data.meaning) return { available: false };
    return { available: true, reading: data.meaning };
  }
  // Stream acumulado como texto plano:
  const text = await res.text();
  const reading = parseReadingText(text);
  if (!reading) throw new ChartReadingApiError("reading_parse");
  return { available: true, reading };
}
