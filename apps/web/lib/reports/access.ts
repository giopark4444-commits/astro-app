import { NextResponse, type NextRequest } from "next/server";
import type { AlunaSupabaseClient } from "@aluna/supabase";
import { authenticateRoute } from "@/lib/supabase/route-auth";
import { isRequesterPlus } from "@/lib/billing/requester-plus";

// Puerta de acceso compartida por los 3 endpoints de informes: exige sesión y
// suscripción Plus ANTES de gastar en IA. Un no-Plus jamás dispara una
// generación. El user_id sale SIEMPRE de la sesión verificada, nunca del body.

export type PlusGateOk = { user: { id: string }; supabase: AlunaSupabaseClient };

/**
 * Devuelve el usuario + su cliente autenticado si tiene Plus activo, o una
 * NextResponse (401/403) lista para retornar. El check de Plus (incluido el
 * candado TODO PLANES) vive en isRequesterPlus — ver lib/billing/requester-plus.ts.
 */
export async function requirePlus(request: NextRequest): Promise<PlusGateOk | NextResponse> {
  const { supabase, user } = await authenticateRoute(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const plus = await isRequesterPlus(supabase, user.id);
  if (!plus) return NextResponse.json({ error: "plus_required" }, { status: 403 });
  return { user: { id: user.id }, supabase };
}

/** Estrecha el resultado de requirePlus: true si es la respuesta de error. */
export function isGateResponse(r: PlusGateOk | NextResponse): r is NextResponse {
  return r instanceof NextResponse;
}
