import { NextResponse, type NextRequest } from "next/server";
import { authenticateRoute } from "@/lib/supabase/route-auth";
import { createServiceSupabaseClient } from "@aluna/supabase/server";
import { deckCardPath, isValidCardId, validateDeckImage } from "@/lib/tarot/deck-storage";
import type { Tables, TablesInsert } from "@aluna/supabase";

// Subida/borrado de una carta individual del mazo custom. Espejo de
// /api/avatar: path SIEMPRE derivado de user.id, cardId validado contra las
// 78 cartas reales (nunca se confía en el string del cliente para el path
// ni para el array persistido).

export const runtime = "nodejs";

// Mismo shim que deck/route.ts (exactOptionalPropertyTypes vs postgrest-js).
type DeckUpsertBuilder = {
  upsert: (
    v: TablesInsert<"tarot_deck">,
    opts: { onConflict: string },
  ) => Promise<{ error: { message: string } | null }>;
};

async function currentCardIds(
  svc: ReturnType<typeof createServiceSupabaseClient>,
  userId: string,
): Promise<string[]> {
  const { data } = await svc.from("tarot_deck").select("card_ids").eq("user_id", userId).maybeSingle();
  return (data as Pick<Tables<"tarot_deck">, "card_ids"> | null)?.card_ids ?? [];
}

export async function POST(req: NextRequest) {
  const { user } = await authenticateRoute(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ error: "unavailable" }, { status: 503 });

  const form = await req.formData();
  const cardId = form.get("cardId");
  const file = form.get("file");
  if (typeof cardId !== "string" || !isValidCardId(cardId)) {
    return NextResponse.json({ error: "bad_card" }, { status: 400 });
  }
  if (!(file instanceof File)) return NextResponse.json({ error: "nofile" }, { status: 400 });

  const check = validateDeckImage({ type: file.type, size: file.size });
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });

  const svc = createServiceSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
  const path = deckCardPath(user.id, cardId); // ← de la sesión verificada, no del cliente
  const bytes = new Uint8Array(await file.arrayBuffer());

  const up = await svc.storage.from("tarot-decks").upload(path, bytes, { upsert: true, contentType: file.type });
  if (up.error) {
    console.error("[tarot/deck/card] upload failed", up.error);
    return NextResponse.json({ error: "upload" }, { status: 500 });
  }

  const ids = new Set(await currentCardIds(svc, user.id));
  ids.add(cardId);
  const builder = svc.from("tarot_deck") as unknown as DeckUpsertBuilder;
  const { error } = await builder.upsert({ user_id: user.id, card_ids: [...ids] }, { onConflict: "user_id" });
  if (error) {
    console.error("[tarot/deck/card] db update failed", error);
    return NextResponse.json({ error: "db" }, { status: 500 });
  }

  const { data } = svc.storage.from("tarot-decks").getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}

export async function DELETE(req: NextRequest) {
  const { user } = await authenticateRoute(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ error: "unavailable" }, { status: 503 });

  const cardId = req.nextUrl.searchParams.get("cardId");
  if (!cardId || !isValidCardId(cardId)) return NextResponse.json({ error: "bad_card" }, { status: 400 });

  const svc = createServiceSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
  const path = deckCardPath(user.id, cardId);

  const rm = await svc.storage.from("tarot-decks").remove([path]);
  if (rm.error) {
    console.error("[tarot/deck/card] remove failed", rm.error);
    return NextResponse.json({ error: "storage" }, { status: 500 });
  }

  const ids = new Set(await currentCardIds(svc, user.id));
  ids.delete(cardId);
  const builder = svc.from("tarot_deck") as unknown as DeckUpsertBuilder;
  const { error } = await builder.upsert({ user_id: user.id, card_ids: [...ids] }, { onConflict: "user_id" });
  if (error) {
    console.error("[tarot/deck/card] db update failed", error);
    return NextResponse.json({ error: "db" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
