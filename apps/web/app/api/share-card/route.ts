// apps/web/app/api/share-card/route.ts
// Genera la imagen JPEG de una tarjeta compartible. Auth primero (401), luego
// whitelist estricta de los query params (400 con un código por campo — nunca
// un 500 por input malo), luego el render real (500 solo si algo revienta de
// verdad). Mismo criterio de estilo/errores que api/tarot/deck/back/route.ts.
import { NextResponse, type NextRequest } from "next/server";
import { authenticateRoute } from "@/lib/supabase/route-auth";
import { parseShareParams } from "@/lib/share/validate";
import { renderShareCardImage } from "@/lib/share/render";
import type { ShareLocale } from "@/lib/share/types";

export const runtime = "nodejs"; // sharp + fs (fuentes/arte de tarot), igual que lib/share/render.ts

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

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
  const { user } = await authenticateRoute(request);
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

  try {
    const jpeg = await renderShareCardImage(params, eyebrowDate);
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
