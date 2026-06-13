import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@aluna/supabase";

// Rutas públicas (accesibles sin sesión). NOTA para tasks siguientes:
//  - "/" NO está aquí a propósito → queda protegida (redirige a /login).
//  - Las rutas de auth (confirmación de email, callbacks) DEBEN vivir bajo /auth/*
//    (p.ej. app/auth/confirm/route.ts), NO bajo /api/auth/* — el matcher protege /api/*.
const PUBLIC_PREFIXES = ["/login", "/signup", "/auth"];

/** True si la ruta es pública (no requiere sesión). */
export function isPublicPath(path: string): boolean {
  return PUBLIC_PREFIXES.some((p) => path.startsWith(p));
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        },
      },
    },
  );

  // No correr código entre createServerClient y getUser().
  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = isPublicPath(path);
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return supabaseResponse;
}
