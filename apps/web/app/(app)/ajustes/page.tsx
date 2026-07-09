import { getTranslations, getLocale } from "next-intl/server";
import { SettingsControls } from "./settings-controls";
import { PlanCard } from "./plan-card";
import { createClient } from "@/lib/supabase/server";
import type { SubscriptionStatus } from "@aluna/core";
import styles from "./settings.module.css";

export default async function AjustesPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const t = await getTranslations("settings");
  const locale = await getLocale();
  const { checkout } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: row } = user
    ? await supabase
        .from("subscriptions")
        .select("status, current_period_end")
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };
  // Cast necesario: mismo bug de inferencia de @supabase/ssr que colapsa el
  // tipo de fila a `never` (workaround ya usado en layout.tsx y portal/route.ts).
  // Además la columna `status` es `string` en la BD; la angostamos aquí al
  // union que espera `PlanCard`/`isPlusActive`.
  const planRow = row as { status: SubscriptionStatus; current_period_end: string | null } | null;

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>{t("title")}</h1>
      <PlanCard row={planRow} checkoutSuccess={checkout === "success"} />
      <SettingsControls currentLocale={locale} />
    </main>
  );
}
