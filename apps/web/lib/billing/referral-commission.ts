// Lógica pura de la comisión de referidos sobre pagos de Dodo — sin red, sin
// Supabase, testeable sin mocks. Regla dura del brief: dinero SIEMPRE en
// centavos enteros, comisión con floor(), jamás floats.

/** Comisión en centavos para un pago de `amountCents` con `commissionPct`
 * (0-100). floor() SIEMPRE — nunca redondear hacia arriba el dinero que se le
 * debe pagar al colaborador (evita fugas de centavos agregadas). */
export function commissionCentsFor(amountCents: number, commissionPct: number): number {
  return Math.floor((amountCents * commissionPct) / 100);
}

export type ReferralEventAction = "earn" | "reverse" | null;

/** A qué acción del ledger de referidos corresponde cada tipo de evento de
 * Dodo. `payment.succeeded` genera una ganancia pendiente; `refund.succeeded`
 * reversa la que ya existía para ese payment_ref. Cualquier otro tipo (incl.
 * los de suscripción que ya maneja dodo-event-mapping.ts) no toca el ledger. */
export function referralActionForEventType(type: string): ReferralEventAction {
  if (type === "payment.succeeded") return "earn";
  if (type === "refund.succeeded") return "reverse";
  return null;
}
