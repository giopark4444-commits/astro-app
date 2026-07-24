// apps/web/lib/chat-archive.ts
// Archivo del hilo de chat (Fase 1B): persiste la conversación de las 3
// superficies de chat (chat/tarot/timeline) en chat_threads/chat_messages
// (migración 0019) para que Aluna RETOME la conversación entre sesiones en
// vez de vivir solo en el navegador. El chat principal (/preguntar +
// /api/chat) tiene UI de retomar; tarot/timeline solo persistían — la
// "lista de hilos" diferida de este comentario es exactamente la biblioteca
// de conversaciones de abajo (listThreads/setThreadPinned/deleteThread/
// fetchThreadMessages, Gio 2026-07-24: "un historial de todas las
// conversaciones... sin importar de qué sección venga").
//
// Mismas reglas de la casa que memories.ts/memory-entities.ts: todo lo que
// toca la BD es best-effort (try/catch total) — un fallo aquí jamás rompe el
// chat. PostgrestBuilder no tiene `.catch` (lección T9 cuestionario) —
// siempre try/catch, nunca encadenado.

import { randomUUID } from "node:crypto";
import type { AlunaSupabaseClient, TablesInsert } from "@aluna/supabase";

export type ChatSurface = "chat" | "tarot" | "timeline";
export type ChatRole = "user" | "assistant";

/** Tope de mensajes que fetchRecentThread trae para "retomar" (review Fable):
 *  sin límite, un hilo viejo y largo crece sin freno en cada carga. Se pide
 *  la COLA (los más recientes) con order desc + limit, y se revierte a orden
 *  cronológico antes de devolver — la UI espera oldest-first. */
export const RECENT_THREAD_MESSAGE_CAP = 50;

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
    // Re-slice defensivo (0019 agregó `check (char_length(content) <= 4000)`):
    // sin este corte, una respuesta larga de Aluna fallaría el insert entero
    // en silencio (best-effort de abajo lo traga) y el hilo perdería ese turno.
    const row: TablesInsert<"chat_messages"> = { thread_id: threadId, user_id: userId, role, content: content.slice(0, 4000) };
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

    // Pide la COLA (más recientes primero + limit) y revierte en memoria: así
    // el tope realmente acota los últimos N en vez de siempre los primeros N
    // de un hilo viejo.
    const { data: messages } = await supabase
      .from("chat_messages")
      .select("id, role, content, created_at")
      .eq("thread_id", threadId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(RECENT_THREAD_MESSAGE_CAP);

    const chronological = ((messages ?? []) as ArchivedMessage[]).slice().reverse();
    return { threadId, messages: chronological };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Biblioteca de conversaciones (Gio, 2026-07-24): nueva sección /chat entre
// "Otras lecturas" y "Perfil" — TODOS los hilos del usuario, de cualquier
// superficie, en una sola lista con pin + eliminar. Reusa exactamente el
// mismo esquema de arriba (0019 + `pinned` de 0023); nada nuevo que
// sincronizar entre superficies.

const PREVIEW_LENGTH = 140;

export interface ThreadSummary {
  id: string;
  surface: ChatSurface;
  profileId: string | null;
  pinned: boolean;
  createdAt: string;
  lastMessageAt: string;
  /** Vista previa: el primer mensaje del USUARIO en el hilo, recortado. Se
   *  deriva de contenido real en vez de `chat_threads.title` porque esa
   *  columna nunca se ha poblado en la práctica (ensureThread no la setea:
   *  ver arriba) — así la biblioteca funciona para TODOS los hilos ya
   *  existentes, no solo los que se creen de ahora en adelante. */
  preview: string;
}

/**
 * Todos los hilos del usuario (chat/tarot/timeline), fijados primero y
 * luego por actividad reciente (mismo orden que el índice de 0023). Una
 * sola query extra para las vistas previas (NO N+1): se piden los mensajes
 * de usuario de TODOS los hilos listados en un solo `.in(...)`, ya en orden
 * cronológico, y se queda con el primero visto por hilo. Best-effort total:
 * cualquier fallo devuelve `[]` — la biblioteca simplemente se ve vacía en
 * vez de romper la página.
 */
export async function listThreads(supabase: AlunaSupabaseClient, userId: string): Promise<ThreadSummary[]> {
  try {
    const { data: threads } = await supabase
      .from("chat_threads")
      .select("id, surface, profile_id, pinned, created_at, last_message_at")
      .eq("user_id", userId)
      .order("pinned", { ascending: false })
      .order("last_message_at", { ascending: false });
    const rows = (threads ?? []) as Array<{
      id: string;
      surface: string;
      profile_id: string | null;
      pinned: boolean;
      created_at: string;
      last_message_at: string;
    }>;
    if (rows.length === 0) return [];

    const ids = rows.map((r) => r.id);
    const { data: firstMessages } = await supabase
      .from("chat_messages")
      .select("thread_id, content, created_at")
      .in("thread_id", ids)
      .eq("role", "user")
      .order("created_at", { ascending: true });
    const previewByThread = new Map<string, string>();
    for (const m of (firstMessages ?? []) as Array<{ thread_id: string; content: string }>) {
      if (!previewByThread.has(m.thread_id)) previewByThread.set(m.thread_id, m.content);
    }

    return rows.map((r) => ({
      id: r.id,
      surface: (r.surface as ChatSurface) ?? "chat",
      profileId: r.profile_id,
      pinned: r.pinned,
      createdAt: r.created_at,
      lastMessageAt: r.last_message_at,
      preview: (previewByThread.get(r.id) ?? "").slice(0, PREVIEW_LENGTH),
    }));
  } catch {
    return [];
  }
}

/**
 * Fija/desfija un hilo: el usuario elige qué conversación quiere siempre
 * arriba de su biblioteca. Defensivo por dueño (`.eq("user_id", …)`, defensa
 * en profundidad además de RLS) + best-effort: cualquier fallo devuelve
 * `false` sin lanzar.
 */
export async function setThreadPinned(
  supabase: AlunaSupabaseClient,
  userId: string,
  threadId: string,
  pinned: boolean,
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("chat_threads")
      .update({ pinned, updated_at: new Date().toISOString() })
      .eq("id", threadId)
      .eq("user_id", userId);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Elimina un hilo; por FK `on delete cascade` (0019) se lleva todos sus
 * mensajes con él. Defensivo por dueño + best-effort, mismo criterio que el
 * resto del archivo.
 */
export async function deleteThread(supabase: AlunaSupabaseClient, userId: string, threadId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("chat_threads").delete().eq("id", threadId).eq("user_id", userId);
    return !error;
  } catch {
    return false;
  }
}

/** Tope de mensajes de la vista de DETALLE de un hilo (biblioteca de chat) —
 *  más generoso que RECENT_THREAD_MESSAGE_CAP porque acá la intención es
 *  LEER la conversación completa archivada, no solo retomarla. */
export const THREAD_DETAIL_MESSAGE_CAP = 200;

export interface ThreadDetail {
  id: string;
  surface: ChatSurface;
  pinned: boolean;
  messages: ArchivedMessage[];
}

/**
 * El detalle completo de UN hilo puntual, de cualquier superficie — a
 * diferencia de fetchRecentThread (el MÁS reciente de una superficie), este
 * trae exactamente el hilo que la persona eligió en la lista de la
 * biblioteca. `null` si no existe / no es del usuario (RLS ya lo impide; el
 * `.eq("user_id", …)` es defensa en profundidad) o si cualquier paso falla
 * (best-effort). Misma técnica de "pedir la COLA y revertir" que
 * fetchRecentThread: un hilo viejo y largo no crece sin freno en cada carga.
 */
export async function fetchThreadMessages(
  supabase: AlunaSupabaseClient,
  userId: string,
  threadId: string,
): Promise<ThreadDetail | null> {
  try {
    const { data: thread } = await supabase
      .from("chat_threads")
      .select("id, surface, pinned")
      .eq("id", threadId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!thread) return null;
    const t = thread as { id: string; surface: string; pinned: boolean };

    const { data: messages } = await supabase
      .from("chat_messages")
      .select("id, role, content, created_at")
      .eq("thread_id", threadId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(THREAD_DETAIL_MESSAGE_CAP);

    const chronological = ((messages ?? []) as ArchivedMessage[]).slice().reverse();
    return { id: t.id, surface: (t.surface as ChatSurface) ?? "chat", pinned: t.pinned, messages: chronological };
  } catch {
    return null;
  }
}
