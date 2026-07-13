import { NextResponse, type NextRequest } from "next/server";
import { authenticateRoute } from "@/lib/supabase/route-auth";
import { createServiceSupabaseClient } from "@aluna/supabase/server";
import { validateAvatarFile, avatarPath } from "@/lib/avatar";
import type { TablesUpdate } from "@aluna/supabase";

// exactOptionalPropertyTypes hace que postgrest-js infiera el arg de update() como
// `never` (mismo shim que avatar-upload.tsx / app/onboarding/actions.ts).
type ProfileUpdate = {
  update: (v: TablesUpdate<"profiles_user">) => { eq: (col: string, val: string) => Promise<{ error: unknown }> };
};

// Node runtime explícito (sube archivos + service-role), como el resto de rutas
// server-only del repo (reports/webhooks/chart) — consistencia, no depende del
// default de Next.
export const runtime = "nodejs";

// Subida de avatar server-side. El path SIEMPRE se deriva de user.id de la
// sesión verificada por authenticateRoute — NUNCA de un campo del FormData —
// así que service-role puede subir sin RLS de storage con seguridad: el único
// input del cliente son los bytes del archivo. Nace de la Fase 5: el servicio
// de Storage de este proyecto no resuelve auth.uid() de los tokens ES256, así
// que la subida client-side directa no es viable (PostgREST sí los valida);
// esta ruta es robusta sin importar ese problema de plataforma.
export async function POST(req: NextRequest) {
  const { user } = await authenticateRoute(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Sin la llave de servicio la ruta queda latente (503), igual que el resto
  // de features server-only del repo (reports, webhooks) — no un 500.
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ error: "unavailable" }, { status: 503 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "nofile" }, { status: 400 });

  // La validación del cliente (avatar-upload.tsx) es solo UX; esta es la que
  // cuenta — el server es el límite de confianza.
  const check = validateAvatarFile({ type: file.type, size: file.size });
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });

  const path = avatarPath(user.id); // ← de la sesión verificada, no del cliente
  const svc = createServiceSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
  const bytes = new Uint8Array(await file.arrayBuffer());

  const up = await svc.storage.from("avatars").upload(path, bytes, { upsert: true, contentType: file.type });
  if (up.error) {
    console.error("[avatar] upload failed", up.error); // observabilidad (como reports/request.ts); no se filtra al cliente
    return NextResponse.json({ error: "upload" }, { status: 500 });
  }

  const builder = svc.from("profiles_user") as unknown as ProfileUpdate;
  const { error: dbErr } = await builder.update({ avatar_url: path }).eq("id", user.id);
  if (dbErr) {
    console.error("[avatar] avatar_url update failed", dbErr);
    return NextResponse.json({ error: "db" }, { status: 500 });
  }

  const { data } = svc.storage.from("avatars").getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
