import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDodoClient, dodoProductId } from "@/lib/billing/dodo-client";

// Crea la sesión de checkout de Aluna Plus. SOLO la web la llama (el móvil
// nunca vende dentro de la app). El email sale de la sesión autenticada,
// nunca del body — evita que alguien inicie un checkout a nombre de otro.
export async function POST(request: NextRequest) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const body = (raw ?? {}) as Record<string, unknown>;
  const plan = body.plan === "monthly" || body.plan === "yearly" ? body.plan : null;
  if (!plan) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

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

  try {
    const session = await getDodoClient().checkoutSessions.create({
      product_cart: [{ product_id: dodoProductId(plan), quantity: 1 }],
      customer: { email: user.email },
      subscription_data: { trial_period_days: 14 },
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/ajustes?checkout=success`,
    });
    if (!session.checkout_url) {
      return NextResponse.json({ error: "checkout_failed" }, { status: 500 });
    }
    return NextResponse.json({ checkoutUrl: session.checkout_url });
  } catch {
    return NextResponse.json({ error: "checkout_failed" }, { status: 500 });
  }
}
