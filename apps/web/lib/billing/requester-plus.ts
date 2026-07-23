import { isPlusActive } from "@aluna/core";
import { allAccessEnabled } from "@/lib/plan-gate";
import { authenticateRoute } from "@/lib/supabase/route-auth";

// Patrón "¿es Plus?" compartido: antes vivía duplicado letra por letra en
// app/api/tarot/readings/route.ts y lib/reports/access.ts (incluido el cast
// puntual de más abajo). Ahora es un solo lugar que consumen ambos — y, más
// adelante, las tasks 5/6 del sistema de créditos.

type SubscriptionRow = { status: string; current_period_end: string | null };

/**
 * true si `userId` tiene Aluna Plus activo. Con ALUNA_ALL_ACCESS abierto
 * (default actual — TODO PLANES, ver lib/plan-gate.ts) devuelve true sin
 * tocar la BD. Si el candado está activo, lee su fila de `subscriptions` con
 * el cliente YA autenticado (RLS own-row, no hace falta service-role para
 * leer la fila propia) y delega en `isPlusActive` de @aluna/core.
 */
export async function isRequesterPlus(
  supabase: Awaited<ReturnType<typeof authenticateRoute>>["supabase"],
  userId: string,
): Promise<boolean> {
  if (allAccessEnabled()) return true;

  const { data } = await supabase
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("user_id", userId)
    .maybeSingle();
  // Cast puntual: el bug de inferencia de @supabase/ssr colapsa la fila a `never`
  // con la versión de supabase-js instalada (mismo workaround que ya usaban
  // access.ts y tarot/readings/route.ts antes de este helper).
  const sub = data as SubscriptionRow | null;
  return isPlusActive(sub ? { status: sub.status as never, currentPeriodEnd: sub.current_period_end } : null);
}
