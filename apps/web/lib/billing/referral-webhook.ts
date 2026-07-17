// Escrituras del ledger de referidos disparadas por el webhook de Dodo
// (service role — ver route.ts). Nunca LANZA: sin la migración 0016 aplicada
// estas tablas no existen todavía, y eso NUNCA debe tumbar el webhook (que
// sigue teniendo que escribir `subscriptions` con normalidad) — en ese caso
// concreto (tabla/función inexistente) se responde `{ ok: true }` y route.ts
// sigue devolviendo 200. Cualquier OTRO error real (permisos, red, columna
// que no cuadra) devuelve `{ ok: false }`: route.ts debe convertir eso en un
// 500 para que Dodo reintente — sin este distingo, un error real se
// confundía con "migración no aplicada" y la ganancia se perdía para
// siempre (idempotencia por UNIQUE(payment_ref) hace que reintentar sea
// seguro). Casts puntuales al estilo de rolesBuilder/settingsBuilder
// (lib/admin/roles.ts, app/(app)/actions.ts): acotan el builder al shape
// mínimo que se usa acá.
import type { AlunaSupabaseClient } from "@aluna/supabase";
import { commissionCentsFor } from "./referral-commission";
import type { DodoEvent } from "./dodo-event-mapping";

type PgError = { message: string; code?: string };
type MaybeSingleResult<T> = Promise<{ data: T | null; error: PgError | null }>;

export type ReferralWriteResult = { ok: true } | { ok: false };

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

/** Estado ACTUAL de la ganancia de un payment_ref — handleReferralRefund lo
 * necesita para decidir si el reembolso llega ANTES (pending -> reversed) o
 * DESPUÉS (paid -> clawback) de haberle pagado al colaborador. */
function earningStatusByPaymentRef(supabase: AlunaSupabaseClient, paymentId: string): MaybeSingleResult<{ status: string }> {
  type Builder = {
    select: (c: string) => { eq: (col: string, v: string) => { maybeSingle: () => MaybeSingleResult<{ status: string }> } };
  };
  return (supabase.from("referral_earnings") as unknown as Builder).select("status").eq("payment_ref", paymentId).maybeSingle();
}

/** true si el error de Postgres/PostgREST indica que la tabla/función
 * todavía no existe (migración 0016 sin aplicar) — el ÚNICO caso en el que
 * el webhook de todas formas debe responder 200 (nada que reintentar: nunca
 * va a existir hasta que Gio aplique la migración). `code` cubre tanto el
 * error crudo de Postgres (`42P01` = undefined_table) como el que expone
 * supabase-js/PostgREST (`PGRST205` = "no encontró la tabla en el schema
 * cache"); el `message` de respaldo cubre variantes que no traigan `code`
 * (p.ej. cuando el error llega como excepción crudo, no como PostgrestError). */
function isMissingTableError(error: PgError | null | undefined): boolean {
  if (!error) return false;
  if (error.code === "42P01" || error.code === "PGRST205") return true;
  return error.message?.includes("does not exist") ?? false;
}

function isMissingTableException(e: unknown): boolean {
  const message = e instanceof Error ? e.message : String(e);
  return message.includes("does not exist") || message.includes("PGRST205") || message.includes("42P01");
}

/**
 * `payment.succeeded`: si `userId` (ya resuelto por route.ts, mismo mapeo que
 * usa para subscriptions) está referido y su código sigue activo, inserta la
 * ganancia pendiente. Idempotente por UNIQUE(payment_ref) vía
 * upsert+ignoreDuplicates (equivalente a `ON CONFLICT (payment_ref) DO
 * NOTHING`) — Dodo puede reintentar el mismo evento.
 *
 * Base de la comisión: `settlement_amount`/`settlement_currency` del payload
 * de Dodo cuando vienen — es lo que el merchant efectivamente recibe en su
 * balance tras la conversión de moneda (adaptive pricing), no lo que le
 * cobraron al cliente (node_modules/dodopayments/resources/payments.d.ts).
 * Si no vienen (payload viejo, o Dodo no los manda para este tipo de pago),
 * cae a `total_amount` SOLO si la moneda de cobro ya es USD — Aluna no tiene
 * forma confiable de saber cuánto entra realmente en cualquier otra moneda
 * sin el settlement. Si ninguna de las dos condiciones se cumple, la
 * comisión se OMITE a propósito (con console.error bien visible, incluyendo
 * el payment_id) en vez de calcular sobre un monto que podría no ser el que
 * de verdad ingresó.
 * TODO-Gio: verificar contra el primer pago real si settlement_amount viene
 * neto de impuestos; ajustar si no.
 */
export async function handleReferralPayment(
  supabase: AlunaSupabaseClient,
  event: DodoEvent,
  userId: string,
): Promise<ReferralWriteResult> {
  try {
    const paymentId = event.data.payment_id;
    if (!paymentId) return { ok: true };

    const { data: referred, error: referredError } = await referredUsersByUser(supabase, userId);
    if (referredError || !referred) return { ok: true }; // no referido, o migración 0016 sin aplicar

    const { data: codeRow, error: codeError } = await referralCodeByCode(supabase, referred.code);
    if (codeError || !codeRow || !codeRow.active) return { ok: true };

    let baseAmountCents: number;
    let baseCurrency: string;
    if (typeof event.data.settlement_amount === "number" && event.data.settlement_currency) {
      baseAmountCents = event.data.settlement_amount;
      baseCurrency = event.data.settlement_currency;
    } else if (typeof event.data.total_amount === "number" && event.data.currency === "USD") {
      baseAmountCents = event.data.total_amount;
      baseCurrency = "USD";
    } else {
      console.error(
        `[webhook dodo] referidos: comisión OMITIDA a propósito para payment_id=${paymentId} — sin settlement_amount y total_amount no está confirmado en USD (currency=${event.data.currency ?? "?"})`,
      );
      return { ok: true }; // omisión consciente, no un error — el webhook sigue en 200
    }

    const commissionCents = commissionCentsFor(baseAmountCents, codeRow.commission_pct);

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
      ) => Promise<{ error: PgError | null }>;
    };
    const { error: insertError } = await (supabase.from("referral_earnings") as unknown as EarningsUpsert).upsert(
      {
        code: referred.code,
        referred_user_id: userId,
        payment_ref: paymentId,
        amount_cents: baseAmountCents,
        commission_cents: commissionCents,
        currency: baseCurrency,
      },
      { onConflict: "payment_ref", ignoreDuplicates: true },
    );
    if (insertError) {
      if (isMissingTableError(insertError)) return { ok: true };
      console.error("[webhook dodo] insert de referral_earnings falló con un error real — Dodo debe reintentar:", insertError.message);
      return { ok: false };
    }
    return { ok: true };
  } catch (e) {
    if (isMissingTableException(e)) return { ok: true };
    console.error("[webhook dodo] handleReferralPayment falló con un error real — Dodo debe reintentar:", e);
    return { ok: false };
  }
}

/**
 * `refund.succeeded`: reversa la ganancia de ese payment_ref según en qué
 * punto del ciclo estaba —
 *   'pending' -> 'reversed'  (nunca se le pagó al colaborador por esto)
 *   'paid'    -> 'clawback'  (YA se le pagó — el dinero salió; se marca
 *                             visible, `paid_at` intacto, nunca se borra)
 *   'reversed'/'clawback' ya -> no-op (un reembolso no debe re-procesarse).
 * Sin ganancia para ese payment_ref: no hay nada que reversar, no es error.
 */
export async function handleReferralRefund(supabase: AlunaSupabaseClient, event: DodoEvent): Promise<ReferralWriteResult> {
  try {
    const paymentId = event.data.payment_id;
    if (!paymentId) return { ok: true };

    const { data: existing, error: readError } = await earningStatusByPaymentRef(supabase, paymentId);
    if (readError) {
      if (isMissingTableError(readError)) return { ok: true };
      console.error("[webhook dodo] lectura de referral_earnings (reembolso) falló con un error real — Dodo debe reintentar:", readError.message);
      return { ok: false };
    }
    if (!existing) return { ok: true }; // sin ganancia para este pago

    let nextStatus: "reversed" | "clawback";
    if (existing.status === "pending") nextStatus = "reversed";
    else if (existing.status === "paid") nextStatus = "clawback";
    else return { ok: true }; // ya reversed/clawback: no-op, el histórico pagado nunca se encoge

    type EarningsUpdate = {
      update: (v: { status: string }) => { eq: (col: string, v: string) => Promise<{ error: PgError | null }> };
    };
    const { error: updateError } = await (supabase.from("referral_earnings") as unknown as EarningsUpdate)
      .update({ status: nextStatus })
      .eq("payment_ref", paymentId);
    if (updateError) {
      if (isMissingTableError(updateError)) return { ok: true };
      console.error("[webhook dodo] update de referral_earnings (reembolso) falló con un error real — Dodo debe reintentar:", updateError.message);
      return { ok: false };
    }
    return { ok: true };
  } catch (e) {
    if (isMissingTableException(e)) return { ok: true };
    console.error("[webhook dodo] handleReferralRefund falló con un error real — Dodo debe reintentar:", e);
    return { ok: false };
  }
}
