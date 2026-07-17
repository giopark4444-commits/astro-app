import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "./lib/supabase/middleware";

// VISTA PREVIA TEMPORAL (NO COMMITEAR): CORS dev para expo web del worktree (8082).
const DEV_CORS =
  process.env.NODE_ENV === "development"
    ? {
        "Access-Control-Allow-Origin": "http://localhost:8082",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "authorization,content-type",
      }
    : null;

export async function middleware(request: NextRequest) {
  const isApi = request.nextUrl.pathname.startsWith("/api/");
  if (DEV_CORS && isApi && request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: DEV_CORS });
  }
  const response = await updateSession(request);
  if (DEV_CORS && isApi && request.headers.get("origin") === "http://localhost:8082") {
    for (const [k, v] of Object.entries(DEV_CORS)) response.headers.set(k, v);
  }
  return response;
}

export const config = {
  // Excluye assets estáticos Y las rutas de metadata generadas por Next
  // (icon/apple-icon/opengraph-image/robots.txt). Si el auth-check corriera
  // sobre ellas, las redirigiría (307) a /login para usuarios deslogueados y
  // crawlers → favicon, imagen OG y robots.txt quedarían inaccesibles (rompe
  // todo el propósito del "shell público" de R6). Es el patrón idiomático de
  // Next (su ejemplo de matcher lista robots.txt/sitemap.xml) y de paso evita
  // el round-trip a Supabase por cada request de estos assets.
  // ⚠️ Estos tokens son PREFIJOS sin frontera: no añadas una ruta PROTEGIDA que
  // empiece por icon/apple-icon/opengraph-image (p.ej. /iconografia, /icons) — el
  // matcher la excluiría del auth-check silenciosamente. Ninguna ruta actual lo hace.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|opengraph-image|robots\\.txt|sitemap\\.xml|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
