"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Starfield } from "@/components/starfield";
import { Icon } from "@/components/icon";
import styles from "@/components/auth.module.css";

type Status = "checking" | "ready" | "invalid";
type FormError = "errPasswordMatch" | "errResetLink";

// Única página de auth que es client component: necesita detectar en el browser la
// sesión de recovery que @supabase/ssr auto-detecta del hash de la URL al montar
// (el link del correo de reset apunta aquí). onAuthStateChange("PASSWORD_RECOVERY")
// es la señal canónica de ese evento; getSession() (que internamente espera esa misma
// detección) resuelve el estado final si el evento no llega — p. ej. navegación directa
// a /auth/reset sin link de recovery, que debe caer en "invalid" sin romper la página.
export default function ResetPasswordPage() {
  const t = useTranslations("auth");
  const tApp = useTranslations("app");
  const router = useRouter();
  const [status, setStatus] = useState<Status>("checking");
  const [formError, setFormError] = useState<FormError | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let resolvedByEvent = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        resolvedByEvent = true;
        setStatus("ready");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!resolvedByEvent) setStatus(session ? "ready" : "invalid");
    }).catch(() => { if (!resolvedByEvent) setStatus("invalid"); }); // fallo de red → invalid, no colgado en checking

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const data = new FormData(e.currentTarget);
    const newPassword = String(data.get("newPassword") ?? "");
    const confirmPassword = String(data.get("confirmPassword") ?? "");
    if (newPassword !== confirmPassword) {
      setFormError("errPasswordMatch");
      return;
    }
    setFormError(null);
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setBusy(false);
      setFormError("errResetLink");
      return;
    }
    // Tras updateUser el cliente ya tiene sesión plena; ir a /login rebotaría a /hoy por su
    // guard getUser (dejando muerto el banner reset_ok). Vamos directo a /hoy (ya logueado).
    router.replace("/hoy");
  }

  return (
    <main className={styles.shell}>
      <div className={styles.sky} aria-hidden><Starfield /></div>
      <div className={styles.center}>
        <div className={styles.mark}>
          <span className={styles.glyph}><Icon name="enso" size={42} /></span>
          <h1 className={styles.brand}>Aluna</h1>
          <p className={styles.tag}>{tApp("tagline")}</p>
        </div>
        <div className={`card card--elevated ${styles.card}`} aria-live="polite" aria-busy={status === "checking"}>
          <h2 className={styles.title}>{t("resetTitle")}</h2>
          {status === "invalid" && (
            <>
              <p role="alert" className={styles.error}>{t("errResetLink")}</p>
              <p className={styles.switch}><Link href="/auth/forgot">{t("forgotPassword")}</Link></p>
            </>
          )}
          {status === "ready" && (
            <>
              {formError && <p role="alert" className={styles.error}>{t(formError)}</p>}
              <form onSubmit={handleSubmit} className={styles.form}>
                <input
                  className={styles.input}
                  name="newPassword"
                  type="password"
                  placeholder={t("newPassword")}
                  aria-label={t("newPassword")}
                  required
                  minLength={8}
                />
                <input
                  className={styles.input}
                  name="confirmPassword"
                  type="password"
                  placeholder={t("confirmPassword")}
                  aria-label={t("confirmPassword")}
                  required
                  minLength={8}
                />
                <button className={styles.cta} type="submit" disabled={busy}>{t("updatePassword")}</button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
