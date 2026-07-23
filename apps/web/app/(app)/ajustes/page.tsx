import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getRole } from "@/lib/admin/roles";
import type { SubscriptionStatus } from "@aluna/core";
import type { AlunaSupabaseClient } from "@aluna/supabase";
import { parseIntent, SUPPORT_EMAIL, SOCIAL_LINKS } from "@aluna/core";
import { fetchIntentAndMemorySettings } from "@/lib/settings";
import { signOut } from "@/app/auth/actions";
import { TERMS_ES, PRIVACY_ES, DISCLAIMER_ES } from "@aluna/core";
import { TERMS_EN, PRIVACY_EN, DISCLAIMER_EN } from "@aluna/core";
import { PlanCard } from "./plan-card";
import { CreditsCard } from "./credits-card";
import { SettingsControls } from "./settings-controls";
import { CopyIdButton } from "./copy-id-button";
import { ReferralRedeem } from "./referral-redeem";
import { MemoriesCard } from "./memories-card";
import { EntitiesCard } from "./entities-card";
import { EssenceCard } from "./essence-card";
import { MemoryDataCard } from "./memory-data-card";
import { DevModelGuide } from "@/components/dev-model-guide";
import { VoiceModeCard } from "@/components/voice-mode-card";
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

  // Estado inicial de los toggles "Aluna te conoce" y memoria (ver
  // settings-controls.tsx). fetchIntentAndMemorySettings degrada a leer solo
  // `intent` si `memory_enabled` (0019) todavía no está migrada — sin esto, un
  // select combinado que falla entero también tiraba la intentLine de otras
  // rutas (review Fable); memoryEnabled default true en ambos casos. Mismo
  // cast que memories-card.tsx: exactOptionalPropertyTypes hace que el
  // Database inferido de createClient() no calce estructuralmente con
  // AlunaSupabaseClient (bug upstream de postgrest-js/supabase-js).
  const { intent: rawIntent, memoryEnabled } = await fetchIntentAndMemorySettings(supabase as unknown as AlunaSupabaseClient, user.id);
  const intent = parseIntent(rawIntent);

  // Método de acceso: Supabase Auth guarda el proveedor en app_metadata.
  // "email" (usuario/contraseña) se muestra con copy propio; cualquier otro
  // proveedor (google, apple…) se capitaliza tal cual.
  const provider = (user.app_metadata as { provider?: string } | null)?.provider;
  const loginMethodLabel =
    !provider || provider === "email"
      ? t("loginEmail")
      : provider.charAt(0).toUpperCase() + provider.slice(1);

  // Rol del usuario: la entrada al panel de administración/colaborador SOLO
  // aparece si tiene el permiso. getRole devuelve null para el usuario común
  // (y también mientras la migración 0015 no esté aplicada → tabla `roles`
  // inexistente), así que la sección no se muestra a nadie hasta que Gio
  // aplique 0015 y asigne el rol. Espejo del gate de admin/page.tsx.
  const role = await getRole(supabase);

  const visibleSocialLinks = SOCIAL_LINKS.filter((s) => s.href);

  // Código de referido ya aplicado (si lo hay) — RLS de referred_users (0017)
  // ya acota el select a la fila propia, así que se puede leer directo acá.
  // try/catch: la migración 0017 puede no estar aplicada todavía (dev) y eso
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
          memoryEnabled={memoryEnabled}
        />
      </section>

      {/* Modo de Aluna (🌙 íntima / 📚 estudio / 🔭 pro): cómo cuenta lo que
          ve — por dispositivo, ver components/voice-mode-card.tsx. */}
      <VoiceModeCard />

      {/* Memoria de Aluna (reorg ajustes): Esencia+Recuerdos+Entidades+Datos
          agrupados bajo UN encabezado — cada tarjeta conserva su propio
          <section class="card"> intacto (cambio mínimo, sin tocarlas por
          dentro); el grupo solo les da un gap más apretado que el de .page
          entre secciones distintas, para que se lean como subbloques de una
          sola sección. Esencia primero dentro del grupo (Fase 2 T5): mismo
          orden que buildMemoryBlocks en memory-pipeline.ts, donde el retrato
          ancla el resto del contexto. */}
      <section className={styles.memoryGroup}>
        <h2 className={styles.eyebrow}>{t("memoryHubTitle")}</h2>
        <EssenceCard userId={user.id} />
        <MemoriesCard userId={user.id} />
        <EntitiesCard userId={user.id} />
        <MemoryDataCard />
      </section>

      <section className="card">
        <PlanCard row={planRow} checkoutSuccess={checkout === "success"} />
      </section>

      <section className="card">
        <CreditsCard checkoutCredits={checkout === "credits"} />
      </section>

      {role !== null && (
        <section className="card">
          <h2 className={styles.eyebrow}>{t("adminSection")}</h2>
          {role === "superadmin" ? (
            <Link href="/admin" className={styles.rowLink}>
              <span>{t("adminPanel")}</span>
              <span className={styles.rowArrow} aria-hidden>→</span>
            </Link>
          ) : (
            <Link href="/colab" className={styles.rowLink}>
              <span>{t("collabPanel")}</span>
              <span className={styles.rowArrow} aria-hidden>→</span>
            </Link>
          )}
        </section>
      )}

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

      {/* Guía de modelos por rubro: solo pruebas (se auto-oculta en prod); de
          última (orden coherente de ajustes, tras Legal). */}
      <DevModelGuide />

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
