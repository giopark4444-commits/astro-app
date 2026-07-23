import { NextResponse, type NextRequest } from "next/server";
import { createServiceSupabaseClient } from "@aluna/supabase/server";
import { verifyDodoSignature } from "@/lib/billing/dodo-webhook";
import { mapDodoEventToRow, type DodoEvent } from "@/lib/billing/dodo-event-mapping";
import { handleReferralPayment, handleReferralRefund } from "@/lib/billing/referral-webhook";
import { grantCredits } from "@/lib/credits/ledger";
import { monthlyRefillCredits, packByProductId } from "@/lib/credits/config";

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

  // refund.succeeded no es evento de suscripción (mapDodoEventToRow no lo
  // mapea) y no necesita resolver `userId` — el payment_ref alcanza para
  // reversar la ganancia en el ledger de referidos. Se resuelve ANTES de la
  // resolución de usuario de abajo para no pagar el costo de un lookup por
  // email que este evento no necesita.
  if (event.type === "refund.succeeded") {
    const referralResult = await handleReferralRefund(supabase, event);
    if (!referralResult.ok) return NextResponse.json({ error: "referral_write_failed" }, { status: 500 }); // error real (no "tabla inexistente") — que Dodo reintente
    return NextResponse.json({ received: true });
  }

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

  // payment.succeeded tampoco es evento de suscripción para mapDodoEventToRow
  // (sigue de largo hacia el early-return de abajo) — pero SÍ reusa el
  // `userId` recién resuelto para atribuir la comisión de referidos si
  // corresponde (ver referral-webhook.ts; nunca revienta ni bloquea el resto
  // del webhook).
  if (event.type === "payment.succeeded" && userId) {
    const referralResult = await handleReferralPayment(supabase, event, userId);
    if (!referralResult.ok) return NextResponse.json({ error: "referral_write_failed" }, { status: 500 }); // error real (no "tabla inexistente") — que Dodo reintente

    // Packs de créditos (Task 7): ADEMÁS de referidos, nunca en su lugar. Un
    // pago de suscripción no trae `product_cart` (ver dodo-event-mapping.ts)
    // así que no confunde ambos casos. Si el carrito trajera más de un pack
    // (raro, pero el checkout de Task 7 solo vende uno a la vez), se abona la
    // SUMA en un único grant con el mismo ref — nunca uno por producto, para
    // no fragmentar la idempotencia de un solo payment_id en varios refs.
    // best-effort: nunca bloquea el 200 del webhook ni pisa el resultado de
    // referidos ya calculado arriba.
    try {
      const paymentId = event.data.payment_id;
      const productCart = event.data.product_cart ?? [];
      let totalPackCredits = 0;
      for (const item of productCart) {
        const pack = packByProductId(item.product_id);
        if (pack) totalPackCredits += pack.credits * (item.quantity || 1);
      }
      if (paymentId && totalPackCredits > 0) {
        const ref = `dodo:${paymentId}`;
        const granted = await grantCredits(supabase, userId, totalPackCredits, "purchase", ref);
        if (!granted) {
          console.log(`[webhook dodo] compra de créditos no otorgada (ya abonada o error) ref=${ref}`);
        }
      }
    } catch (e) {
      console.error("[webhook dodo] abono de pack de créditos falló:", e);
    }
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

  // Refill mensual (Task 7): SOLO subscription.active/renewed (los únicos que
  // mapean a status "active" — ver STATUS_BY_TYPE), y SOLO después de que el
  // upsert de arriba salió bien: la fuente de verdad de current_period_end es
  // la fila recién escrita (`row`), no un campo suelto del payload crudo. El
  // ref namespacea por suscripción + período (`refill:<sub_id>:<period_end>`,
  // "first" si Dodo no manda next_billing_date) — así grant_credits (UNIQUE
  // en el ledger) hace que un reintento del MISMO evento (Dodo reintenta ante
  // cualquier fallo de red, o entrega el mismo evento más de una vez) jamás
  // duplique el abono: la 2ª vez devuelve false y acá simplemente se loguea,
  // sin tocar el 200. Best-effort a propósito: un problema de créditos nunca
  // debe hacer que Dodo reintente infinitamente un evento de suscripción que
  // por lo demás ya se procesó bien.
  if (event.type === "subscription.active" || event.type === "subscription.renewed") {
    try {
      const ref = `refill:${row.dodo_subscription_id}:${row.current_period_end ?? "first"}`;
      const granted = await grantCredits(supabase, userId, monthlyRefillCredits(), "refill", ref);
      if (!granted) {
        console.log(`[webhook dodo] refill no otorgado (ya abonado o error) ref=${ref}`);
      }
    } catch (e) {
      console.error("[webhook dodo] refill de créditos falló:", e);
    }
  }

  return NextResponse.json({ received: true });
}
