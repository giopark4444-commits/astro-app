"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { signIn } from "../auth/actions";
import styles from "@/components/auth.module.css";

export function LoginForm() {
  const t = useTranslations("auth");
  return (
    <>
      <form action={signIn} className={styles.form}>
        <input className={styles.input} name="email" type="email" placeholder={t("email")} aria-label={t("email")} required />
        <input className={styles.input} name="password" type="password" placeholder={t("password")} aria-label={t("password")} required minLength={8} />
        <button className={styles.cta} type="submit">{t("login")}</button>
      </form>
      <p className={styles.switch}><Link href="/auth/forgot">{t("forgotPassword")}</Link></p>
    </>
  );
}
