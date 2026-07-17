import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import type { SubscriptionStatus } from "@aluna/core";
import { parseIntent, SUPPORT_EMAIL, SOCIAL_LINKS } from "@aluna/core";
import { signOut } from "@/app/auth/actions";
import { TERMS_ES, PRIVACY_ES, DISCLAIMER_ES } from "@aluna/core";
import { TERMS_EN, PRIVACY_EN, DISCLAIMER_EN } from "@aluna/core";
import { PlanCard } from "./plan-card";
import { SettingsControls } from "./settings-controls";
import { CopyIdButton } from "./copy-id-button";
import { ReferralRedeem } from "./referral-redeem";
import styles from "./ajustes.module.css";

// Labels de la sección Legal: reusan el título ya localizado de cada
// LegalDoc en vez de duplicar la traducción en messages/*.json.
const LEGAL_LINKS = [
  { slug: "terminos", es: TERMS_ES, en: TERMS_EN },
  { slug: "privacidad", es: PRIVACY_ES, en: PRIVACY_EN },
  { slug: "descargo", es: DISCLAIMER_ES, en: DISCLAIMER_EN },
] as const;

export default async function AjustesPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const t = await getTranslations("settings");
  const tAuth = await getTranslations("auth");
  const tChat = await getTranslations("chat");
  const tProfile = await getTranslations("profile");
  const locale = await getLocale();
  const { checkout } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Misma lógica que la vieja perfil/page.tsx (T2 la mueve aquí junto con
  // PlanCard): consumía ?checkout=success para el estado "pago recibido,
  // activando…" mientras el webhook de Dodo termina de procesar.
  const { data: subRow } = await supabase
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("user_id", user.id)
    .maybeSingle();
  const planRow = subRow as { status: SubscriptionStatus; current_period_end: string | null } | null;

  // Estado inicial del toggle "Aluna te conoce" (ver settings-controls.tsx).
  const { data: intentRow } = await supabase
    .from("settings")
    .select("intent")
    .eq("user_id", user.id)
    .maybeSingle();
  const intent = parseIntent((intentRow as { intent: unknown } | null)?.intent);

  // Método de acceso: Supabase Auth guarda el proveedor en app_metadata.
  // "email" (usuario/contraseña) se muestra con copy propio; cualquier otro
  // proveedor (google, apple…) se capitaliza tal cual.
  const provider = (user.app_metadata as { provider?: string } | null)?.provider;
  const loginMethodLabel =
    !provider || provider === "email"
      ? t("loginEmail")
      : provider.charAt(0).toUpperCase() + provider.slice(1);

  const visibleSocialLinks = SOCIAL_LINKS.filter((s) => s.href);

  // Código de referido ya aplicado (si lo hay) — RLS de referred_users (0016)
  // ya acota el select a la fila propia, así que se puede leer directo acá.
  // try/catch: la migración 0016 puede no estar aplicada todavía (dev) y eso
  // nunca debe tumbar /ajustes (mismo patrón que subRow/intentRow arriba).
  let referredCode: string | null = null;
  try {
    const { data: referredRow } = await supabase.from("referred_users").select("code").eq("user_id", user.id).maybeSingle();
    referredCode = (referredRow as { code: string } | null)?.code ?? null;
  } catch {
    // tabla sin aplicar todavía: referredCode queda null (input visible).
  }

  return (
    <main className={styles.page}>
      <section className="card">
        <h2 className={styles.eyebrow}>{tProfile("preferences")}</h2>
        <SettingsControls
          currentLocale={locale}
          hasIntent={intent !== null}
          intentUseInAI={intent?.useInAI ?? false}
        />
      </section>

      <section className="card">
        <PlanCard row={planRow} checkoutSuccess={checkout === "success"} />
      </section>

      <section className="card">
        <h2 className={styles.eyebrow}>{t("account")}</h2>
        <div className={styles.row}>
          <span className={styles.rowLabel}>{t("email")}</span>
          <span className={styles.rowValue}>{user.email ?? ""}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>{t("userId")}</span>
          <div className={styles.rowValueGroup}>
            <span className={`${styles.rowValue} ${styles.mono}`}>{user.id}</span>
            <CopyIdButton value={user.id} />
          </div>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>{t("loginMethod")}</span>
          <span className={styles.rowValue}>{loginMethodLabel}</span>
        </div>
        <ReferralRedeem appliedCode={referredCode} />
      </section>

      <section className="card">
        <h2 className={styles.eyebrow}>{t("help")}</h2>
        <a href={`mailto:${SUPPORT_EMAIL}`} className={styles.rowLink}>
          <span>{SUPPORT_EMAIL}</span>
          <span className={styles.rowArrow} aria-hidden>→</span>
        </a>
        <Link href="/preguntar" className={styles.rowLink}>
          <span>{tChat("title")}</span>
          <span className={styles.rowArrow} aria-hidden>→</span>
        </Link>
      </section>

      {visibleSocialLinks.length > 0 && (
        <section className="card">
          <h2 className={styles.eyebrow}>{t("followUs")}</h2>
          {visibleSocialLinks.map((s) => (
            <a key={s.key} href={s.href} target="_blank" rel="noreferrer" className={styles.rowLink}>
              <span>{s.label}</span>
              <span className={styles.rowArrow} aria-hidden>→</span>
            </a>
          ))}
        </section>
      )}

      <section className="card">
        <h2 className={styles.eyebrow}>{t("legal")}</h2>
        {LEGAL_LINKS.map((l) => (
          <Link key={l.slug} href={`/legal/${l.slug}`} className={styles.rowLink}>
            <span>{locale === "en" ? l.en.title : l.es.title}</span>
            <span className={styles.rowArrow} aria-hidden>→</span>
          </Link>
        ))}
      </section>

      <div className={styles.signOut}>
        <form action={signOut}>
          <button type="submit" className={styles.signOutBtn}>
            {tAuth("logout")}
          </button>
        </form>
      </div>
    </main>
  );
}
