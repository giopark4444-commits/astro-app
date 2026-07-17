"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { redeemReferralCode } from "@/lib/referrals/actions";
import styles from "./ajustes.module.css";

/** «¿Tienes un código de referido?» (brief T3 §2, sección Cuenta de
 * /ajustes). Si ya tiene uno aplicado, muestra cuál en vez del input —
 * `appliedCode` viene resuelto server-side (RLS ya acota a la fila propia). */
export function ReferralRedeem({ appliedCode }: { appliedCode: string | null }) {
  const t = useTranslations("settings");
  const router = useRouter();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (appliedCode) {
    return (
      <div className={styles.row}>
        <span className={styles.rowLabel}>{t("referralAppliedLabel")}</span>
        <span className={`${styles.rowValue} ${styles.mono}`}>{appliedCode}</span>
      </div>
    );
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setError(null);
    const res = await redeemReferralCode(trimmed);
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setCode("");
    router.refresh();
  }

  return (
    <form className={styles.referralForm} onSubmit={(e) => void submit(e)}>
      <span className={styles.rowLabel}>{t("referralPrompt")}</span>
      <div className={styles.referralInputRow}>
        <input
          type="text"
          className={styles.referralInput}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={t("referralPlaceholder")}
          maxLength={20}
        />
        <button type="submit" className={styles.referralBtn} disabled={submitting || !code.trim()}>
          {submitting ? t("referralApplying") : t("referralApply")}
        </button>
      </div>
      {error && (
        <p role="alert" className={styles.referralError}>
          {error}
        </p>
      )}
    </form>
  );
}
