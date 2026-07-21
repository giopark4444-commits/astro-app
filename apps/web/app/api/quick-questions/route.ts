import { NextResponse, type NextRequest } from "next/server";
import { authenticateRoute } from "@/lib/supabase/route-auth";
import { parseQuickQuestions } from "@/lib/quick-questions";

// Accesos rápidos del chat: devuelve las 2×6 preguntas del usuario, o los
// defaults del locale si nunca guardó nada. Best-effort: sin fila/columna
// (0021 sin aplicar todavía) degrada a defaults, nunca lanza.
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { supabase, user } = await authenticateRoute(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const locale = request.nextUrl.searchParams.get("locale") ?? "es";
  let raw: unknown = null;
  try {
    const { data } = await supabase
      .from("settings")
      .select("quick_questions")
      .eq("user_id", user.id)
      .maybeSingle();
    raw = (data as { quick_questions?: unknown } | null)?.quick_questions ?? null;
  } catch {
    // degradación: sin fila/columna todavía → defaults
  }
  return NextResponse.json({ pages: parseQuickQuestions(raw, locale) });
}
