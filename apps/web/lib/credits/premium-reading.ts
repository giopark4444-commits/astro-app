import type { NextRequest } from "next/server";
import { authenticateRoute } from "@/lib/supabase/route-auth";
import { resolvePremiumProvider, type ResolvedProvider } from "@/lib/reading/provider";
import { getCreditsServiceClient, spendCredits, refundSpend } from "@/lib/credits/ledger";
import { readingPremiumCost } from "@/lib/credits/config";

// Helper compartido por las 4 rutas de lectura profunda (chart-reading,
// area-reading, bazi-reading, horoscope-reading — Task 6). Centraliza la
// MISMA regla de oro que Task 5 ya aplicó a /api/chat: jamás se invoca al
// proveedor premium sin haber descontado el costo antes con éxito, y sin
// config (llave premium, sesión o service client) el camino se degrada al
// gratis de siempre — jamás un 500.
//
// Diferencia clave con el chat (que YA exige sesión con un 401 temprano):
// las 4 rutas de lectura son PÚBLICAS hoy. Este helper autentica por su
// cuenta (no asume que el caller ya lo hizo) porque el flag premium exige
// sesión propia — pero su ausencia degrada a "off", nunca rompe el contrato
// público de la ruta con un 401.

export interface PremiumReading {
  mode: "free" | "premium";
  /** El proveedor premium (mode "premium") o el `fallback` recibido tal cual (mode "free"). */
  provider: ResolvedProvider;
  /** Contrato con la UI: "used" | "fallback" | "off" — el caller lo manda siempre como header x-aluna-premium. */
  headerValue: "used" | "fallback" | "off";
  /** Revierte el spend si terminó sin servir nada al usuario. No-op en modo free (nunca hubo spend). */
  refundIfEmpty: () => Promise<void>;
}

const NOOP_REFUND = async () => {};

function freePath(fallback: ResolvedProvider): PremiumReading {
  return { mode: "free", provider: fallback, headerValue: "off", refundIfEmpty: NOOP_REFUND };
}

/**
 * Decide si una lectura profunda se sirve premium (Claude explícito, vía
 * `resolvePremiumProvider`) o el camino gratis de siempre (`fallback`, ya
 * resuelto por el caller con `resolveReadingProvider()`).
 *
 * `premiumFlag !== true` → free/"off" sin tocar auth ni ledger. Sin llave
 * premium → "off". Con costo <= 0 ("premium regalado") → premium/"used"
 * directo, sin auth ni ledger — no hay spend real que revertir. Con costo
 * > 0: hace falta sesión (sin ella, o si `authenticateRoute` lanza por
 * config faltante, → "off") y service client (sin él → "off"); sin saldo
 * (`spendCredits` false) → free/"fallback"; con saldo → premium/"used" con
 * `refundIfEmpty` real (idempotente: un segundo llamado no revierte dos veces).
 */
export async function resolvePremiumReading(
  request: NextRequest,
  premiumFlag: unknown,
  fallback: ResolvedProvider,
): Promise<PremiumReading> {
  if (premiumFlag !== true) return freePath(fallback);

  const prem = resolvePremiumProvider();
  if (!prem.available) return freePath(fallback);

  const cost = readingPremiumCost();
  if (cost <= 0) {
    // Premium regalado: se usa directo, sin tocar el ledger (ni spend ni refund).
    return { mode: "premium", provider: prem, headerValue: "used", refundIfEmpty: NOOP_REFUND };
  }

  let user: { id: string } | null;
  try {
    ({ user } = await authenticateRoute(request));
  } catch {
    // authenticateRoute puede lanzar si Supabase no está configurado (env vars
    // ausentes/URL inválida): un problema de infraestructura no debe tumbar
    // una ruta pública — se degrada a "off", como si no hubiera sesión.
    return freePath(fallback);
  }
  if (!user) return freePath(fallback);

  const svc = getCreditsServiceClient();
  if (!svc) return freePath(fallback);

  const ref = `spend:${crypto.randomUUID()}`;
  const ok = await spendCredits(svc, user.id, cost, ref);
  if (!ok) {
    return { mode: "free", provider: fallback, headerValue: "fallback", refundIfEmpty: NOOP_REFUND };
  }

  const userId = user.id;
  let refunded = false;
  return {
    mode: "premium",
    provider: prem,
    headerValue: "used",
    async refundIfEmpty() {
      // Anula ANTES de reembolsar: pase lo que pase, el mismo spend no puede
      // revertirse dos veces (mismo patrón que refundPremiumIfUnserved en
      // app/api/chat/route.ts, Task 5).
      if (refunded) return;
      refunded = true;
      await refundSpend(svc, userId, cost, ref).catch(() => {});
    },
  };
}
