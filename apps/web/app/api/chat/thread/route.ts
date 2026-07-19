import { NextResponse, type NextRequest } from "next/server";
import { authenticateRoute } from "@/lib/supabase/route-auth";
import { fetchRecentThread } from "@/lib/chat-archive";

// Retomar el chat principal (Fase 1B): el hilo más reciente de la superficie
// 'chat' con sus mensajes, para que chat-view.tsx precargue la conversación
// al montar en vez de empezar vacía cada vez. Best-effort: fetchRecentThread
// nunca lanza, así que sin hilo (usuario nuevo, memoria apagada, o cualquier
// fallo) simplemente responde vacío y el cliente arranca como hoy.

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { supabase, user } = await authenticateRoute(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const recent = await fetchRecentThread(supabase, user.id, "chat");
  if (!recent) return NextResponse.json({ threadId: null, messages: [] });

  return NextResponse.json({
    threadId: recent.threadId,
    messages: recent.messages.map((m) => ({ role: m.role, content: m.content })),
  });
}
