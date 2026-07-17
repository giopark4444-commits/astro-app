import { NextResponse, type NextRequest } from "next/server";
import { isPlusActive } from "@aluna/core";
import { authenticateRoute } from "@/lib/supabase/route-auth";
import { validateReadingPayload } from "@/lib/tarot/validate-reading";
import type { Json, Tables, TablesInsert } from "@aluna/supabase";

// El diario de lecturas: guardar y listar. spread/cards/deck se validan SIEMPRE
// contra el motor (@aluna/core, validate-reading.ts) antes de tocar la BD — el
// cliente nunca decide qué carta cayó ni en qué posición. user_id sale de la
// sesión verificada, nunca del body (mismo patrón que manifestations).

export const runtime = "nodejs";

// Máximo de lecturas GUARDADAS (spread ≠ 'daily') para un usuario sin Plus. La
// carta del día NUNCA cuenta aquí ni se bloquea: es el hábito diario, siempre
// gratis, y su límite es "una por día" (lo impone dailySeed, no este gate).
const FREE_SAVED_READINGS_LIMIT = 7;
// Techo de lecturas devueltas por GET; T2 no tiene paginación.
const GET_LIMIT = 20;
// Cuántas ve un usuario free en la lista (la UI ofrece Plus para ver el resto).
const FREE_VISIBLE_READINGS = 7;

type SubscriptionRow = { status: string; current_period_end: string | null };

// exactOptionalPropertyTypes colapsa el arg de insert()/select() a `never` con
// la versión instalada de postgrest-js (mismo shim que manifestations/route.ts).
type TarotInsertBuilder = {
  insert: (v: TablesInsert<"tarot_readings">) => {
    select: () => {
      maybeSingle: () => Promise<{ data: Tables<"tarot_readings"> | null; error: { message: string } | null }>;
    };
  };
};

async function isRequesterPlus(
  supabase: Awaited<ReturnType<typeof authenticateRoute>>["supabase"],
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("user_id", userId)
    .maybeSingle();
  const sub = data as SubscriptionRow | null;
  return isPlusActive(sub ? { status: sub.status as never, currentPeriodEnd: sub.current_period_end } : null);
}

export async function POST(request: NextRequest) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const { supabase, user } = await authenticateRoute(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const validated = validateReadingPayload(raw);
  if (!validated.ok) return NextResponse.json({ error: validated.error }, { status: 400 });
  const { spread, question, cards, deck } = validated.value;

  // Gate free: el diario ('daily') está SIEMPRE exento — nunca se bloquea el
  // hábito diario. Solo spreads guardados a propósito (three, y celtic-cross
  // en T3) cuentan contra el límite de 7 para no-Plus.
  if (spread !== "daily") {
    const plus = await isRequesterPlus(supabase, user.id);
    if (!plus) {
      const { count, error: countError } = await supabase
        .from("tarot_readings")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .neq("spread", "daily");
      if (countError) {
        console.error("[tarot/readings] count failed", countError);
        return NextResponse.json({ error: "db" }, { status: 500 });
      }
      if ((count ?? 0) >= FREE_SAVED_READINGS_LIMIT) {
        return NextResponse.json({ error: "free_limit" }, { status: 403 });
      }
    }
  }

  const row: TablesInsert<"tarot_readings"> = {
    user_id: user.id, // ← de la sesión verificada, nunca del body
    spread,
    question: question ?? null,
    cards: cards as unknown as Json,
    deck,
  };
  const builder = supabase.from("tarot_readings") as unknown as TarotInsertBuilder;
  const { data, error } = await builder.insert(row).select().maybeSingle();
  if (error) {
    console.error("[tarot/readings] insert failed", error); // observabilidad; no se filtra al cliente
    return NextResponse.json({ error: "db" }, { status: 500 });
  }
  return NextResponse.json({ reading: data }, { status: 201 });
}

export async function GET(request: NextRequest) {
  const { supabase, user } = await authenticateRoute(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // RLS ya scopea al dueño; el .eq es defensivo (segunda capa, cero costo).
  // count:"exact" trae el total real (no acotado por el limit) para que la UI
  // muestre "N guardadas · Plus para ver todas" aunque solo devolvamos 7-20.
  const { data, error, count } = await supabase
    .from("tarot_readings")
    .select("*", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(GET_LIMIT);
  if (error) {
    console.error("[tarot/readings] list failed", error);
    return NextResponse.json({ error: "db" }, { status: 500 });
  }

  const readings = data ?? [];
  const plus = await isRequesterPlus(supabase, user.id);
  const visible = plus ? readings : readings.slice(0, FREE_VISIBLE_READINGS);

  return NextResponse.json({ readings: visible, total: count ?? readings.length });
}
