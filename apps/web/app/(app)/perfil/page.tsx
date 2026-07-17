import { redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import type { SubscriptionStatus } from "@aluna/core";
import { parseIntent } from "@aluna/core";
import { PerfilHero } from "./perfil-hero";
import { Personas } from "./personas";
import { Manifestations } from "./manifestations";
import { Journal } from "./journal";
import { PlanCard } from "./plan-card";
import { SettingsControls } from "./settings-controls";
import styles from "./perfil.module.css";

export default async function PerfilPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const t = await getTranslations("profile");
  const locale = await getLocale();
  const { checkout } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: row } = await supabase
    .from("profiles_user")
    .select("avatar_url")
    .eq("id", user.id)
    .maybeSingle();
  const avatarPathValue = (row as { avatar_url: string | null } | null)?.avatar_url ?? null;
  const publicUrl = avatarPathValue
    ? supabase.storage.from("avatars").getPublicUrl(avatarPathValue).data.publicUrl
    : null;

  // Misma lógica que la vieja ajustes/page.tsx (jubilada): cast necesario, ver
  // ese archivo en el historial de git para el porqué completo del bug de
  // inferencia de @supabase/ssr.
  const { data: subRow } = await supabase
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("user_id", user.id)
    .maybeSingle();
  const planRow = subRow as { status: SubscriptionStatus; current_period_end: string | null } | null;

  // Intención del cuestionario de primera entrada (Task 13): se lee aquí
  // (server component que ya carga los demás datos de la página) para pasar
  // el estado inicial del toggle "Aluna te conoce" — el control se muestra
  // igual aunque no haya intent (parseIntent null), pero entonces no tiene
  // efecto real (ver setIntentUseInAI).
  const { data: intentRow } = await supabase
    .from("settings")
    .select("intent")
    .eq("user_id", user.id)
    .maybeSingle();
  const intent = parseIntent((intentRow as { intent: unknown } | null)?.intent);

  return (
    <main className={styles.page}>
      <PerfilHero userId={user.id} avatarUrl={publicUrl} />
      <Personas />
      <div className={styles.diarioGrid}>
        <Manifestations />
        <Journal />
      </div>
      <section className={styles.prefs}>
        <h2 className={styles.prefsTitle}>{t("preferences")}</h2>
        <PlanCard row={planRow} checkoutSuccess={checkout === "success"} />
        <SettingsControls currentLocale={locale} hasIntent={intent !== null} intentUseInAI={intent?.useInAI ?? false} />
      </section>
    </main>
  );
}
