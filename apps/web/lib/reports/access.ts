import { NextResponse, type NextRequest } from "next/server";
import { isPlusActive } from "@aluna/core";
import type { AlunaSupabaseClient } from "@aluna/supabase";
import { authenticateRoute } from "@/lib/supabase/route-auth";
import { allAccessEnabled } from "@/lib/plan-gate";

// Puerta de acceso compartida por los 3 endpoints de informes: exige sesión y
// suscripción Plus ANTES de gastar en IA. Un no-Plus jamás dispara una
// generación. El user_id sale SIEMPRE de la sesión verificada, nunca del body.

export type PlusGateOk = { user: { id: string }; supabase: AlunaSupabaseClient };

/**
 * Devuelve el usuario + su cliente autenticado si tiene Plus activo, o una
 * NextResponse (401/403) lista para retornar. La suscripción se lee con el
 * cliente autenticado (RLS own-row, mismo patrón que el portal de 4a) — leer la
 * fila propia no necesita service-role; ese se reserva para ESCRIBIR informes.
 */
export async function requirePlus(request: NextRequest): Promise<PlusGateOk | NextResponse> {
  const { supabase, user } = await authenticateRoute(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // TODO PLANES: app abierta por ahora — sesión sigue siendo obligatoria, el
  // candado Plus no. Ver lib/plan-gate.ts (ALUNA_ALL_ACCESS="0" lo restaura).
  if (allAccessEnabled()) return { user: { id: user.id }, supabase };

  const { data } = await supabase
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("user_id", user.id)
    .maybeSingle();
  // Cast puntual: el bug de inferencia de @supabase/ssr colapsa la fila a `never`
  // con la versión de supabase-js instalada (mismo workaround que 4a/layout.tsx).
  const sub = data as { status: string; current_period_end: string | null } | null;

  if (!isPlusActive(sub ? { status: sub.status as never, currentPeriodEnd: sub.current_period_end } : null)) {
    return NextResponse.json({ error: "plus_required" }, { status: 403 });
  }
  return { user: { id: user.id }, supabase };
}

/** Estrecha el resultado de requirePlus: true si es la respuesta de error. */
export function isGateResponse(r: PlusGateOk | NextResponse): r is NextResponse {
  return r instanceof NextResponse;
}
