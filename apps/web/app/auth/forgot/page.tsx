import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { ForgotForm } from "./forgot-form";
import { authMessageKey } from "../auth-error";
import { Starfield } from "@/components/starfield";
import { Icon } from "@/components/icon";
import styles from "@/components/auth.module.css";

export default async function ForgotPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/hoy");
  const t = await getTranslations("auth");
  const tApp = await getTranslations("app");
  const { error } = await searchParams;
  const msgKey = authMessageKey(error);
  return (
    <main className={styles.shell}>
      <div className={styles.sky} aria-hidden><Starfield /></div>
      <div className={styles.center}>
        <div className={styles.mark}>
          <span className={styles.glyph}><Icon name="enso" size={42} /></span>
          <h1 className={styles.brand}>Aluna</h1>
          <p className={styles.tag}>{tApp("tagline")}</p>
        </div>
        <div className={`card card--elevated ${styles.card}`}>
          {msgKey && <p role="alert" className={styles.error}>{t(msgKey)}</p>}
          <ForgotForm />
        </div>
        <p className={styles.switch}><Link href="/login">{t("backToLogin")}</Link></p>
      </div>
    </main>
  );
}
