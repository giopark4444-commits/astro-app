import { NextResponse, type NextRequest } from "next/server";
import { authenticateRoute } from "@/lib/supabase/route-auth";
import { fetchMemories } from "@/lib/memories";
import { fetchEntities } from "@/lib/memory-entities";
import { fetchEssence } from "@/lib/memory-essence";
import { fetchCommitmentsForExport } from "@/lib/memory-commitments";
import { buildMemoryExport, formatMemoryExportMarkdown } from "@/lib/memory-export";
import type { Locale } from "@/lib/settings";

// Exporta la memoria del usuario (Fase 1C): portabilidad ya prometida en la
// política de privacidad. `?format=json` (default) para un JSON máquina-
// legible (útil para reimportar, ver /api/memory/import) o `?format=md` para
// un documento humano-legible ("Lo que Aluna sabe de ti"). Best-effort total:
// cualquier fallo cae a 500 con JSON de error, nunca una página rota.

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await authenticateRoute(request);
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const format = request.nextUrl.searchParams.get("format") === "md" ? "md" : "json";

    const [memories, entities, essence, commitments] = await Promise.all([
      fetchMemories(supabase, user.id),
      fetchEntities(supabase, user.id),
      fetchEssence(supabase, user.id),
      fetchCommitmentsForExport(supabase, user.id),
    ]);
    const payload = buildMemoryExport(memories, entities, essence, commitments);

    if (format === "md") {
      // Respeta el idioma guardado en settings; si la lectura falla (tabla sin
      // migrar, red) o el valor no es reconocido, cae a español.
      let locale: Locale = "es";
      try {
        const { data } = await supabase.from("settings").select("language").eq("user_id", user.id).maybeSingle();
        if ((data as { language?: string } | null)?.language === "en") locale = "en";
      } catch {
        // best-effort: sin locale guardado, el documento sale en español
      }

      return new NextResponse(formatMemoryExportMarkdown(payload, locale), {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": 'attachment; filename="aluna-memoria.md"',
        },
      });
    }

    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": 'attachment; filename="aluna-memoria.json"',
      },
    });
  } catch (err) {
    console.error("[memory export] failed", err); // observabilidad; no se filtra al cliente
    return NextResponse.json({ error: "export_failed" }, { status: 500 });
  }
}
