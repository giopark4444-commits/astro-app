import { NextResponse, type NextRequest } from "next/server";
import {
  inMemoryReadingCacheStore,
  supabaseReadingCacheStore,
  type ReadingCacheStore,
} from "@aluna/compute";
import { createServiceSupabaseClient } from "@aluna/supabase/server";
import type { Json } from "@aluna/supabase";
import { authenticateRoute } from "@/lib/supabase/route-auth";
import { assembleTimeline } from "@/lib/timeline/assemble";
import type { TimelineResult } from "@/lib/timeline/types";

// "Camino de vida" — POST {profileId} → TimelineResult + todayIso. Auth+RLS
// igual que /api/bazi. Los eventos son locale-free y deterministas para el
// par (perfil, horizonte), así que se cachean en `reading_cache` con clave
// `timeline:v1:${profileId}:${horizonYear}` — el mismo patrón de caché
// durable-con-fallback-en-memoria que /api/reading, /api/chart-reading,
// /api/bazi-reading y /api/horoscope-reading ya usan (replicado aquí, no
// extraído, para mantener cada ruta independiente).

export const runtime = "nodejs";

let timelineCache: ReadingCacheStore | undefined;
function getTimelineCache(): ReadingCacheStore {
  if (timelineCache) return timelineCache;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  timelineCache =
    url && serviceKey
      ? supabaseReadingCacheStore(createServiceSupabaseClient(url, serviceKey))
      : inMemoryReadingCacheStore();
  return timelineCache;
}

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

  const nowIso = new Date().toISOString();
  const horizonYear = new Date(nowIso).getUTCFullYear() + 10;
  const cacheKey = `timeline:v1:${profileId}:${horizonYear}`;
  const cache = getTimelineCache();

  try {
    const hit = await cache.get(cacheKey);
    if (hit) {
      const cached = hit as unknown as TimelineResult;
      return NextResponse.json({ ...cached, todayIso: nowIso });
    }
  } catch {
    /* miss silencioso → recalculamos */
  }

  let result: TimelineResult;
  try {
    result = assembleTimeline(profile, nowIso);
  } catch {
    return NextResponse.json({ error: "compute" }, { status: 500 });
  }

  cache
    .set({
      key: cacheKey,
      kind: "timeline",
      locale: "any",
      payload: result as unknown as Json,
    })
    .catch(() => {
      /* el guardado es best-effort; no rompe nada */
    });

  return NextResponse.json(result);
}
