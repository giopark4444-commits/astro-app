"use client";
import { useTranslations } from "next-intl";
import { signUp } from "../auth/actions";
import styles from "@/components/auth.module.css";

export function SignupForm() {
  const t = useTranslations("auth");
  return (
    <form action={signUp} className={styles.form}>
      <input className={styles.input} name="email" type="email" placeholder={t("email")} aria-label={t("email")} required />
      <input className={styles.input} name="password" type="password" placeholder={t("password")} aria-label={t("password")} required minLength={8} />
      <button className={styles.cta} type="submit">{t("signup")}</button>
    </form>
  );
}
