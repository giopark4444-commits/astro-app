import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LoginForm } from "./login-form";
import { authMessageKey } from "../auth/auth-error";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const t = await getTranslations("auth");
  const { error } = await searchParams;
  const msgKey = authMessageKey(error);
  return (
    <main style={{ padding: 24 }}>
      <h1 className="display" style={{ textAlign: "center" }}>Aluna 🌙</h1>
      {msgKey && <p role="alert" style={{ textAlign: "center", color: "var(--acc)" }}>{t(msgKey)}</p>}
      <LoginForm />
      <p style={{ textAlign: "center", marginTop: 16 }}>
        {t("noAccount")} <Link href="/signup">{t("signup")}</Link>
      </p>
    </main>
  );
}
