"use client";
import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { parseEmail } from "../validation";
import styles from "@/components/auth.module.css";

export function ForgotForm() {
  const t = useTranslations("auth");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const parsed = parseEmail(new FormData(form));
    if (!parsed.ok) {
      form.reportValidity();
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(parsed.value, {
        redirectTo: `${window.location.origin}/auth/reset`,
      });
      // Anti-enumeración: nunca revelamos si el correo existe o no — mismo aviso siempre.
      if (error) console.error(error);
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
      setSent(true);
    }
  }

  if (sent) {
    return <p role="status" className={styles.error}>{t("resetLinkSent")}</p>;
  }

  return (
    <>
      <h2 className={styles.title}>{t("forgotTitle")}</h2>
      <p className={styles.intro}>{t("forgotBody")}</p>
      <form onSubmit={handleSubmit} className={styles.form}>
        <input className={styles.input} name="email" type="email" placeholder={t("email")} aria-label={t("email")} required />
        <button className={styles.cta} type="submit" disabled={busy}>{t("sendResetLink")}</button>
      </form>
    </>
  );
}
