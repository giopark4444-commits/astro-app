"use client";
import { useTranslations } from "next-intl";
import { signIn } from "../auth/actions";

export function LoginForm() {
  const t = useTranslations("auth");
  return (
    <form action={signIn} style={{ display: "grid", gap: 12, maxWidth: 320, margin: "0 auto" }}>
      <input name="email" type="email" placeholder={t("email")} aria-label={t("email")} required />
      <input name="password" type="password" placeholder={t("password")} aria-label={t("password")} required minLength={8} />
      <button type="submit">{t("login")}</button>
    </form>
  );
}
