import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { PerfilHero } from "./perfil-hero";
import { Personas } from "./personas";
import { Manifestations } from "./manifestations";
import { Journal } from "./journal";
import styles from "./perfil.module.css";

export default async function PerfilPage() {
  const locale = await getLocale();

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

  // "En Aluna desde {mes} {año}" (mockup 06 §5.1, .pf-since) — created_at es un
  // timestamp de Supabase Auth, siempre presente para un usuario ya logueado.
  const since = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(new Date(user.created_at));

  return (
    <main className={styles.page}>
      <PerfilHero userId={user.id} avatarUrl={publicUrl} since={since} />
      <Personas />
      <div className={styles.diarioGrid}>
        <Manifestations />
        <Journal />
      </div>
    </main>
  );
}
