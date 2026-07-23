import { NextResponse, type NextRequest } from "next/server";
import { authenticateRoute } from "@/lib/supabase/route-auth";

type LedgerRow = { delta: number; kind: string; created_at: string };

// Saldo de créditos + últimos movimientos del usuario autenticado. La UI
// (Tasks 8-9) pollea este endpoint. Usa el client DEL REQUEST (respeta RLS
// vía auth.uid() interno del rpc / policy select-own del ledger) — nunca
// service-role. Nunca 500 por datos: rpc o select caídos degradan a
// balance 0 / ledger vacío (mismo criterio fail-safe que lib/credits/ledger.ts).
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { supabase, user } = await authenticateRoute(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let balance = 0;
  try {
    const { data, error } = await supabase.rpc("my_credit_balance");
    if (!error && typeof data === "number") balance = data;
  } catch {
    // rpc caído/red → balance 0, nunca 500
  }

  let ledger: LedgerRow[] = [];
  try {
    const { data, error } = await supabase
      .from("credit_ledger")
      .select("delta, kind, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    if (!error && Array.isArray(data)) ledger = data as LedgerRow[];
  } catch {
    // select caído/red → ledger vacío, nunca 500
  }

  return NextResponse.json({ balance, ledger });
}
