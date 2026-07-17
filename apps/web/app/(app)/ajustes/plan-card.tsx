"use client";
import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import type { SubscriptionStatus } from "@aluna/core";
import styles from "./settings.module.css";

interface Row {
  status: SubscriptionStatus;
  current_period_end: string | null;
}

const STATUS_KEY: Record<SubscriptionStatus, string> = {
  trialing: "planTrialing",
  active: "planActive",
  past_due: "planPastDue",
  cancelled: "planActive", // no debería mostrarse (ver render abajo), fallback inerte
};

export function PlanCard({ row, checkoutSuccess = false }: { row: Row | null; checkoutSuccess?: boolean }) {
  const t = useTranslations("billing");
  const locale = useLocale();
  const [busy, setBusy] = useState<"monthly" | "yearly" | "portal" | null>(null);
  const [error, setError] = useState(false);

  // Rama a mostrar: "gestión" para cualquier suscripción no cancelada
  // (trialing, active, past_due), no solo la que tiene acceso Plus AHORA
  // (eso es lo que responde isPlusActive, que no aplica aquí: un past_due
  // debe ver "Gestionar suscripción", no los botones de checkout).
  const hasManagedSubscription = row !== null && row.status !== "cancelled";

  // El usuario vuelve de un checkout exitoso (?checkout=success en la
  // return_url) pero el webhook de Dodo todavía puede no haber procesado el
  // evento — sin esto vería fugazmente los botones de "hazte Plus" después
  // de haber pagado. Estado transitorio: en cuanto la fila refleje la
  // suscripción (hasManagedSubscription true), esta rama deja de aplicar.
  const showCheckoutProcessing = checkoutSuccess && !hasManagedSubscription;

  async function startCheckout(plan: "monthly" | "yearly") {
    setBusy(plan);
    setError(false);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = (await res.json()) as { checkoutUrl?: string };
      if (!res.ok || !data.checkoutUrl) throw new Error("checkout_failed");
      window.location.href = data.checkoutUrl;
    } catch {
      setBusy(null);
      setError(true);
    }
  }

  async function openPortal() {
    setBusy("portal");
    setError(false);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = (await res.json()) as { portalUrl?: string };
      if (!res.ok || !data.portalUrl) throw new Error("portal_failed");
      window.location.href = data.portalUrl;
    } catch {
      setBusy(null);
      setError(true);
    }
  }

  const dateLabel = row?.current_period_end
    ? new Date(row.current_period_end).toLocaleDateString(locale)
    : "";

  return (
    <section className={styles.section}>
      <h3 className={styles.label}>{t("title")}</h3>
      {showCheckoutProcessing ? (
        <p>{t("checkoutProcessing")}</p>
      ) : !hasManagedSubscription ? (
        <>
          <p>{t("freeBody")}</p>
          <div className={styles.planActions} role="group" aria-label={t("title")}>
            <button className={styles.planBtn} disabled={busy !== null} onClick={() => startCheckout("monthly")}>
              {busy === "monthly" ? t("loading") : `${t("monthly")} · ${t("trialNote")}`}
            </button>
            <button className={styles.planBtn} disabled={busy !== null} onClick={() => startCheckout("yearly")}>
              {busy === "yearly" ? t("loading") : `${t("yearly")} · ${t("trialNote")}`}
            </button>
          </div>
        </>
      ) : (
        <>
          <p>{t(STATUS_KEY[row!.status])}</p>
          {row?.current_period_end && (
            <p>{t(row!.status === "trialing" ? "trialEndsOn" : "renewsOn", { date: dateLabel })}</p>
          )}
          {row?.status === "past_due" && <p>{t("pastDueNote")}</p>}
          <button className={styles.planBtn} disabled={busy !== null} onClick={openPortal}>
            {busy === "portal" ? t("loading") : t("manage")}
          </button>
        </>
      )}
      {error && <p role="alert">{t("error")}</p>}
    </section>
  );
}
