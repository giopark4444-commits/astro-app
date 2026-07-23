import { NextResponse, type NextRequest } from "next/server";
import { authenticateRoute } from "@/lib/supabase/route-auth";
import { resolveVisionProvider } from "@/lib/reading/provider";
import { parseModelOverride } from "@/lib/reading/model-catalog";
import { extractionSystem, extractionPrompt } from "@/lib/palm/prompts";
import { parsePalmFeatures } from "@/lib/palm/schema";

// Etapa 1 de la lectura de mano: los OJOS. Recibe UNA foto (base64), la mira
// un proveedor con visión (gemini→openai→anthropic) y devuelve el inventario
// quiromántico estructurado — o, si la foto no sirve, la guía para retomarla.
//
// PRIVACIDAD (regla dura): la foto se procesa EN MEMORIA y se descarta. No se
// guarda en disco, ni en BD, ni en logs, ni en caché — al cliente solo vuelve
// el JSON de rasgos. Por eso tampoco hay caché aquí: cada foto es única y su
// contenido no debe persistir en el servidor bajo ninguna forma.

export const runtime = "nodejs";

// ~6MB de imagen (base64 ≈ 4/3 del binario). Las cámaras de móvil comprimidas
// caben de sobra; el cliente además reescala antes de subir.
const MAX_BASE64_CHARS = 8_400_000;
const ALLOWED_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);
const HANDS = new Set(["dominante", "pasiva", "desconocida"]);

export async function POST(request: NextRequest) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ available: false, error: "bad_request" }, { status: 400 });
  }
  const body = (raw ?? {}) as Record<string, unknown>;
  const locale: "es" | "en" = body.locale === "en" ? "en" : "es";
  const hand = HANDS.has(String(body.hand)) ? (String(body.hand) as "dominante" | "pasiva" | "desconocida") : "desconocida";

  const image = (body.image ?? {}) as Record<string, unknown>;
  // Tolerante con el prefijo data-URL: el cliente manda base64 puro, pero si
  // llega con "data:image/...;base64," lo pelamos aquí.
  let data = typeof image.data === "string" ? image.data : "";
  const dataUrlMatch = data.match(/^data:([a-z/+.-]+);base64,(.*)$/i);
  const mime = dataUrlMatch ? dataUrlMatch[1]! : typeof image.mime === "string" ? image.mime : "";
  if (dataUrlMatch) data = dataUrlMatch[2]!;

  if (!data || !ALLOWED_MIMES.has(mime)) {
    return NextResponse.json({ available: false, error: "bad_request" }, { status: 400 });
  }
  if (data.length > MAX_BASE64_CHARS) {
    return NextResponse.json({ available: false, error: "too_large" }, { status: 413 });
  }

  const { user } = await authenticateRoute(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const resolved = resolveVisionProvider(parseModelOverride(body.modelOverride));
  if (!resolved.available) {
    // Latente: sin llave con visión (gemini/openai/anthropic). Mismo patrón
    // que el resto de lecturas.
    return NextResponse.json({ available: false });
  }

  let text: string;
  try {
    text = await resolved.provider.visionComplete({
      system: extractionSystem(locale),
      prompt: extractionPrompt(locale, hand),
      images: [{ data, mime }],
      maxTokens: 3000,
    });
  } catch {
    return NextResponse.json({ error: "upstream" }, { status: 502 });
  }

  const features = parsePalmFeatures(text);
  if (!features) {
    return NextResponse.json({ error: "bad_response" }, { status: 502 });
  }
  // La mano declarada por el cliente manda sobre lo que el modelo haya puesto.
  features.mano.declarada = hand;

  return NextResponse.json(
    { available: true, features },
    { headers: { "x-aluna-model": `${resolved.provider.name}/${resolved.provider.model}` } },
  );
}
