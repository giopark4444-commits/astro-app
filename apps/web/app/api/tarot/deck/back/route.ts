import { NextResponse, type NextRequest } from "next/server";
import { authenticateRoute } from "@/lib/supabase/route-auth";
import { createServiceSupabaseClient } from "@aluna/supabase/server";
import { deckBackPath, validateDeckImage, validateBackConfig, renderBackWebp } from "@/lib/tarot/deck-storage";
import type { Json, TablesInsert } from "@aluna/supabase";

// Reverso del mazo custom: subida directa de imagen, o generado desde el
// editor (config → SVG puro de @aluna/core → webp con sharp). Mismo patrón
// latente/path-de-sesión que /api/avatar y el resto de tarot/deck/*.

export const runtime = "nodejs";

// Mismo shim que deck/route.ts (exactOptionalPropertyTypes vs postgrest-js).
type DeckUpsertBuilder = {
  upsert: (
    v: TablesInsert<"tarot_deck">,
    opts: { onConflict: string },
  ) => Promise<{ error: { message: string } | null }>;
};

export async function POST(req: NextRequest) {
  const { user } = await authenticateRoute(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ error: "unavailable" }, { status: 503 });

  const contentType = req.headers.get("content-type") ?? "";
  const path = deckBackPath(user.id); // ← de la sesión verificada, no del cliente
  const svc = createServiceSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);

  let bytes: Uint8Array;
  let contentTypeForUpload: string;
  let backKind: "upload" | "editor";
  let backConfig: Json | null = null;

  if (contentType.includes("multipart/form-data")) {
    // Modo (a): subida directa de imagen.
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "nofile" }, { status: 400 });

    const check = validateDeckImage({ type: file.type, size: file.size });
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });

    bytes = new Uint8Array(await file.arrayBuffer());
    contentTypeForUpload = file.type;
    backKind = "upload";
  } else {
    // Modo (b): editor — config → SVG puro → webp. La config del cliente es
    // solo UX; validateBackConfig es la fuente de verdad server-side.
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }
    const cfg = validateBackConfig((raw as { config?: unknown } | null)?.config);
    if (!cfg) return NextResponse.json({ error: "bad_config" }, { status: 400 });

    bytes = new Uint8Array(await renderBackWebp(cfg));
    contentTypeForUpload = "image/webp";
    backKind = "editor";
    backConfig = cfg as unknown as Json;
  }

  const up = await svc.storage.from("tarot-decks").upload(path, bytes, { upsert: true, contentType: contentTypeForUpload });
  if (up.error) {
    console.error("[tarot/deck/back] upload failed", up.error);
    return NextResponse.json({ error: "upload" }, { status: 500 });
  }

  const builder = svc.from("tarot_deck") as unknown as DeckUpsertBuilder;
  const { error } = await builder.upsert(
    { user_id: user.id, back_kind: backKind, back_config: backConfig },
    { onConflict: "user_id" },
  );
  if (error) {
    console.error("[tarot/deck/back] db update failed", error);
    return NextResponse.json({ error: "db" }, { status: 500 });
  }

  const { data } = svc.storage.from("tarot-decks").getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
