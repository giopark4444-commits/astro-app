import { NextResponse, type NextRequest } from "next/server";
import { authenticateRoute } from "@/lib/supabase/route-auth";
import { fetchMemories } from "@/lib/memories";
import { fetchEntities } from "@/lib/memory-entities";
import { validateImportPayload, dedupeMemories, dedupeEntities } from "@/lib/memory-import";

// Importa la memoria del usuario (Fase 1C, hermana de /api/memory/export):
// el body es el JSON que exportó esta misma ruta (u otra cuenta/instalación).
// user_id SIEMPRE de la sesión verificada (nunca del body, mismo criterio que
// journal/route.ts) — RLS lo forzaría igual, pero queda explícito. Dedupe
// contra lo que el usuario ya tiene: memorias por content case-insensitive,
// entidades por (kind, nombre) case-insensitive — nunca duplica lo que ya
// está. Best-effort: un item de basura se descarta sin abortar el resto
// (ver validateImportPayload); un fallo de BD cae a 500.
//
// Orden deliberado (review Fable): autentica ANTES de tocar el body — un
// anónimo no debe poder gastar CPU parseando JSON. Y el body tiene un tope de
// tamaño (MAX_IMPORT_BODY_BYTES) chequeado por Content-Length primero (sin
// leer nada) y de nuevo sobre el texto ya leído (defensa en profundidad:
// Content-Length puede faltar o mentir, p.ej. chunked transfer-encoding).

export const runtime = "nodejs";

// ~1 MB: un export real de una cuenta (memorias+entidades, ambas con tope
// duro en validateImportPayload) pesa un fracción de esto; el tope existe
// para frenar un body adversarial, no para limitar un import legítimo.
const MAX_IMPORT_BODY_BYTES = 1_000_000;

export async function POST(request: NextRequest) {
  const { supabase, user } = await authenticateRoute(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const contentLength = Number(request.headers.get("content-length") ?? "");
  if (Number.isFinite(contentLength) && contentLength > MAX_IMPORT_BODY_BYTES) {
    return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  }

  let raw: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_IMPORT_BODY_BYTES) {
      return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
    }
    raw = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const parsed = validateImportPayload(raw);
  if (!parsed) return NextResponse.json({ error: "invalid_payload" }, { status: 400 });

  try {
    const [existingMemories, existingEntities] = await Promise.all([
      fetchMemories(supabase, user.id),
      fetchEntities(supabase, user.id),
    ]);

    const { toInsert: memoriesToInsert, skipped: memoriesSkipped } = dedupeMemories(parsed.memories, existingMemories);
    const { toInsert: entitiesToInsert, skipped: entitiesSkipped } = dedupeEntities(parsed.entities, existingEntities);

    if (memoriesToInsert.length > 0) {
      const rows = memoriesToInsert.map((m) => ({ user_id: user.id, content: m.content, source: m.source }));
      const { error } = await supabase.from("user_memories").insert(rows);
      if (error) throw error;
    }

    if (entitiesToInsert.length > 0) {
      const rows = entitiesToInsert.map((e) => ({
        user_id: user.id,
        kind: e.kind,
        name: e.name,
        summary: e.summary,
        aliases: e.aliases,
        pinned: e.pinned,
        source: "import",
      }));
      const { error } = await supabase.from("memory_entities").insert(rows);
      if (error) throw error;
    }

    return NextResponse.json({
      imported: { memories: memoriesToInsert.length, entities: entitiesToInsert.length },
      skipped: { memories: memoriesSkipped, entities: entitiesSkipped },
    });
  } catch (err) {
    console.error("[memory import] failed", err); // observabilidad; no se filtra al cliente
    return NextResponse.json({ error: "import_failed" }, { status: 500 });
  }
}
