import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// `?ref=CODIGO` puede llegar acá (link de referido a la raíz del dominio) — se
// reenvía tal cual a /login para que ReferralCapture lo agarre ahí; "/" nunca
// renderiza nada (redirige siempre), así que no puede leerlo por sí misma.
export default async function Home({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/hoy");
  const { ref } = await searchParams;
  redirect(ref ? `/login?ref=${encodeURIComponent(ref)}` : "/login");
}
