// apps/web/app/api/share-card/route.ts
// Genera la imagen JPEG de una tarjeta compartible. Auth primero (401), luego
// whitelist estricta de los query params (400 con un código por campo — nunca
// un 500 por input malo), luego el render real (500 solo si algo revienta de
// verdad). Mismo criterio de estilo/errores que api/tarot/deck/back/route.ts.
import { NextResponse, type NextRequest } from "next/server";
import type { AlunaSupabaseClient } from "@aluna/supabase";
import { authenticateRoute } from "@/lib/supabase/route-auth";
import { parseShareParams } from "@/lib/share/validate";
import { renderShareCardImage } from "@/lib/share/render";
import type { ShareLocale } from "@/lib/share/types";

export const runtime = "nodejs"; // sharp + fs (fuentes/arte de tarot), igual que lib/share/render.ts

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const PERSON_NAME_MAX_LENGTH = 24;

/** Sanea el nombre YA resuelto server-side antes de pintarlo en la card:
 *  quita saltos de línea/tabs/control chars, colapsa espacios múltiples a
 *  uno, y corta a `PERSON_NAME_MAX_LENGTH` (con "…" si excede). Vacío tras
 *  sanear (o el valor de origen es null/undefined) → undefined, es decir
 *  "sin nombre que mostrar" — nunca revienta el render por un dato sucio.
 *  Recorre carácter a carácter (no un regex de rango de control chars, que es
 *  fácil de transcribir mal) para no depender de escapes unicode literales. */
function sanitizePersonName(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  let cleaned = "";
  for (const ch of raw) {
    const code = ch.codePointAt(0) ?? 0;
    const isControlChar = code < 0x20 || code === 0x7f;
    cleaned += isControlChar ? " " : ch;
  }
  const collapsed = cleaned.trim().replace(/\s+/g, " ");
  if (!collapsed) return undefined;
  return collapsed.length <= PERSON_NAME_MAX_LENGTH ? collapsed : `${collapsed.slice(0, PERSON_NAME_MAX_LENGTH)}…`;
}

/** Resuelve el nombre a mostrar SIEMPRE del lado del server, desde el perfil
 *  autenticado — el cliente jamás manda el nombre en sí (whitelist de
 *  validate.ts: solo `name=0|1` + `profileId` opcional, ya validado como
 *  UUID). Con `profileId`, el nombre sale de ESE birth_profile — la condición
 *  `user_id` verifica propiedad (si no es suyo, no hay fila → sin nombre, no
 *  un 403: mismo criterio "silencioso" que el resto de la ruta ante datos que
 *  no calzan). Sin `profileId`, cae al `display_name` de la cuenta. Un fallo
 *  de cualquiera de las dos consultas NUNCA rompe el render — se loguea y se
 *  sigue sin nombre (mismo criterio que el catch de render más abajo). */
async function resolvePersonName(
  supabase: AlunaSupabaseClient,
  userId: string,
  profileId: string | undefined,
): Promise<string | undefined> {
  try {
    if (profileId) {
      const { data } = await supabase
        .from("birth_profiles")
        .select("name")
        .eq("id", profileId)
        .eq("user_id", userId)
        .maybeSingle();
      return sanitizePersonName(data?.name);
    }
    // profiles_user.id ES el id de auth.users (no hay columna user_id propia
    // en esta tabla — ver migración 0001_core_schema.sql).
    const { data } = await supabase.from("profiles_user").select("display_name").eq("id", userId).maybeSingle();
    return sanitizePersonName(data?.display_name);
  } catch (err) {
    console.error("[share-card] name lookup", err);
    return undefined;
  }
}

/** `date=YYYY-MM-DD` opcional (solo horóscopo). Sin el param, usa "ahora" del
 *  server. Rechaza formato inválido Y fechas de calendario inexistentes
 *  (ej. 2026-02-30, que Date normaliza silenciosamente a marzo). */
function parseDateParam(searchParams: URLSearchParams): { date: Date } | { error: "bad_date" } {
  const raw = searchParams.get("date");
  if (raw === null) return { date: new Date() };
  if (!DATE_RE.test(raw)) return { error: "bad_date" };

  const [y, m, d] = raw.split("-").map(Number) as [number, number, number];
  const date = new Date(`${raw}T00:00:00Z`);
  const isRealDate = date.getUTCFullYear() === y && date.getUTCMonth() + 1 === m && date.getUTCDate() === d;
  if (Number.isNaN(date.getTime()) || !isRealDate) return { error: "bad_date" };

  return { date };
}

/** "21 DE JULIO" (es) / "JULY 21" (en) — mismas opciones de Intl para ambos
 *  locales: el orden día/mes lo decide la convención del propio locale, no el
 *  orden de las claves del objeto de opciones (verificado en Node). */
function formatEyebrowDate(date: Date, locale: ShareLocale): string {
  const intlLocale = locale === "en" ? "en-US" : "es-ES";
  const formatted = new Intl.DateTimeFormat(intlLocale, { day: "numeric", month: "long", timeZone: "UTC" }).format(date);
  return formatted.toUpperCase();
}

export async function GET(request: NextRequest) {
  const { supabase, user } = await authenticateRoute(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const searchParams = request.nextUrl.searchParams;
  const params = parseShareParams(searchParams);
  if ("error" in params) return NextResponse.json({ error: params.error }, { status: 400 });

  let eyebrowDate: string | undefined;
  if (params.lens === "horoscopo") {
    const parsedDate = parseDateParam(searchParams);
    if ("error" in parsedDate) return NextResponse.json({ error: parsedDate.error }, { status: 400 });
    eyebrowDate = formatEyebrowDate(parsedDate.date, params.locale);
  }

  // Toggle "Mostrar el nombre": el cliente solo manda el booleano (+ el
  // profileId opcional, ya validado como UUID) — el nombre en sí SIEMPRE se
  // resuelve acá, del perfil autenticado. Si el toggle está apagado, ni
  // siquiera se consulta la DB.
  const personName = params.showName ? await resolvePersonName(supabase, user.id, params.profileId) : undefined;

  try {
    const jpeg = await renderShareCardImage(params, {
      // Spread condicional, no `eyebrowDate: undefined`/`personName: undefined`
      // (exactOptionalPropertyTypes distingue "la clave no está" de "está con
      // valor undefined" — mismo criterio que validate.ts/render.ts).
      ...(eyebrowDate !== undefined ? { eyebrowDate } : {}),
      ...(personName !== undefined ? { personName } : {}),
    });
    // BodyInit no incluye Buffer explícitamente en los tipos de este repo
    // (Next 14 + @types/node) — Uint8Array sí, y Buffer ya lo es en runtime.
    return new NextResponse(new Uint8Array(jpeg), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    console.error("[share-card] render failed", err); // observabilidad; no se filtra al cliente
    return NextResponse.json({ error: "render_failed" }, { status: 500 });
  }
}
