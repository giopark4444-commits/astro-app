import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { SignupForm } from "./signup-form";
import { authMessageKey } from "../auth/auth-error";

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/hoy");
  const t = await getTranslations("auth");
  const { error } = await searchParams;
  const msgKey = authMessageKey(error);
  return (
    <main style={{ padding: 24 }}>
      <h1 className="display" style={{ textAlign: "center" }}>Aluna 🌙</h1>
      {msgKey && <p role="alert" style={{ textAlign: "center", color: "var(--acc)" }}>{t(msgKey)}</p>}
      <SignupForm />
      <p style={{ textAlign: "center", marginTop: 16 }}>
        {t("haveAccount")} <Link href="/login">{t("login")}</Link>
      </p>
    </main>
  );
}
