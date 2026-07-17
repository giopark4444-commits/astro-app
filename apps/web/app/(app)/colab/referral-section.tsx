"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { formatCents } from "@/lib/billing/format";
import { myReferralSummary, type MyReferralSummary } from "./actions";
import styles from "./colab.module.css";

type ViewState = { s: "loading" } | { s: "error" } | { s: "empty" } | { s: "ready"; row: MyReferralSummary };

// NEXT_PUBLIC_APP_URL ya se usa igual en app/api/billing/checkout|portal —
// mismo fallback de dominio de producción si no está seteada (dev local).
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://aluna.app";

/** «Tu código» del panel /colab (brief T5): código grande y copiable, link
 * de invitación (?ref=CODE) y contadores de referidos/ganancias. Si todavía
 * no tiene código, mensaje sin nombrar a Gio ("pídeselo al administrador"). */
export function ReferralSection() {
  const t = useTranslations("admin");
  const [state, setState] = useState<ViewState>({ s: "loading" });
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await myReferralSummary();
      if (!res.ok) {
        setState({ s: "error" });
        return;
      }
      setState(res.row ? { s: "ready", row: res.row } : { s: "empty" });
    })();
  }, []);

  async function copy(value: string, which: "code" | "link") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // portapapeles no disponible (permiso/entorno) — falla en silencio, no crítico
    }
  }

  return (
    <section className="card">
      <h2 className={styles.eyebrow}>{t("myReferralTitle")}</h2>

      {state.s === "loading" && <p className={styles.hint}>{t("loading")}</p>}

      {state.s === "error" && (
        <div className="card card--dashed">
          <p role="alert">{t("migrationPending")}</p>
        </div>
      )}

      {state.s === "empty" && <p className={styles.hint}>{t("myReferralEmpty")}</p>}

      {state.s === "ready" && (
        <>
          <div className={styles.myReferralCode}>
            <span className={styles.myReferralCodeValue}>{state.row.code}</span>
            <button type="button" className={styles.myReferralCopyBtn} onClick={() => void copy(state.row.code, "code")}>
              {copied === "code" ? t("myReferralCopied") : t("myReferralCopy")}
            </button>
          </div>
          <div className={styles.myReferralLinkRow}>
            <span className={styles.myReferralLinkValue}>{`${APP_URL}/?ref=${state.row.code}`}</span>
            <button
              type="button"
              className={styles.myReferralCopyBtn}
              onClick={() => void copy(`${APP_URL}/?ref=${state.row.code}`, "link")}
            >
              {copied === "link" ? t("myReferralCopied") : t("myReferralCopy")}
            </button>
          </div>
          <div className={styles.myReferralStats}>
            <div className={styles.myReferralStat}>
              <span className={styles.myReferralStatValue}>{state.row.referred_count}</span>
              <span className={styles.myReferralStatLabel}>{t("myReferralReferred")}</span>
            </div>
            <div className={styles.myReferralStat}>
              <span className={styles.myReferralStatValue}>{formatCents(state.row.pending_cents)}</span>
              <span className={styles.myReferralStatLabel}>{t("myReferralPending")}</span>
            </div>
            <div className={styles.myReferralStat}>
              <span className={styles.myReferralStatValue}>{formatCents(state.row.paid_cents)}</span>
              <span className={styles.myReferralStatLabel}>{t("myReferralPaid")}</span>
            </div>
            {state.row.clawback_cents > 0 && (
              <div className={styles.myReferralStat}>
                <span className={styles.myReferralStatValue}>{formatCents(state.row.clawback_cents)}</span>
                <span className={styles.myReferralStatLabel}>{t("referralClawbackShort")}</span>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
