// apps/mobile/lib/tarot-chat-api.ts
// Cliente de /api/tarot/reading-chat ("Conversa esta tirada", Tarot T3).
// Espeja EXACTO el patrón de lib/chat-api.ts (mismo server, mismo criterio de
// dormant): la web recibe el texto en streaming (res.body.getReader()), pero
// RN/Hermes NO soporta ese reader — leemos la respuesta ACUMULADA con
// res.text() (task-5-interfaces.md §2, GOTCHA crítico). content-type JSON =
// dormant (sin proveedor IA o error de validación), text/plain = éxito.
import { apiUrl } from "./config";

export interface TarotChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface TarotChatCardInput {
  cardId: string;
  reversed: boolean;
  position: string;
  /** Cartas que saltaron del mazo al barajar: opcional, el server valida. */
  jumper?: boolean;
}

export type TarotChatResult = { available: false } | { available: true; text: string };

export class TarotChatApiError extends Error {
  constructor(public status: number) {
    super(`tarot_chat_${status}`);
  }
}

export async function sendTarotChat(params: {
  accessToken: string;
  locale: "es" | "en";
  spreadId: string;
  cards: TarotChatCardInput[];
  question?: string;
  profileId?: string;
  messages: TarotChatMessage[];
}): Promise<TarotChatResult> {
  const res = await fetch(`${apiUrl()}/api/tarot/reading-chat`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${params.accessToken}` },
    body: JSON.stringify({
      locale: params.locale,
      spreadId: params.spreadId,
      cards: params.cards,
      ...(params.question !== undefined ? { question: params.question } : {}),
      ...(params.profileId !== undefined ? { profileId: params.profileId } : {}),
      messages: params.messages,
    }),
  });
  if (!res.ok) throw new TarotChatApiError(res.status);
  const contentType = res.headers.get("content-type") ?? "";
  // Único caso JSON de esta ruta: sin proveedor IA o validación fallida
  // (dormant). El éxito SIEMPRE llega como text/plain acumulado.
  if (contentType.includes("application/json")) return { available: false };
  const text = await res.text();
  return { available: true, text };
}
