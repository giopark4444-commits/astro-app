import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TarotView } from "./tarot-view";

export default async function TarotPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Defensivo (AppLayout ya redirige a /login sin sesión): mismo patrón que
  // app/(app)/perfil/page.tsx. userId hace falta server→client para la
  // semilla determinista de la carta del día (dailyCard, @aluna/core).
  if (!user) redirect("/login");

  return <TarotView userId={user.id} />;
}
