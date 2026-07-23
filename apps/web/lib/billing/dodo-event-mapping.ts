// Traduce un evento de webhook de Dodo Payments a la fila que hay que
// upsertear en `subscriptions` — o null si el evento no requiere escritura
// (tipo no mapeado en esta sub-fase, o payload sin los campos mínimos).
// Pura y testeable sin red: no toca Supabase ni el SDK de Dodo.

export interface DodoEvent {
  type: string;
  data: {
    subscription_id?: string;
    customer_id?: string;
    product_id?: string;
    next_billing_date?: string;
    customer?: { customer_id?: string; email?: string };
    // Campos de payment.succeeded/refund.succeeded (referidos, ver
    // referral-webhook.ts) — el resto del mapeo de arriba no los toca.
    payment_id?: string;
    // total_amount/currency: lo que le cobraron al cliente. settlement_amount/
    // settlement_currency: lo que Dodo efectivamente acredita a Aluna tras
    // conversión de moneda (node_modules/dodopayments/resources/payments.d.ts)
    // — la base correcta para la comisión cuando Dodo los manda.
    total_amount?: number;
    currency?: string;
    settlement_amount?: number;
    settlement_currency?: string;
    // Packs de créditos (Task 7, ver lib/credits/config.ts): productos
    // comprados en un pago one-time. Forma real confirmada contra el SDK
    // instalado (dodopayments@2.42.2, resources/payments.d.ts —
    // `Payment.ProductCart`): solo viene poblado en pagos one-time; un pago
    // de suscripción no lo trae, por eso alcanza para distinguir ambos casos.
    product_cart?: Array<{ product_id: string; quantity: number }>;
    // Metadata de la sesión de checkout (I3): `aluna_user_id` lo manda
    // SIEMPRE la sesión de un pack (ver billing/checkout/route.ts) para que
    // el webhook pueda abonar sin depender de que el email de Dodo matchee
    // una cuenta Aluna. También puede traer `referral_code` (T6).
    metadata?: Record<string, string>;
  };
}

export type SubscriptionUpsertRow = {
  dodo_customer_id: string;
  dodo_subscription_id: string;
  plan: "monthly" | "yearly";
  status: "trialing" | "active" | "past_due" | "cancelled";
  current_period_end: string | null;
};

const STATUS_BY_TYPE: Record<string, "trialing" | "active" | "past_due" | "cancelled" | undefined> = {
  "subscription.active": "active",
  "subscription.renewed": "active",
  "subscription.on_hold": "past_due",
  "subscription.cancelled": "cancelled",
  "subscription.expired": "cancelled",
};

export function planFromProductId(
  productId: string | undefined,
  monthlyProductId: string | undefined,
  yearlyProductId: string | undefined,
): "monthly" | "yearly" | null {
  if (!productId) return null;
  if (productId === monthlyProductId) return "monthly";
  if (productId === yearlyProductId) return "yearly";
  return null;
}

export function mapDodoEventToRow(
  event: DodoEvent,
  productIds: { monthlyProductId: string | undefined; yearlyProductId: string | undefined },
  existingPlan: "monthly" | "yearly" | null,
): SubscriptionUpsertRow | null {
  const status = STATUS_BY_TYPE[event.type];
  if (!status) return null;

  const dodoCustomerId = event.data.customer?.customer_id ?? event.data.customer_id;
  const dodoSubscriptionId = event.data.subscription_id;
  if (!dodoCustomerId || !dodoSubscriptionId) return null;

  const plan =
    planFromProductId(event.data.product_id, productIds.monthlyProductId, productIds.yearlyProductId) ??
    existingPlan ??
    "monthly";

  return {
    dodo_customer_id: dodoCustomerId,
    dodo_subscription_id: dodoSubscriptionId,
    plan,
    status,
    current_period_end: event.data.next_billing_date ?? null,
  };
}
