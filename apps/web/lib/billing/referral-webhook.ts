// Escrituras del ledger de referidos disparadas por el webhook de Dodo
// (service role — ver route.ts). Nunca lanza: sin la migración 0016 aplicada
// estas tablas no existen todavía, y eso NUNCA debe tumbar el webhook (que
// sigue teniendo que escribir `subscriptions` con normalidad). Casts
// puntuales al estilo de rolesBuilder/settingsBuilder (lib/admin/roles.ts,
// app/(app)/actions.ts): acotan el builder al shape mínimo que se usa acá.
import type { AlunaSupabaseClient } from "@aluna/supabase";
import { commissionCentsFor } from "./referral-commission";
import type { DodoEvent } from "./dodo-event-mapping";

type MaybeSingleResult<T> = Promise<{ data: T | null; error: { message: string } | null }>;

function referredUsersByUser(supabase: AlunaSupabaseClient, userId: string): MaybeSingleResult<{ code: string }> {
  type Builder = {
    select: (c: string) => { eq: (col: string, v: string) => { maybeSingle: () => MaybeSingleResult<{ code: string }> } };
  };
  return (supabase.from("referred_users") as unknown as Builder).select("code").eq("user_id", userId).maybeSingle();
}

function referralCodeByCode(
  supabase: AlunaSupabaseClient,
  code: string,
): MaybeSingleResult<{ commission_pct: number; active: boolean }> {
  type Builder = {
    select: (
      c: string,
    ) => { eq: (col: string, v: string) => { maybeSingle: () => MaybeSingleResult<{ commission_pct: number; active: boolean }> } };
  };
  return (supabase.from("referral_codes") as unknown as Builder).select("commission_pct, active").eq("code", code).maybeSingle();
}

/**
 * `payment.succeeded`: si `userId` (ya resuelto por route.ts, mismo mapeo que
 * usa para subscriptions) está referido y su código sigue activo, inserta la
 * ganancia pendiente. Idempotente por UNIQUE(payment_ref) vía
 * upsert+ignoreDuplicates (equivalente a `ON CONFLICT (payment_ref) DO
 * NOTHING`) — Dodo puede reintentar el mismo evento.
 */
export async function handleReferralPayment(supabase: AlunaSupabaseClient, event: DodoEvent, userId: string): Promise<void> {
  try {
    const paymentId = event.data.payment_id;
    const amountCents = event.data.total_amount;
    if (!paymentId || typeof amountCents !== "number") return;

    const { data: referred, error: referredError } = await referredUsersByUser(supabase, userId);
    if (referredError || !referred) return; // no referido, o migración 0016 sin aplicar

    const { data: codeRow, error: codeError } = await referralCodeByCode(supabase, referred.code);
    if (codeError || !codeRow || !codeRow.active) return;

    const commissionCents = commissionCentsFor(amountCents, codeRow.commission_pct);
    const currency = event.data.currency ?? "USD";

    type EarningsUpsert = {
      upsert: (
        v: {
          code: string;
          referred_user_id: string;
          payment_ref: string;
          amount_cents: number;
          commission_cents: number;
          currency: string;
        },
        opts: { onConflict: string; ignoreDuplicates: boolean },
      ) => Promise<{ error: { message: string } | null }>;
    };
    const { error: insertError } = await (supabase.from("referral_earnings") as unknown as EarningsUpsert).upsert(
      {
        code: referred.code,
        referred_user_id: userId,
        payment_ref: paymentId,
        amount_cents: amountCents,
        commission_cents: commissionCents,
        currency,
      },
      { onConflict: "payment_ref", ignoreDuplicates: true },
    );
    if (insertError) console.error("[webhook dodo] insert de referral_earnings falló:", insertError.message);
  } catch (e) {
    console.error("[webhook dodo] handleReferralPayment falló (¿migración 0016 sin aplicar?):", e);
  }
}

/**
 * `refund.succeeded`: marca como `reversed` la ganancia de ese payment_ref si
 * existe. Sin precondición de estado previo — un reembolso reversa pase lo
 * que pase (incluso si ya se había marcado `paid`; Gio ve el status y
 * decide). 0 filas afectadas (sin ganancia para ese pago) no es error.
 */
export async function handleReferralRefund(supabase: AlunaSupabaseClient, event: DodoEvent): Promise<void> {
  try {
    const paymentId = event.data.payment_id;
    if (!paymentId) return;

    type EarningsUpdate = {
      update: (v: { status: string }) => { eq: (col: string, v: string) => Promise<{ error: { message: string } | null }> };
    };
    const { error } = await (supabase.from("referral_earnings") as unknown as EarningsUpdate)
      .update({ status: "reversed" })
      .eq("payment_ref", paymentId);
    if (error) console.error("[webhook dodo] reversar referral_earnings falló:", error.message);
  } catch (e) {
    console.error("[webhook dodo] handleReferralRefund falló (¿migración 0016 sin aplicar?):", e);
  }
}
