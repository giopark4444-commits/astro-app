import { createClient } from "@/lib/supabase/server";
import { PerfilHero } from "./perfil-hero";
import { Personas } from "./personas";
import styles from "./perfil.module.css";

export default async function PerfilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: row } = user
    ? await supabase.from("profiles_user").select("avatar_url").eq("id", user.id).maybeSingle()
    : { data: null };
  const avatarPathValue = (row as { avatar_url: string | null } | null)?.avatar_url ?? null;
  const publicUrl = avatarPathValue
    ? supabase.storage.from("avatars").getPublicUrl(avatarPathValue).data.publicUrl
    : null;

  return (
    <main className={styles.page}>
      <PerfilHero userId={user!.id} avatarUrl={publicUrl} />
      <Personas />
      {/* Preferencias las inserta Task 4 aquí */}
    </main>
  );
}
