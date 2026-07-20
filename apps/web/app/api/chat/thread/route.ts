import { NextResponse, type NextRequest } from "next/server";
import { authenticateRoute } from "@/lib/supabase/route-auth";
import { fetchRecentThread } from "@/lib/chat-archive";

// Retomar el chat principal (Fase 1B): el hilo más reciente de la superficie
// 'chat' con sus mensajes, para que chat-view.tsx precargue la conversación
// al montar en vez de empezar vacía cada vez. Best-effort: fetchRecentThread
// nunca lanza, así que sin hilo (usuario nuevo, o cualquier fallo)
// simplemente responde vacío y el cliente arranca como hoy.

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { supabase, user } = await authenticateRoute(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Gate de memoria (0019, review Fable): sin esto, "retomar" seguía leyendo
  // el hilo aunque la persona hubiera apagado la casilla de memoria — apagarla
  // debe detener TODA la memoria de largo plazo, archivo del hilo incluido
  // (mismo espíritu que el gate `memoryEnabled` de /api/chat/route.ts).
  // Degradación segura: sin fila settings o columna sin migrar todavía, se
  // trata como ON por defecto (`!== false`, no `=== true`).
  let memoryEnabled = true;
  try {
    const { data } = await supabase.from("settings").select("memory_enabled").eq("user_id", user.id).maybeSingle();
    memoryEnabled = (data as { memory_enabled?: boolean } | null)?.memory_enabled !== false;
  } catch {
    // degradación: sin fila/columna todavía, la memoria se trata como ON
  }
  if (!memoryEnabled) return NextResponse.json({ threadId: null, messages: [] });

  const recent = await fetchRecentThread(supabase, user.id, "chat");
  if (!recent) return NextResponse.json({ threadId: null, messages: [] });

  return NextResponse.json({
    threadId: recent.threadId,
    messages: recent.messages.map((m) => ({ role: m.role, content: m.content })),
  });
}
