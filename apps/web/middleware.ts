import { type NextRequest } from "next/server";
import { updateSession } from "./lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Excluye assets estáticos Y las rutas de metadata generadas por Next
  // (icon/apple-icon/opengraph-image/robots.txt). Si el auth-check corriera
  // sobre ellas, las redirigiría (307) a /login para usuarios deslogueados y
  // crawlers → favicon, imagen OG y robots.txt quedarían inaccesibles (rompe
  // todo el propósito del "shell público" de R6). Es el patrón idiomático de
  // Next (su ejemplo de matcher lista robots.txt/sitemap.xml) y de paso evita
  // el round-trip a Supabase por cada request de estos assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|opengraph-image|robots\\.txt|sitemap\\.xml|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
