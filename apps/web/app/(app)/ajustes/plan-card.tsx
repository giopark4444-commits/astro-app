"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { isPlusActive, type SubscriptionStatus } from "@aluna/core";
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

export function PlanCard({ row }: { row: Row | null }) {
  const t = useTranslations("billing");
  const [busy, setBusy] = useState<"monthly" | "yearly" | "portal" | null>(null);
  const [error, setError] = useState(false);

  const active = isPlusActive(row ? { status: row.status, currentPeriodEnd: row.current_period_end } : null);

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
    ? new Date(row.current_period_end).toLocaleDateString()
    : "";

  return (
    <section className={styles.section}>
      <h3 className={styles.label}>{t("title")}</h3>
      {!active ? (
        <>
          <p>{t("freeBody")}</p>
          <div className={styles.seg} role="group" aria-label={t("title")}>
            <button className={styles.segItem} disabled={busy !== null} onClick={() => startCheckout("monthly")}>
              {busy === "monthly" ? t("loading") : `${t("monthly")} · ${t("trialNote")}`}
            </button>
            <button className={styles.segItem} disabled={busy !== null} onClick={() => startCheckout("yearly")}>
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
          <button className={styles.segItem} disabled={busy !== null} onClick={openPortal}>
            {busy === "portal" ? t("loading") : t("manage")}
          </button>
        </>
      )}
      {error && <p role="alert">{t("error")}</p>}
    </section>
  );
}
