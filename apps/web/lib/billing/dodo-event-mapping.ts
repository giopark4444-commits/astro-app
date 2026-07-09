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
