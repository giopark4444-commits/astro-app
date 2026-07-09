// packages/core/src/billing/subscription.ts
// Deriva si una cuenta tiene Aluna Plus activo. Puro y RN-safe (usado tal
// cual por web y móvil) — no importa nada de Supabase, recibe los datos ya
// leídos. `now` es inyectable para tests deterministas (mismo patrón que
// jieBoundaries/luckPillars en el motor Ba Zi).
export type SubscriptionStatus = "trialing" | "active" | "past_due" | "cancelled";

export interface SubscriptionRow {
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
}

export function isPlusActive(row: SubscriptionRow | null, now: Date = new Date()): boolean {
  if (!row) return false;
  if (row.status !== "trialing" && row.status !== "active") return false;
  if (!row.currentPeriodEnd) return true;
  return new Date(row.currentPeriodEnd) > now;
}
