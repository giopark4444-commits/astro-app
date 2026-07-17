import { NextResponse, type NextRequest } from "next/server";
import { authenticateRoute } from "@/lib/supabase/route-auth";
import { createServiceSupabaseClient } from "@aluna/supabase/server";
import { deckBackPath } from "@/lib/tarot/deck-storage";
import type { Tables, TablesInsert } from "@aluna/supabase";

// Manifiesto + activación del mazo custom. Espejo de /api/avatar: latente
// (503/{available:false}) sin SUPABASE_SERVICE_ROLE_KEY, path SIEMPRE de
// user.id, validación server-side fuente de verdad.

export const runtime = "nodejs";

// exactOptionalPropertyTypes colapsa el arg de upsert() a `never` con la
// versión instalada de postgrest-js (mismo shim que avatar/route.ts y
// tarot/readings/route.ts).
type DeckUpsertBuilder = {
  upsert: (
    v: TablesInsert<"tarot_deck">,
    opts: { onConflict: string },
  ) => Promise<{ error: { message: string } | null }>;
};

function serviceKeyOrGate(): string | null {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? null;
}

export async function GET(req: NextRequest) {
  const { supabase, user } = await authenticateRoute(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const serviceKey = serviceKeyOrGate();
  if (!serviceKey) return NextResponse.json({ available: false }, { status: 503 });

  // RLS scopea al dueño; el cliente autenticado ya basta para leer (no hace
  // falta service-role para el select, pero la feature entera está gateada
  // por la llave — sin ella ninguna escritura funcionaría de todos modos).
  const { data, error } = await supabase
    .from("tarot_deck")
    .select("active, card_ids, back_kind")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) {
    console.error("[tarot/deck] read failed", error);
    return NextResponse.json({ error: "db" }, { status: 500 });
  }

  const row = data as Pick<Tables<"tarot_deck">, "active" | "card_ids" | "back_kind"> | null;
  if (!row) {
    return NextResponse.json({ available: true, active: false, cardIds: [], backKind: "none", backUrl: null });
  }

  const backUrl =
    row.back_kind === "none" ? null : supabase.storage.from("tarot-decks").getPublicUrl(deckBackPath(user.id)).data.publicUrl;

  return NextResponse.json({
    available: true,
    active: row.active,
    cardIds: row.card_ids,
    backKind: row.back_kind,
    backUrl,
  });
}

export async function PUT(req: NextRequest) {
  const { user } = await authenticateRoute(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const serviceKey = serviceKeyOrGate();
  if (!serviceKey) return NextResponse.json({ error: "unavailable" }, { status: 503 });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const active = (raw as { active?: unknown } | null)?.active;
  if (typeof active !== "boolean") return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const svc = createServiceSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
  const builder = svc.from("tarot_deck") as unknown as DeckUpsertBuilder;
  const { error } = await builder.upsert({ user_id: user.id, active }, { onConflict: "user_id" });
  if (error) {
    console.error("[tarot/deck] activate failed", error);
    return NextResponse.json({ error: "db" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
