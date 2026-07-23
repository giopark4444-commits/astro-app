import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDodoClient, dodoProductId } from "@/lib/billing/dodo-client";
import { resolveReferralMetadata } from "@/lib/billing/referral-checkout";
import { packById, packProductId } from "@/lib/credits/config";

// Crea la sesión de checkout de Aluna Plus (suscripción) O de un pack de
// créditos (Task 7, compra one-time) — nunca ambos en la misma request. SOLO
// la web la llama (el móvil nunca vende dentro de la app). El email sale de
// la sesión autenticada, nunca del body — evita que alguien inicie un
// checkout a nombre de otro.
export async function POST(request: NextRequest) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const body = (raw ?? {}) as Record<string, unknown>;
  const plan = body.plan === "monthly" || body.plan === "yearly" ? body.plan : null;
  const packId = typeof body.pack === "string" ? body.pack : null;
  // Exactamente uno de los dos — `plan` y `pack` no son intercambiables en la
  // misma request (uno abre suscripción, el otro un cart one-time distinto).
  if ((plan && packId) || (!plan && !packId)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const pack = packId ? packById(packId) : null;
  if (packId && !pack) return NextResponse.json({ error: "bad_request" }, { status: 400 }); // id de pack desconocido

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Packs de créditos: compra one-time, SIEMPRE comprable (a diferencia de
  // los planes, no aplica el guard de already_subscribed de abajo — tener
  // Plus activo no impide comprar créditos sueltos) y sin `subscription_data`
  // (no hay trial en una compra suelta). return_url distinto (`?checkout=
  // credits`) para que la UI de vuelta muestre el mensaje correcto.
  if (pack) {
    const productId = packProductId(pack);
    if (!productId) return NextResponse.json({ error: "pack_not_configured" }, { status: 500 });
    try {
      const session = await getDodoClient().checkoutSessions.create({
        product_cart: [{ product_id: productId, quantity: 1 }],
        customer: { email: user.email },
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/ajustes?checkout=credits`,
      });
      if (!session.checkout_url) {
        return NextResponse.json({ error: "checkout_failed" }, { status: 500 });
      }
      return NextResponse.json({ checkoutUrl: session.checkout_url });
    } catch {
      return NextResponse.json({ error: "checkout_failed" }, { status: 500 });
    }
  }
  // Inalcanzable en los hechos (los guards de arriba ya garantizan que si
  // `pack` es null acá, `plan` es no-nulo) — deja a TS estrechar `plan` para
  // el resto del camino existente de abajo.
  if (!plan) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  // Guarda contra doble-suscripción: sin esto, alguien que ya es cliente
  // (trialing/active/past_due) podría abrir otra sesión de checkout y Dodo le
  // daría OTRA prueba gratis de 14 días. RLS ya limita el select a la fila
  // propia del usuario.
  const { data: existingSubscription, error: existingSubscriptionError } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existingSubscriptionError) {
    console.error("[billing checkout] lectura de subscriptions falló:", existingSubscriptionError.message);
    return NextResponse.json({ error: "lookup_failed" }, { status: 500 }); // fail closed: no dejar pasar el guard anti-doble-suscripción por un hiccup de DB
  }
  // Cast necesario: mismo bug de inferencia de @supabase/ssr que colapsa el
  // tipo de fila a `never` (workaround ya usado en ajustes/page.tsx y
  // billing/portal/route.ts).
  const sub = existingSubscription as { status: string } | null;
  if (sub && (sub.status === "trialing" || sub.status === "active" || sub.status === "past_due")) {
    return NextResponse.json({ error: "already_subscribed" }, { status: 409 });
  }

  // Referidos (brief T6, preparado/latente): si el usuario está referido por
  // un código activo con descuento > 0, adjunta SIEMPRE el código en metadata
  // como respaldo de atribución manual — nunca lanza, nunca bloquea el
  // checkout (ver resolveReferralMetadata).
  const referralMetadata = await resolveReferralMetadata(supabase);

  try {
    const session = await getDodoClient().checkoutSessions.create({
      product_cart: [{ product_id: dodoProductId(plan), quantity: 1 }],
      customer: { email: user.email },
      subscription_data: { trial_period_days: 14 },
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/ajustes?checkout=success`,
      // TODO-Dodo: cuando haya DODO_PAYMENTS_API_KEY real y se hayan
      // creado/mapeado discount codes reales en el dashboard de Dodo (uno por
      // cada referral_codes.discount_pct), pasar acá el nuevo campo
      // `discount_codes: string[]` de CheckoutSessionCreateParams (o el
      // `discount_code` deprecado) para que Dodo aplique el % de verdad en el
      // checkout. Ver docs.dodopayments.com — sección Discounts (endpoint
      // POST /discounts para crearlos) — para el flujo de creación. Por ahora
      // SOLO se manda `referral_code` en metadata: NO se llama la API de
      // discounts sin llave (regla dura del brief).
      ...(referralMetadata ? { metadata: referralMetadata } : {}),
    });
    if (!session.checkout_url) {
      return NextResponse.json({ error: "checkout_failed" }, { status: 500 });
    }
    return NextResponse.json({ checkoutUrl: session.checkout_url });
  } catch {
    return NextResponse.json({ error: "checkout_failed" }, { status: 500 });
  }
}
