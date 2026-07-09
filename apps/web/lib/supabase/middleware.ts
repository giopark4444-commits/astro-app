import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { createBrowserSupabaseClient, type Database } from "@aluna/supabase";
import { parseBearerToken } from "./bearer";

// Rutas públicas (accesibles sin sesión). NOTA para tasks siguientes:
//  - "/" NO está aquí a propósito → queda protegida (redirige a /login).
//  - Las rutas de auth (confirmación de email, callbacks) DEBEN vivir bajo /auth/*
//    (p.ej. app/auth/confirm/route.ts), NO bajo /api/auth/* — el matcher protege /api/*.
//  - "/api/webhooks/dodo" es pública a propósito: Dodo la llama sin cookie de
//    sesión ni Bearer, y el middleware la redirigía (307) a /login antes de
//    que llegara al handler — el pago nunca se reflejaba en la BD. Es seguro
//    EXACTAMENTE porque esa ruta verifica su propia firma HMAC (Standard
//    Webhooks, ver lib/billing/dodo-webhook.ts) como autenticación real, no
//    depende de la sesión. Se usa la ruta EXACTA (no el prefijo genérico
//    "/api/webhooks") a propósito: cualquier webhook futuro bajo ese prefijo
//    debe optar explícitamente por ser público, no heredarlo por accidente.
const PUBLIC_PREFIXES = ["/login", "/signup", "/auth", "/api/webhooks/dodo"];

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
  const { data: { user: cookieUser } } = await supabase.auth.getUser();

  // Sin cookie (típico del móvil, que manda su sesión como Authorization:
  // Bearer en vez de cookies) → valida ese token antes de dar por no-autenticado.
  // Las rutas /api/* igual hacen su propia verificación (route-auth.ts); esto
  // solo evita que el middleware las intercepte con un 307 a /login antes de
  // que el fetch del móvil llegue a la ruta.
  let bearerUser = null;
  const bearer = !cookieUser ? parseBearerToken(request.headers.get("authorization")) : null;
  if (bearer) {
    const bearerClient = createBrowserSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } },
    );
    const { data } = await bearerClient.auth.getUser(bearer);
    bearerUser = data.user;
  }
  const user = cookieUser ?? bearerUser;

  const path = request.nextUrl.pathname;
  const isPublic = isPublicPath(path);
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return supabaseResponse;
}
