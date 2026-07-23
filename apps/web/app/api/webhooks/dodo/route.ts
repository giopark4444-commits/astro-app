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

// Regex simple (I3): valida que `metadata.aluna_user_id` tenga FORMA de UUID
// antes de confiar en él — defensa mínima contra un payload corrupto o
// manipulado, no una validación de versión/variante RFC4122 estricta.
const UUID_LIKE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validAlunaUserId(metadata: DodoEvent["data"]["metadata"]): string | null {
  const raw = metadata?.aluna_user_id;
  return typeof raw === "string" && UUID_LIKE.test(raw) ? raw : null;
}

// Rescate manual (I3): si un pago de un PACK de créditos no logra resolver a
// ningún usuario (ni metadata.aluna_user_id, ni fila de subscriptions, ni
// email con cuenta Aluna) el pago quedaría cobrado sin que nadie lo note. El
// 200 sigue siendo correcto (Dodo no debe reintentar algo que nunca va a
// resolverse solo), pero este log deja el payment_id para ir a abonar a
// mano. No-op para cualquier evento que no sea un pago de pack (nada que
// rescatar: sin créditos comprometidos).
function warnUnresolvedPackPayment(event: DodoEvent): void {
  if (event.type !== "payment.succeeded") return;
  const hasPack = (event.data.product_cart ?? []).some((item) => packByProductId(item.product_id));
  if (hasPack) {
    console.error(`[webhook dodo] pack de créditos sin usuario resoluble (rescate manual) payment_id=${event.data.payment_id}`);
  }
}

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

  // Orden de resolución del usuario: primero metadata.aluna_user_id (I3 —
  // la sesión de checkout de un PACK siempre lo manda, ver
  // billing/checkout/route.ts; validado con forma de UUID antes de
  // confiar en él, defensa contra un payload corrupto/manipulado), después
  // por dodo_subscription_id (fila ya existente, es `unique` en la tabla),
  // y SOLO si ninguno de los dos resolvió (primer evento de esta
  // suscripción, típicamente subscription.active, o un pack sin metadata)
  // caemos a resolver por el email que manda Dodo en este evento puntual.
  // Por qué preferir metadata sobre el email: un pack es una compra
  // one-time sin fila de subscriptions previa, así que si el email de Dodo
  // no matchea ninguna cuenta Aluna (cuenta con otro correo, email
  // corporativo distinto, etc.) el pago quedaba sin poder resolverse y el
  // crédito se perdía — metadata.aluna_user_id no depende del email en
  // absoluto. Por qué preferir metadata sobre el email también sirve para
  // suscripciones: si el usuario cambia su email de cuenta en Aluna
  // DESPUÉS de suscribirse, los eventos siguientes (renovación,
  // cancelación, etc.) siguen trayendo el email ORIGINAL del customer de
  // Dodo — resolver siempre por email dejaría esa fila obsoleta para
  // siempre. El campo crudo se lee acá mismo (no se duplica el mapeo
  // completo de mapDodoEventToRow, que sigue sin cambios).
  const dodoSubscriptionId = event.data.subscription_id;
  let userId: string | null = validAlunaUserId(event.data.metadata);
  let existingPlan: "monthly" | "yearly" | null = null;

  if (!userId && dodoSubscriptionId) {
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
    if (!email) {
      warnUnresolvedPackPayment(event); // rescate manual (I3) si era un pack de créditos
      return NextResponse.json({ received: true }); // sin fila previa ni email, nada que resolver
    }

    const { data: userIdByEmail, error: rpcError } = await supabase.rpc("user_id_by_email", { lookup_email: email });
    if (rpcError) {
      console.error("[webhook dodo] user_id_by_email falló:", rpcError.message);
      return NextResponse.json({ error: "lookup_failed" }, { status: 500 }); // fallo real, no "no encontrado" — que Dodo reintente
    }
    if (!userIdByEmail) {
      warnUnresolvedPackPayment(event); // rescate manual (I3) si era un pack de créditos
      return NextResponse.json({ received: true }); // sin cuenta Aluna con ese email
    }
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
    // NO es best-effort ante un error real: un cliente que pagó no tiene otra
    // forma de reclamar créditos que nunca llegaron, así que un fallo
    // transitorio de grantCredits fuerza un 500 (ver más abajo) para que Dodo
    // reintente — seguro porque grant_credits es idempotente por `ref`
    // (índice único, migración 0022).
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
        const result = await grantCredits(supabase, userId, totalPackCredits, "purchase", ref);
        if (result === "duplicate") {
          console.log(`[webhook dodo] compra de créditos ya abonada (idempotencia) ref=${ref}`);
        } else if (result === "error") {
          // Error REAL (no "ya abonado" — eso es "duplicate", el índice único
          // haciendo su trabajo). El pago ya se cobró; sin el 500 el cliente
          // quedaría sin sus créditos para siempre porque Dodo no reintenta
          // un 200.
          console.error(`[webhook dodo] abono de pack de créditos falló (error real, forzando retry de Dodo) ref=${ref}`);
          return NextResponse.json({ error: "credit_grant_failed" }, { status: 500 });
        }
      }
    } catch (e) {
      // grantCredits nunca lanza (atrapa internamente) — un throw acá es un
      // bug real en este bloque, no un problema de infraestructura ignorable.
      // Mismo tratamiento que "error" arriba: forzar el retry de Dodo en vez
      // de tragarlo con un 200.
      console.error("[webhook dodo] abono de pack de créditos falló:", e);
      return NextResponse.json({ error: "credit_grant_failed" }, { status: 500 });
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
  // duplique el abono.
  //
  // "duplicate" (ya abonado) sigue en 200 y solo loguea, como siempre. Pero
  // "error" (fallo REAL de red/rpc) ya no es best-effort: el cliente pagó su
  // suscripción y sin el refill se queda sin créditos hasta el próximo ciclo
  // — o para siempre, si nadie lo nota. 500 fuerza a Dodo a reintentar.
  // Ocurre DESPUÉS del upsert de arriba a propósito: el reintento re-hará ese
  // upsert (onConflict user_id, misma fila `row` derivada del mismo evento)
  // de forma inocua, y luego reintentará este mismo grant con el mismo
  // `ref` — que si ya se había abonado en el intento anterior, ahora vuelve
  // "duplicate" en vez de "granted", nunca duplica el abono.
  // M-refill: espejo del guard de packs (`totalPackCredits > 0` arriba) —
  // en 0 (o negativo) ALUNA_PLUS_MONTHLY_CREDITS desactiva el refill limpio
  // en vez de que grant_credits reviente su CHECK `p_amount > 0` y el
  // webhook quede en loop de 500 reintentando algo que nunca va a salir bien.
  if ((event.type === "subscription.active" || event.type === "subscription.renewed") && monthlyRefillCredits() > 0) {
    try {
      const ref = `refill:${row.dodo_subscription_id}:${row.current_period_end ?? "first"}`;
      const result = await grantCredits(supabase, userId, monthlyRefillCredits(), "refill", ref);
      if (result === "duplicate") {
        console.log(`[webhook dodo] refill ya abonado (idempotencia) ref=${ref}`);
      } else if (result === "error") {
        console.error(`[webhook dodo] refill de créditos falló (error real, forzando retry de Dodo) ref=${ref}`);
        return NextResponse.json({ error: "credit_grant_failed" }, { status: 500 });
      }
    } catch (e) {
      // grantCredits nunca lanza — un throw acá es un bug real, mismo
      // tratamiento que "error" arriba.
      console.error("[webhook dodo] refill de créditos falló:", e);
      return NextResponse.json({ error: "credit_grant_failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
