import { NextResponse, type NextRequest } from "next/server";
import { authenticateRoute } from "@/lib/supabase/route-auth";

export const runtime = "nodejs";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await authenticateRoute(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  // RLS ya scopea al dueño; el .eq("user_id", ...) es defensivo (segunda capa).
  const { error } = await supabase.from("journal_notes").delete().eq("id", id).eq("user_id", user.id);
  if (error) {
    console.error("[journal] delete failed", error); // observabilidad; no se filtra al cliente
    return NextResponse.json({ error: "db" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
