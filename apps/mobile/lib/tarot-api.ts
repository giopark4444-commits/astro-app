// Llama a /api/tarot/readings (Next, server-only). Mismo patrón que
// eastern-api.ts (Bearer token de la sesión Supabase, no cookies) — el móvil
// nunca decide qué carta cayó ni valida el diario localmente: el server
// re-verifica todo contra el motor (@aluna/core, validate-reading.ts).
//
// El shape de la fila viaja SOLO como tipo: apps/web/lib/tarot/validate-reading.ts
// y la tabla tarot_readings son server-only y apps/mobile no depende de
// apps/web ni de @aluna/supabase (no está instalado acá), así que el shape se
// copia a mano (espejo de Tables<"tarot_readings">) en vez de importarse —
// mismo criterio que EasternPayload en eastern-api.ts:4-8.
import { apiUrl } from "./config";

export type TarotSpreadId = "daily" | "three";

export interface TarotReadingCardInput {
  cardId: string;
  reversed: boolean;
  position: string;
}

export interface TarotReadingRow {
  id: string;
  user_id: string;
  profile_id: string | null;
  spread: string;
  question: string | null;
  cards: TarotReadingCardInput[];
  deck: string;
  notes: string | null;
  created_at: string;
}

export interface SaveTarotReadingParams {
  spread: TarotSpreadId;
  question?: string;
  cards: TarotReadingCardInput[];
  deck: string;
}

export interface FetchTarotDiaryResult {
  readings: TarotReadingRow[];
  total: number;
}

export class TarotApiError extends Error {
  status: number;
  // El código del body del error (p.ej. "free_limit"), cuando la respuesta
  // trae un JSON parseable con {error}. undefined si el body no es JSON o no
  // trae ese shape — el llamador NUNCA debe asumir un código por el status
  // solo (mismo 403 puede tener otras causas a futuro).
  code: string | undefined;
  constructor(status: number, code: string | undefined) {
    super(`tarot_${status}`);
    this.status = status;
    this.code = code;
  }
}

async function readErrorCode(res: Response): Promise<string | undefined> {
  try {
    const data = (await res.json()) as { error?: unknown };
    return typeof data.error === "string" ? data.error : undefined;
  } catch {
    return undefined;
  }
}

export async function saveTarotReading(
  accessToken: string,
  params: SaveTarotReadingParams,
): Promise<TarotReadingRow> {
  const res = await fetch(`${apiUrl()}/api/tarot/readings`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({
      spread: params.spread,
      ...(params.question !== undefined ? { question: params.question } : {}),
      cards: params.cards,
      deck: params.deck,
    }),
  });
  if (!res.ok) throw new TarotApiError(res.status, await readErrorCode(res));
  const data = (await res.json()) as { reading: TarotReadingRow };
  return data.reading;
}

export async function fetchTarotDiary(accessToken: string): Promise<FetchTarotDiaryResult> {
  const res = await fetch(`${apiUrl()}/api/tarot/readings`, {
    method: "GET",
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new TarotApiError(res.status, await readErrorCode(res));
  return (await res.json()) as FetchTarotDiaryResult;
}
