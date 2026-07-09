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
    webhookId: request.headers.get("webhook-id"),
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

  const supabase = createServiceSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Orden de resolución del usuario: primero por dodo_subscription_id (fila
  // ya existente, es `unique` en la tabla), y SOLO si no existe todavía
  // (primer evento de esta suscripción, típicamente subscription.active)
  // caemos a resolver por el email que manda Dodo en este evento puntual.
  // Por qué: si el usuario cambia su email de cuenta en Aluna DESPUÉS de
  // suscribirse, los eventos siguientes (renovación, cancelación, etc.)
  // siguen trayendo el email ORIGINAL del customer de Dodo — resolver
  // siempre por email dejaría esa fila obsoleta para siempre. El campo crudo
  // se lee acá mismo (no se duplica el mapeo completo de mapDodoEventToRow,
  // que sigue sin cambios).
  const dodoSubscriptionId = event.data.subscription_id;
  let userId: string | null = null;
  let existingPlan: "monthly" | "yearly" | null = null;

  if (dodoSubscriptionId) {
    const { data: bySubscription, error: bySubscriptionError } = await supabase
      .from("subscriptions")
      .select("user_id, plan")
      .eq("dodo_subscription_id", dodoSubscriptionId)
      .maybeSingle();
    if (bySubscriptionError) {
      console.error("[webhook dodo] lectura de subscriptions por dodo_subscription_id falló:", bySubscriptionError.message);
      return NextResponse.json({ error: "lookup_failed" }, { status: 500 });
    }
    if (bySubscription) {
      userId = bySubscription.user_id;
      existingPlan = (bySubscription.plan as "monthly" | "yearly" | undefined) ?? null;
    }
  }

  if (!userId) {
    const email = event.data.customer?.email;
    if (!email) return NextResponse.json({ received: true }); // sin fila previa ni email, nada que resolver

    const { data: userIdByEmail, error: rpcError } = await supabase.rpc("user_id_by_email", { lookup_email: email });
    if (rpcError) {
      console.error("[webhook dodo] user_id_by_email falló:", rpcError.message);
      return NextResponse.json({ error: "lookup_failed" }, { status: 500 }); // fallo real, no "no encontrado" — que Dodo reintente
    }
    if (!userIdByEmail) return NextResponse.json({ received: true }); // sin cuenta Aluna con ese email
    userId = userIdByEmail;

    const { data: existing, error: existingError } = await supabase
      .from("subscriptions")
      .select("plan")
      .eq("user_id", userId)
      .maybeSingle();
    if (existingError) {
      console.error("[webhook dodo] lectura de subscriptions falló:", existingError.message);
      return NextResponse.json({ error: "lookup_failed" }, { status: 500 }); // no confundir con "sin fila" — puede disparar el downgrade fantasma yearly→monthly
    }
    existingPlan = (existing?.plan as "monthly" | "yearly" | undefined) ?? null;
  }

  const row = mapDodoEventToRow(
    event,
    { monthlyProductId: process.env.DODO_PRODUCT_MONTHLY, yearlyProductId: process.env.DODO_PRODUCT_YEARLY },
    existingPlan,
  );
  if (!row) return NextResponse.json({ received: true }); // evento no mapeado o payload incompleto

  const { error: upsertError } = await supabase
    .from("subscriptions")
    .upsert({ user_id: userId, ...row }, { onConflict: "user_id" });
  if (upsertError) {
    console.error("[webhook dodo] upsert de subscriptions falló:", upsertError.message);
    return NextResponse.json({ error: "write_failed" }, { status: 500 }); // 2xx acá dejaría a Dodo y Aluna divergiendo en silencio
  }

  return NextResponse.json({ received: true });
}
