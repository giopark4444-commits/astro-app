import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getRole } from "@/lib/admin/roles";
import { DEFAULT_NAV_ORDER, sanitizeNavOrder, type NavKey } from "@/lib/admin/nav-order";
import { NAV_ICON } from "@/lib/admin/nav-icons";
import { Icon } from "@/components/icon";
import { ReferralSection } from "./referral-section";
import styles from "./colab.module.css";

// Panel de colaboradores (brief admin-panel T5): collaborator O superadmin.
// No aparece en ninguna nav — URL directa. V1 honesto: solo lectura, sin
// controles de escritura (esos son exclusivos de /admin).
export default async function ColabPage() {
  const supabase = await createClient();
  const role = await getRole(supabase);
  if (role !== "collaborator" && role !== "superadmin") redirect("/hoy");

  const t = await getTranslations("admin");
  const tNav = await getTranslations("nav");

  let order: NavKey[] = [...DEFAULT_NAV_ORDER];
  try {
    const { data } = await supabase.from("app_config").select("value").eq("key", "nav_order").maybeSingle();
    order = sanitizeNavOrder((data as { value: unknown } | null)?.value);
  } catch {
    // tabla/columna sin aplicar todavía: el default ya está asignado arriba.
  }

  return (
    <main className={styles.page}>
      <section className="card">
        <h2 className={styles.eyebrow}>{t("colabWelcomeTitle")}</h2>
        <p className={styles.hint}>{t("colabWelcomeBody")}</p>
      </section>

      <ReferralSection />

      <section className="card">
        <h2 className={styles.eyebrow}>{t("navOrderTitle")}</h2>
        <p className={styles.hint}>{t("navOrderReadonlyHint")}</p>
        <ol className={styles.navList}>
          {order.map((key) => (
            <li key={key} className={styles.navRow}>
              <span className={styles.navRowIcon} aria-hidden>
                <Icon name={NAV_ICON[key]} size={18} />
              </span>
              <span className={styles.navRowLabel}>{tNav(key)}</span>
            </li>
          ))}
        </ol>
      </section>

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
