import { NextResponse, type NextRequest } from "next/server";
import { authenticateRoute } from "@/lib/supabase/route-auth";
import type { Tables, TablesInsert } from "@aluna/supabase";

// CRUD del diario (cuaderno nocturno). Igual que manifestaciones pero sin
// efemérides: user_id SIEMPRE de la sesión verificada, cliente de sesión (RLS).

export const runtime = "nodejs";

const MAX_BODY_LEN = 2000;
const KINDS = ["dream", "transit", "idea", "note"] as const;

// exactOptionalPropertyTypes hace que postgrest-js infiera el arg de insert() como
// `never` (mismo shim que avatar-upload.tsx / app/onboarding/actions.ts).
type JournalInsertBuilder = {
  insert: (v: TablesInsert<"journal_notes">) => {
    select: () => {
      maybeSingle: () => Promise<{ data: Tables<"journal_notes"> | null; error: { message: string } | null }>;
    };
  };
};

export async function POST(request: NextRequest) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const rawBody = (raw ?? {}) as Record<string, unknown>;

  const { supabase, user } = await authenticateRoute(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const kind = String(rawBody.kind ?? "");
  if (!(KINDS as readonly string[]).includes(kind)) {
    return NextResponse.json({ error: "invalid_kind" }, { status: 400 });
  }

  const noteBody = typeof rawBody.body === "string" ? rawBody.body : "";
  if (noteBody.length < 1 || noteBody.length > MAX_BODY_LEN) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const row: TablesInsert<"journal_notes"> = {
    user_id: user.id, // ← de la sesión verificada, no del body
    body: noteBody,
    kind,
  };
  const builder = supabase.from("journal_notes") as unknown as JournalInsertBuilder;
  const { data, error } = await builder.insert(row).select().maybeSingle();
  if (error) {
    console.error("[journal] insert failed", error); // observabilidad; no se filtra al cliente
    return NextResponse.json({ error: "db" }, { status: 500 });
  }
  return NextResponse.json({ note: data });
}

export async function GET(request: NextRequest) {
  const { supabase, user } = await authenticateRoute(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // RLS ya scopea al dueño; el .eq es defensivo (segunda capa, cero costo).
  const { data, error } = await supabase
    .from("journal_notes")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[journal] list failed", error);
    return NextResponse.json({ error: "db" }, { status: 500 });
  }
  return NextResponse.json({ notes: data ?? [] });
}
