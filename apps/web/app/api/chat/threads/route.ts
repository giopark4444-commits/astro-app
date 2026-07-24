import { NextResponse, type NextRequest } from "next/server";
import { authenticateRoute } from "@/lib/supabase/route-auth";
import { listThreads } from "@/lib/chat-archive";

// Biblioteca de conversaciones (Gio, 2026-07-24: "un historial de todas las
// conversaciones... sin importar de qué sección venga"): lista TODOS los
// hilos del usuario (chat/tarot/timeline), fijados primero. El detalle de
// UNO puntual (mensajes completos) + pin + eliminar viven en
// /api/chat/threads/[id].

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { supabase, user } = await authenticateRoute(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const threads = await listThreads(supabase, user.id);
  return NextResponse.json({ threads });
}
