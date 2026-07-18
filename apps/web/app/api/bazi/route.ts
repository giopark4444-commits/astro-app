import { NextResponse, type NextRequest } from "next/server";
import { authenticateRoute } from "@/lib/supabase/route-auth";
import { computeBaziNatal } from "@/lib/timeline/bazi-natal";

// Cuatro Pilares (Ba Zi / Saju). Server-only. La receta de ensamblaje (efemérides
// solo para la longitud solar + sistema sexagenario puro de @aluna/core) vive en
// lib/timeline/bazi-natal.ts, compartida con /api/timeline (T3).
// profileId VALIDADO contra birth_profiles del usuario (RLS).

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const body = (raw ?? {}) as Record<string, unknown>;
  const profileId = String(body.profileId ?? "");
  if (!profileId) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const { supabase, user } = await authenticateRoute(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("birth_profiles")
    .select("birth_date, birth_time, time_known, latitude, longitude, time_zone, gender")
    .eq("id", profileId)
    .maybeSingle();
  if (!profile) return NextResponse.json({ error: "not_found" }, { status: 404 });

  try {
    const result = computeBaziNatal(profile);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "compute" }, { status: 500 });
  }
}
