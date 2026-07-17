"use client";
// VISTA PREVIA TEMPORAL — NO COMMITEAR. Mockup vivo de /admin y /colab con
// datos de ejemplo (misma piel: clases reales de admin.module.css).
import { NextIntlClientProvider, useTranslations } from "next-intl";
import { ThemeProvider } from "@/lib/theme/theme-provider";
import es from "@/messages/es.json";
import { NavOrderEditor } from "../(app)/admin/nav-order-editor";
import { DEFAULT_NAV_ORDER, type NavKey } from "@/lib/admin/nav-order";
import { NAV_ICON } from "@/lib/admin/nav-icons";
import { Icon } from "@/components/icon";
import styles from "../(app)/admin/admin.module.css";

const FIXTURE_ROLES = [
  { user_id: "1", email: "gio.park.4444@gmail.com", role: "superadmin" as const },
  { user_id: "2", email: "maria.estrella@gmail.com", role: "collaborator" as const },
  { user_id: "3", email: "cielo.luna@aluna.app", role: "collaborator" as const },
];

function CollabFixture() {
  const t = useTranslations("admin");
  return (
    <section className="card">
      <h2 className={styles.eyebrow}>{t("collabTitle")}</h2>
      <ul className={styles.rolesList}>
        {FIXTURE_ROLES.map((r) => (
          <li key={r.user_id} className={styles.roleRow}>
            <span className={styles.roleEmail}>{r.email}</span>
            <span className={`chip ${styles.roleChip}`}>{t(r.role === "superadmin" ? "roleSuperadmin" : "roleCollaborator")}</span>
            <button type="button" className={styles.removeBtn}>{t("remove")}</button>
          </li>
        ))}
      </ul>
      <form className={styles.grantForm}>
        <input type="email" className={styles.grantEmail} placeholder={t("emailPlaceholder")} readOnly />
        <div className="seg" role="group">
          <button type="button" className="seg__item seg__item--active">{t("roleCollaborator")}</button>
          <button type="button" className="seg__item">{t("roleSuperadmin")}</button>
        </div>
        <button type="button" className={styles.saveBtn}>{t("grant")}</button>
      </form>
    </section>
  );
}


function ReferidosFixture() {
  const t = useTranslations("admin");
  const fmt = (c: number) => `$${(c / 100).toFixed(2)}`;
  const rows = [
    { code: "MARIA10", owner_email: "maria.estrella@gmail.com", discount_pct: 10, commission_pct: 30, active: true, referred_count: 14, pending_cents: 2097, paid_cents: 8990 },
    { code: "CIELO", owner_email: "cielo.luna@aluna.app", discount_pct: 15, commission_pct: 30, active: true, referred_count: 6, pending_cents: 898, paid_cents: 1497 },
  ];
  return (
    <section className="card">
      <h2 className={styles.eyebrow}>{t("referralTitle")}</h2>
      <p className={styles.hint}>{t("referralNote")}</p>
      <ul className={styles.referralList}>
        {rows.map((row) => (
          <li key={row.code} className={styles.referralRow}>
            <div className={styles.referralRowHead}>
              <span className={styles.roleEmail}>{row.owner_email}</span>
              <span className={`chip ${styles.roleChip}`}>{row.code}</span>
            </div>
            <div className={styles.referralRowStats}>
              <span>{t("referralDiscountShort")} {row.discount_pct}%</span>
              <span>{t("referralCommissionShort")} {row.commission_pct}%</span>
              <span>{t("referralReferredShort")} {row.referred_count}</span>
              <span>{t("referralPendingShort")} {fmt(row.pending_cents)}</span>
              <span>{t("referralPaidShort")} {fmt(row.paid_cents)}</span>
            </div>
            <div className={styles.referralRowActions}>
              <button type="button" className={styles.removeBtn}>{t("referralMarkPaid")}</button>
              <button type="button" className={styles.removeBtn}>{t("referralDeactivate")}</button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TuCodigoFixture() {
  const t = useTranslations("admin");
  const fmt = (c: number) => `$${(c / 100).toFixed(2)}`;
  return (
    <section className="card">
      <h2 className={styles.eyebrow}>{t("myReferralTitle")}</h2>
      <div className={styles.referralRowHead} style={{ margin: "10px 0" }}>
        <span className={`chip ${styles.roleChip}`} style={{ fontSize: 18, padding: "8px 18px" }}>MARIA10</span>
        <button type="button" className={styles.removeBtn}>{t("myReferralCopy")}</button>
      </div>
      <p className={styles.hint}>https://aluna.app/?ref=MARIA10</p>
      <div className={styles.referralRowStats}>
        <span>{t("referralReferredShort")} 14</span>
        <span>{t("referralPendingShort")} {fmt(2097)}</span>
        <span>{t("referralPaidShort")} {fmt(8990)}</span>
      </div>
    </section>
  );
}

function ColabFixture() {
  const t = useTranslations("admin");
  const tNav = useTranslations("nav");
  const order: NavKey[] = [...DEFAULT_NAV_ORDER];
  return (
    <main className={styles.page}>
      <div className={styles.head}>
        <p className={styles.pageEyebrow}>Aluna · Colaboradores</p>
        <h1 className={styles.pageTitle}>Panel de colaboradores</h1>
      </div>
      <section className="card">
        <h2 className={styles.eyebrow}>{t("colabWelcomeTitle")}</h2>
        <p className={styles.hint}>{t("colabWelcomeBody")}</p>
      </section>
      <section className="card">
        <h2 className={styles.eyebrow}>{t("navOrderTitle")}</h2>
        <p className={styles.hint}>{t("navOrderReadonlyHint")}</p>
        <ol className={styles.navList}>
          {order.map((key) => (
            <li key={key} className={styles.navRow}>
              <span className={styles.navRowIcon} aria-hidden><Icon name={NAV_ICON[key]} size={18} /></span>
              <span className={styles.navRowLabel}>{tNav(key)}</span>
            </li>
          ))}
        </ol>
      </section>
      <TuCodigoFixture />
      <section className="card card--dashed">
        <h2 className={styles.eyebrow}>{t("comingSoonTitle")}</h2>
        <ul className={styles.soonList}>
          <li>{t("comingSoonItem1")}</li>
          <li>{t("comingSoonItem2")}</li>
          <li>{t("comingSoonItem3")}</li>
        </ul>
      </section>
    </main>
  );
}

export default function DevAdmin() {
  return (
    <ThemeProvider initialTheme="observatory" initialMode="dark" persist={async () => {}}>
      <NextIntlClientProvider locale="es" messages={es}>
        <div style={{ display: "flex", gap: 48, justifyContent: "center", padding: "40px 24px", alignItems: "flex-start" }}>
          <div style={{ flex: "0 1 620px" }}>
            <main className={styles.page}>
              <div className={styles.head}>
                <p className={styles.pageEyebrow}>Aluna · Superusuario</p>
                <h1 className={styles.pageTitle}>Panel de administración</h1>
              </div>
              <NavOrderEditor initialOrder={[...DEFAULT_NAV_ORDER]} />
              <CollabFixture />
              <ReferidosFixture />
            </main>
          </div>
          <div style={{ flex: "0 1 620px" }}>
            <ColabFixture />
          </div>
        </div>
      </NextIntlClientProvider>
    </ThemeProvider>
  );
}
