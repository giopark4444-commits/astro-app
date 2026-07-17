import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getRole } from "@/lib/admin/roles";
import { DEFAULT_NAV_ORDER, sanitizeNavOrder, type NavKey } from "@/lib/admin/nav-order";
import { NavOrderEditor } from "./nav-order-editor";
import { CollaboratorsPanel } from "./collaborators-panel";
import styles from "./admin.module.css";

// Panel de superusuario (brief admin-panel T4): SOLO superadmin. No aparece
// en ninguna nav — se llega por URL directa, y quien no sea superadmin
// (incluida la ausencia total de fila en `roles`, p.ej. migración 0015 sin
// aplicar → getRole ya devuelve null) rebota a /hoy sin ver nada de esto.
export default async function AdminPage() {
  const supabase = await createClient();
  const role = await getRole(supabase);
  if (role !== "superadmin") redirect("/hoy");

  const t = await getTranslations("admin");

  let initialOrder: NavKey[] = [...DEFAULT_NAV_ORDER];
  try {
    const { data } = await supabase.from("app_config").select("value").eq("key", "nav_order").maybeSingle();
    initialOrder = sanitizeNavOrder((data as { value: unknown } | null)?.value);
  } catch {
    // tabla/columna sin aplicar todavía: el default ya está asignado arriba.
  }

  return (
    <main className={styles.page}>
      <div className={styles.head}>
        <p className={styles.pageEyebrow}>{t("eyebrow")}</p>
        <h1 className={styles.pageTitle}>{t("title")}</h1>
      </div>

      <NavOrderEditor initialOrder={initialOrder} />
      <CollaboratorsPanel />
    </main>
  );
}
