import { NextResponse, type NextRequest } from "next/server";
import { authenticateRoute } from "@/lib/supabase/route-auth";
import { fetchThreadMessages, setThreadPinned, deleteThread } from "@/lib/chat-archive";

// Un hilo puntual de la biblioteca de conversaciones (Gio, 2026-07-24): ver
// su transcripción completa (GET), fijar/desfijar (PATCH {pinned}) o
// eliminarlo (DELETE) — el listado vive en /api/chat/threads.

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await authenticateRoute(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const detail = await fetchThreadMessages(supabase, user.id, id);
  if (!detail) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(detail);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await authenticateRoute(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const body = (raw ?? {}) as Record<string, unknown>;
  if (typeof body.pinned !== "boolean") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const { id } = await params;
  const ok = await setThreadPinned(supabase, user.id, id, body.pinned);
  if (!ok) return NextResponse.json({ error: "db" }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await authenticateRoute(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const ok = await deleteThread(supabase, user.id, id);
  if (!ok) return NextResponse.json({ error: "db" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
