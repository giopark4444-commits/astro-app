"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { formatCents } from "@/lib/billing/format";
import {
  deactivateReferralCode,
  listReferralSummary,
  markReferralEarningsPaid,
  setReferralCode,
  type ReferralSummaryRow,
} from "./actions";
import styles from "./admin.module.css";

type ListState = { s: "loading" } | { s: "error" } | { s: "ready"; rows: ReferralSummaryRow[] };

/** Sugerencia de código client-side (brief T4): primeras letras del email +
 * 4 dígitos aleatorios. Es solo un punto de partida editable — el formato
 * real (`^[A-Z0-9]{4,20}$`) lo valida la función de BD igual. */
function suggestCode(email: string): string {
  const local = (email.split("@")[0] ?? "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const letters = (local.slice(0, 4) || "GIO").padEnd(4, "X");
  const digits = Math.floor(1000 + Math.random() * 9000).toString();
  return `${letters}${digits}`;
}

/** Sección «Referidos» del panel /admin (brief referidos-brief T4): tabla de
 * admin_referral_summary + form crear/editar + Marcar pagado/Desactivar. Si
 * la migración 0016 no está aplicada, banner de migración pendiente (mismo
 * patrón que CollaboratorsPanel). */
export function ReferralsPanel() {
  const t = useTranslations("admin");
  const [state, setState] = useState<ListState>({ s: "loading" });
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [discountPct, setDiscountPct] = useState(0);
  const [commissionPct, setCommissionPct] = useState(30);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [busyCode, setBusyCode] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  async function load() {
    setState({ s: "loading" });
    const res = await listReferralSummary();
    setState(res.ok ? { s: "ready", rows: res.rows } : { s: "error" });
  }

  useEffect(() => {
    void load();
  }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmedEmail = email.trim();
    const trimmedCode = code.trim();
    if (!trimmedEmail || !trimmedCode || submitting) return;
    setSubmitting(true);
    setFormError(null);
    const res = await setReferralCode(trimmedEmail, trimmedCode, discountPct, commissionPct);
    setSubmitting(false);
    if (!res.ok) {
      setFormError(res.error);
      return;
    }
    setEmail("");
    setCode("");
    setDiscountPct(0);
    setCommissionPct(30);
    await load();
  }

  async function markPaid(row: ReferralSummaryRow) {
    if (!window.confirm(t("referralConfirmMarkPaid", { code: row.code }))) return;
    setBusyCode(row.code);
    setRowError(null);
    // Manda el pending_cents que ESTA fila mostraba en pantalla — la función
    // de BD lo revalida contra el pendiente real y lanza si cambió entre
    // medio (nueva ganancia, otro reembolso) en vez de pagar de más/de menos.
    const res = await markReferralEarningsPaid(row.code, row.pending_cents);
    setBusyCode(null);
    if (!res.ok) {
      setRowError(res.error);
      return;
    }
    await load();
  }

  async function deactivate(row: ReferralSummaryRow) {
    setBusyCode(row.code);
    setRowError(null);
    const res = await deactivateReferralCode(row.code);
    setBusyCode(null);
    if (!res.ok) {
      setRowError(res.error);
      return;
    }
    await load();
  }

  return (
    <section className="card">
      <h2 className={styles.eyebrow}>{t("referralTitle")}</h2>
      <p className={styles.hint}>{t("referralNote")}</p>

      {state.s === "loading" && <p className={styles.hint}>{t("loading")}</p>}

      {state.s === "error" && (
        <div className={`card card--dashed ${styles.migrationBanner}`}>
          <p role="alert">{t("migrationPending")}</p>
        </div>
      )}

      {state.s === "ready" && (
        <ul className={styles.referralList}>
          {state.rows.length === 0 && <li className={styles.hint}>{t("referralEmpty")}</li>}
          {state.rows.map((row) => (
            <li key={row.code} className={styles.referralRow}>
              <div className={styles.referralRowHead}>
                <span className={styles.roleEmail}>{row.owner_email}</span>
                <span className={`chip ${styles.roleChip}`}>{row.code}</span>
                {!row.active && <span className={`chip ${styles.roleChip}`}>{t("referralInactive")}</span>}
              </div>
              <div className={styles.referralRowStats}>
                <span>
                  {t("referralDiscountShort")} {row.discount_pct}%
                </span>
                <span>
                  {t("referralCommissionShort")} {row.commission_pct}%
                </span>
                <span>
                  {t("referralReferredShort")} {row.referred_count}
                </span>
                <span>
                  {t("referralPendingShort")} {formatCents(row.pending_cents)}
                </span>
                <span>
                  {t("referralPaidShort")} {formatCents(row.paid_cents)}
                </span>
                {row.clawback_cents > 0 && (
                  <span>
                    {t("referralClawbackShort")} {formatCents(row.clawback_cents)}
                  </span>
                )}
              </div>
              <div className={styles.referralRowActions}>
                <button
                  type="button"
                  className={styles.removeBtn}
                  disabled={busyCode === row.code || row.pending_cents === 0}
                  onClick={() => void markPaid(row)}
                >
                  {busyCode === row.code ? t("referralWorking") : t("referralMarkPaid")}
                </button>
                <button
                  type="button"
                  className={styles.removeBtn}
                  disabled={busyCode === row.code || !row.active}
                  onClick={() => void deactivate(row)}
                >
                  {busyCode === row.code ? t("referralWorking") : t("referralDeactivate")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {rowError && (
        <p role="alert" className={styles.feedbackError}>
          {rowError}
        </p>
      )}

      <form className={styles.grantForm} onSubmit={(e) => void submit(e)}>
        <input
          type="email"
          className={styles.grantEmail}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("emailPlaceholder")}
          required
        />
        <div className={styles.referralCodeRow}>
          <input
            type="text"
            className={styles.grantEmail}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder={t("referralCodePlaceholder")}
            maxLength={20}
            required
          />
          <button
            type="button"
            className={styles.removeBtn}
            disabled={!email.trim()}
            onClick={() => setCode(suggestCode(email))}
          >
            {t("referralSuggest")}
          </button>
        </div>
        <div className={styles.referralPctRow}>
          <label className={styles.referralPctLabel}>
            {t("referralDiscountPct")}
            <input
              type="number"
              min={0}
              max={100}
              className={styles.referralPctInput}
              value={discountPct}
              onChange={(e) => setDiscountPct(Number(e.target.value))}
            />
          </label>
          <label className={styles.referralPctLabel}>
            {t("referralCommissionPct")}
            <input
              type="number"
              min={0}
              max={100}
              className={styles.referralPctInput}
              value={commissionPct}
              onChange={(e) => setCommissionPct(Number(e.target.value))}
            />
          </label>
        </div>
        <button type="submit" className={styles.grantBtn} disabled={submitting || !email.trim() || !code.trim()}>
          {submitting ? t("granting") : t("referralSave")}
        </button>
        {formError && (
          <p role="alert" className={styles.feedbackError}>
            {formError}
          </p>
        )}
      </form>
    </section>
  );
}
