import { NextResponse, type NextRequest } from "next/server";
import { createServiceSupabaseClient } from "@aluna/supabase/server";
import { verifyDodoSignature } from "@/lib/billing/dodo-webhook";
import { mapDodoEventToRow, type DodoEvent } from "@/lib/billing/dodo-event-mapping";

// Única fuente de verdad del estado de Aluna Plus. Dodo NO manda sesión de
// usuario — manda su propia firma (Standard Webhooks). Server-only,
// service_role (RLS no aplica a escrituras de webhook, igual que
// reading_cache). Responde 200 rápido siempre que la firma sea válida —
// incluso ante eventos no manejados o emails sin cuenta Aluna, para que
// Dodo no reintente en bucle por algo que nunca va a resolver.

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const secret = process.env.DODO_PAYMENTS_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "not_configured" }, { status: 500 });

  const valid = verifyDodoSignature({
    rawBody,
    signatureHeader: request.headers.get("webhook-signature"),
    timestampHeader: request.headers.get("webhook-timestamp"),
    secret,
  });
  if (!valid) return NextResponse.json({ error: "invalid_signature" }, { status: 401 });

  let event: DodoEvent;
  try {
    event = JSON.parse(rawBody) as DodoEvent;
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const email = event.data.customer?.email;
  if (!email) return NextResponse.json({ received: true }); // sin email, nada que resolver

  const supabase = createServiceSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: userId } = await supabase.rpc("user_id_by_email", { lookup_email: email });
  if (!userId) return NextResponse.json({ received: true }); // sin cuenta Aluna con ese email

  const { data: existing } = await supabase
    .from("subscriptions")
    .select("plan")
    .eq("user_id", userId)
    .maybeSingle();

  const row = mapDodoEventToRow(
    event,
    { monthlyProductId: process.env.DODO_PRODUCT_MONTHLY, yearlyProductId: process.env.DODO_PRODUCT_YEARLY },
    (existing?.plan as "monthly" | "yearly" | undefined) ?? null,
  );
  if (!row) return NextResponse.json({ received: true }); // evento no mapeado o payload incompleto

  await supabase.from("subscriptions").upsert({ user_id: userId, ...row }, { onConflict: "user_id" });
  return NextResponse.json({ received: true });
}
