// apps/mobile/lib/chat-api.ts
// Cliente de /api/chat ("Pregúntale a Aluna") con Bearer. La web recibe el
// texto en streaming; en RN leemos la respuesta ACUMULADA (sin efecto
// máquina), mismo patrón que chart-reading-api.ts — decisión tomada por
// precedente real del repo, no un patrón nuevo.
import { apiUrl } from "./config";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export type ChatReplyResult = { available: false } | { available: true; text: string };

export class ChatApiError extends Error {
  constructor(public status: number) {
    super(`chat_${status}`);
  }
}

export async function fetchChatReply(params: {
  accessToken: string;
  profileId: string;
  locale: "es" | "en";
  messages: ChatMessage[];
}): Promise<ChatReplyResult> {
  const res = await fetch(`${apiUrl()}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${params.accessToken}` },
    body: JSON.stringify({ profileId: params.profileId, locale: params.locale, messages: params.messages }),
  });
  if (!res.ok) throw new ChatApiError(res.status);
  const contentType = res.headers.get("content-type") ?? "";
  // El único caso donde /api/chat responde JSON es "sin proveedor IA" (dormant)
  // — el éxito SIEMPRE llega como text/plain acumulado. No hace falta parsear
  // el body para distinguir sub-casos: cualquier JSON aquí es "no disponible".
  if (contentType.includes("application/json")) return { available: false };
  const text = await res.text();
  return { available: true, text };
}
