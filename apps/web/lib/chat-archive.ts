// apps/web/lib/chat-archive.ts
// Archivo del hilo de chat (Fase 1B): persiste la conversación de las 3
// superficies de chat (chat/tarot/timeline) en chat_threads/chat_messages
// (migración 0019) para que Aluna RETOME la conversación entre sesiones en
// vez de vivir solo en el navegador. Hoy solo el chat principal
// (/preguntar + /api/chat) tiene UI de retomar — tarot/timeline solo
// persisten (diferido: lista de hilos y "retomar" ahí también).
//
// Mismas reglas de la casa que memories.ts/memory-entities.ts: todo lo que
// toca la BD es best-effort (try/catch total) — un fallo aquí jamás rompe el
// chat. PostgrestBuilder no tiene `.catch` (lección T9 cuestionario) —
// siempre try/catch, nunca encadenado.

import { randomUUID } from "node:crypto";
import type { AlunaSupabaseClient, TablesInsert } from "@aluna/supabase";

export type ChatSurface = "chat" | "tarot" | "timeline";
export type ChatRole = "user" | "assistant";

export interface ArchivedMessage {
  id: string;
  role: ChatRole;
  content: string;
  created_at: string;
}

export interface RecentThread {
  threadId: string;
  messages: ArchivedMessage[];
}

/**
 * Asegura un hilo para (userId, surface). Si llega un `threadId` se valida
 * que sea del usuario (select con `.eq("user_id", ...)` — defensivo, además
 * de la RLS "own chat_threads select" de 0019) y se devuelve tal cual; si no
 * llega, no existe o es de otro usuario, se crea uno nuevo.
 *
 * El id del hilo nuevo se genera EN EL CLIENTE (`randomUUID`) a propósito:
 * evita el shim `insert().select()` que `exactOptionalPropertyTypes` fuerza
 * en postgrest-js (mismo problema que journal/manifestations, aquí esquivado
 * con un `insert()` simple, igual que memories.ts/memory-entities.ts).
 *
 * Best-effort total: cualquier fallo (tabla sin migrar, red, RLS) devuelve
 * `null` y el llamador simplemente no persiste — el chat sigue funcionando
 * en memoria como hoy.
 */
export async function ensureThread(
  supabase: AlunaSupabaseClient,
  userId: string,
  surface: ChatSurface,
  profileId?: string | null,
  threadId?: string | null,
): Promise<string | null> {
  try {
    if (threadId) {
      const { data } = await supabase
        .from("chat_threads")
        .select("id")
        .eq("id", threadId)
        .eq("user_id", userId)
        .maybeSingle();
      if (data) return (data as { id: string }).id;
      // threadId ajeno/inexistente: cae a crear uno nuevo abajo, nunca 500.
    }

    const id = randomUUID();
    const row: TablesInsert<"chat_threads"> = {
      id,
      user_id: userId,
      surface,
      profile_id: profileId ?? null,
    };
    const { error } = await supabase.from("chat_threads").insert(row);
    if (error) return null;
    return id;
  } catch {
    return null;
  }
}

/**
 * Inserta un mensaje y refresca `last_message_at`/`updated_at` del hilo (para
 * que el panel de hilos recientes y `fetchRecentThread` ordenen bien sin
 * agregar sobre chat_messages). Mensajes vacíos (tras trim) no se guardan —
 * no aportan a retomar la conversación y evitan filas basura (p.ej. el
 * "opening trigger" invisible de tarot/timeline, o un stream cortado antes
 * del primer byte). Best-effort total.
 */
export async function appendMessage(
  supabase: AlunaSupabaseClient,
  userId: string,
  threadId: string,
  role: ChatRole,
  content: string,
): Promise<void> {
  if (!content.trim()) return;
  try {
    const row: TablesInsert<"chat_messages"> = { thread_id: threadId, user_id: userId, role, content };
    const { error } = await supabase.from("chat_messages").insert(row);
    if (error) return;

    const now = new Date().toISOString();
    await supabase
      .from("chat_threads")
      .update({ last_message_at: now, updated_at: now })
      .eq("id", threadId)
      .eq("user_id", userId);
  } catch {
    // best effort: el archivo del hilo nunca rompe el chat
  }
}

/**
 * El hilo MÁS RECIENTE de una superficie (por `last_message_at`), con sus
 * mensajes en orden cronológico — lo que la UI necesita para retomar la
 * conversación al abrir el chat. `null` si no hay ningún hilo (usuario
 * nuevo, memoria apagada siempre, o cualquier fallo best-effort) — el
 * llamador simplemente empieza vacío, como hoy.
 */
export async function fetchRecentThread(
  supabase: AlunaSupabaseClient,
  userId: string,
  surface: ChatSurface,
): Promise<RecentThread | null> {
  try {
    const { data: thread } = await supabase
      .from("chat_threads")
      .select("id")
      .eq("user_id", userId)
      .eq("surface", surface)
      .order("last_message_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!thread) return null;
    const threadId = (thread as { id: string }).id;

    const { data: messages } = await supabase
      .from("chat_messages")
      .select("id, role, content, created_at")
      .eq("thread_id", threadId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    return { threadId, messages: (messages ?? []) as ArchivedMessage[] };
  } catch {
    return null;
  }
}
