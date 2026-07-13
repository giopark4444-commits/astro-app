import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDodoClient } from "@/lib/billing/dodo-client";

// Abre el portal de Dodo (cancelar/cambiar de plan/actualizar tarjeta) para
// el dodo_customer_id de la fila propia. RLS ya limita el select a la fila
// del usuario — si no tiene fila (nunca se suscribió), 404. Sin parámetro:
// esta ruta no lee el request (a diferencia de checkout); declararlo sin usar
// rompe el build (`@typescript-eslint/no-unused-vars` sin `argsIgnorePattern`
// para "_"), bug preexistente de Task 6 que `next build` es el primer gate en
// atrapar (Task 6 solo corrió tsc+vitest).
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("subscriptions")
    .select("dodo_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();
  // Cast necesario: bug conocido de inferencia de @supabase/ssr con la
  // versión de supabase-js instalada colapsa el tipo de fila a `never`
  // (mismo workaround que app/(app)/layout.tsx con birth_profiles).
  const sub = data as { dodo_customer_id: string } | null;
  if (!sub) return NextResponse.json({ error: "not_found" }, { status: 404 });

  try {
    // Confirmado contra los tipos reales del SDK instalado en Task 4
    // (dodopayments@2.42.2): NO existe `customers.createPortalSession(...)`.
    // El método real es el sub-recurso anidado `customerPortal.create`, que
    // recibe el customerId como primer argumento posicional (no dentro del
    // objeto) y devuelve `{ link }`, no `{ url }`.
    const portal = await getDodoClient().customers.customerPortal.create(sub.dodo_customer_id, {
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/perfil`,
    });
    return NextResponse.json({ portalUrl: portal.link });
  } catch {
    return NextResponse.json({ error: "portal_failed" }, { status: 500 });
  }
}
