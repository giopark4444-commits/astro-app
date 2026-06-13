import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

export default async function HoyPage() {
  const t = await getTranslations("hoy");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return (
    <main style={{ padding: 20 }}>
      <h1 className="display">{t("greeting")} ✦</h1>
      <p style={{ color: "var(--soft)" }}>{user?.email}</p>
      <h2 style={{ fontSize: 12, letterSpacing: 1, textTransform: "uppercase", color: "var(--soft)" }}>{t("lenses")}</h2>
    </main>
  );
}
