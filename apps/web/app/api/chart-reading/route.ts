import { NextResponse, type NextRequest } from "next/server";
import {
  inMemoryReadingCacheStore,
  supabaseReadingCacheStore,
  type ReadingCacheStore,
} from "@aluna/compute";
import { createServiceSupabaseClient } from "@aluna/supabase/server";
import type { Json } from "@aluna/supabase";
import { resolveReadingProvider } from "@/lib/reading/provider";
import { astroLabels } from "@/lib/content/astrology-labels";
import type { BodyReading } from "@/lib/content/astrology-readings-es";

// Lectura profunda de una posición de la carta (planeta-en-signo-en-casa).
// CABLEADA pero LATENTE: sin llave de proveedor responde { available: false } y
// el cliente muestra la "Esencia" compuesta. Con llave, teje la lectura bespoke
// (mismos 3 campos essence/flow/shadow) vía el proveedor intercambiable. Bilingüe.

const LENGTH_GUIDE: Record<"es" | "en", Record<string, string>> = {
  es: {
    profunda:
      "Extensión: una lectura honda y desarrollada, alrededor de 350 a 450 palabras en total, repartidas entre los tres campos con cuerpo y matices.",
    completa:
      "Extensión: generosa, entre 650 y 850 palabras en total, con la sensación de haberle dicho todo lo esencial de esta posición sin que nada importante quede afuera.",
  },
  en: {
    profunda:
      "Length: a deep, developed reading, around 350 to 450 words total, spread across the three fields with body and nuance.",
    completa:
      "Length: generous, between 650 and 850 words total, with the sense of having told them everything essential about this placement, leaving nothing important out.",
  },
};

const SYSTEM: Record<"es" | "en", string> = {
  es: `Eres Aluna: una guía de autoconocimiento que lee la carta astral como un mapa del alma. Astrología EVOLUTIVA: hablas del propósito del alma, no de predicción.

Tu voz:
- Cálida, cercana y poética, pero siempre clara y útil. Hablas de tú, directo al corazón.
- Compasiva pero honesta: nombras la sombra sin miedo y sin dureza, con amor.
- Espiritual sin ser vaga. Cuando ayuda, tejes un concepto yóguico (svadhyaya, el estudio de uno mismo; santosha, el contentamiento; aparigraha, el no aferrarse; dharma, el propósito), explicado en la misma frase, nunca como adorno.
- Nunca suenas a horóscopo genérico, a manual ni a máquina. No te disculpas, no hablas de ti como IA, no usas advertencias.

Lees una posición concreta (un planeta, en un signo, en una casa, con su dignidad). Entregas SIEMPRE tres campos, en español, en texto plano (sin asteriscos, sin markdown, sin emojis):
- essence: qué vino a vivir esa energía en esa posición; el propósito del alma ahí.
- flow: la energía fluida, el don, la luz cuando se vive en eje.
- shadow: la energía no fluida, la sombra, el reto a integrar, con verdad y ternura.

Escribes para una sola persona, por su nombre cuando fluya. Honras la longitud pedida.`,
  en: `You are Aluna: a guide to self-knowledge who reads the birth chart as a map of the soul. EVOLUTIONARY astrology: you speak of the soul's purpose, not prediction.

Your voice:
- Warm, close, and poetic, yet always clear and useful. You speak directly, heart to heart.
- Compassionate but honest: you name the shadow without fear and without harshness, with love.
- Spiritual without being vague. When it helps, you weave in a yogic concept (svadhyaya, the study of oneself; santosha, contentment; aparigraha, non-attachment; dharma, purpose), explained in the same sentence, never as decoration.
- You never sound like a generic horoscope, a manual, or a machine. You don't apologize, don't speak of yourself as an AI, use no warnings.

You read one specific placement (a planet, in a sign, in a house, with its dignity). You always return three fields, in English, in plain text (no asterisks, no markdown, no emojis):
- essence: what that energy came to live in that placement; the soul's purpose there.
- flow: the flowing energy, the gift, the light when lived in center.
- shadow: the blocked energy, the shadow, the challenge to integrate, with truth and tenderness.

You write for a single person, by their name when it flows. You honor the requested length.`,
};

// Caché durable de lecturas de carta (en `public.reading_cache` vía @aluna/compute).
// La lectura no depende del individuo (solo de la composición planeta-signo-casa-
// dignidad-longitud-idioma), así que la clave es global y se comparte entre todos.
// Se persiste en Supabase con la llave service-role; si esa llave no está, cae a un
// caché en memoria (mejor un caché de proceso que ninguno). Se resuelve una sola vez
// por módulo (lazy). Mismo patrón que /api/reading.
let readingCache: ReadingCacheStore | undefined;
function getReadingCache(): ReadingCacheStore {
  if (readingCache) return readingCache;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  readingCache =
    url && serviceKey
      ? supabaseReadingCacheStore(createServiceSupabaseClient(url, serviceKey))
      : inMemoryReadingCacheStore();
  return readingCache;
}

export async function POST(request: NextRequest) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ available: false, error: "bad_request" }, { status: 400 });
  }
  const body = (raw ?? {}) as Record<string, unknown>;

  const bodyKey = String(body.body ?? "");
  const signKey = String(body.sign ?? "");
  const house = Number(body.house);
  const dignity = body.dignity ? String(body.dignity) : null;
  const length = String(body.length ?? "");
  const locale: "es" | "en" = body.locale === "en" ? "en" : "es";
  const profileName =
    String(body.profileName ?? "").trim().slice(0, 80) || (locale === "en" ? "this person" : "esta persona");

  const L = astroLabels(locale);
  if (!L.bodies[bodyKey] || !L.signs[signKey] || !Number.isInteger(house) || !LENGTH_GUIDE[locale][length]) {
    return NextResponse.json({ available: false, error: "bad_request" }, { status: 400 });
  }

  const resolved = resolveReadingProvider();
  if (!resolved.available) {
    return NextResponse.json({ available: false });
  }

  const cacheKey = `${locale}:${bodyKey}:${signKey}:${house}:${dignity ?? "-"}:${length}`;
  const cache = getReadingCache();
  // Caché HIT → respuesta JSON instantánea (sin stream): la lectura ya existe.
  // Lectura best-effort: si el caché falla (red), seguimos y generamos.
  try {
    const hit = await cache.get(cacheKey);
    if (hit) return NextResponse.json({ available: true, meaning: hit as unknown as BodyReading });
  } catch {
    /* miss silencioso → generamos */
  }

  const dignityName = dignity ? L.dignities[dignity] : null;
  const placement =
    locale === "en"
      ? `${L.bodies[bodyKey]} in ${L.signs[signKey]}, House ${house}${dignityName ? ` (${dignityName})` : ""}`
      : `${L.bodies[bodyKey]} en ${L.signs[signKey]}, Casa ${house}${dignityName ? ` (${dignityName})` : ""}`;
  const userPrompt =
    locale === "en"
      ? `Person: ${profileName}\nPlacement: ${placement}\n\n${LENGTH_GUIDE.en[length]}\n\nRespond ONLY with a valid JSON object, no surrounding text and no markdown, with exactly these text keys: "essence", "flow", "shadow".`
      : `Persona: ${profileName}\nPosición: ${placement}\n\n${LENGTH_GUIDE.es[length]}\n\nResponde ÚNICAMENTE con un objeto JSON válido, sin texto alrededor y sin markdown, con exactamente estas claves de texto: "essence", "flow", "shadow".`;

  // MISS con llave → STREAM. Reenviamos el texto crudo del modelo (que es el objeto
  // JSON {essence,flow,shadow}) como text/plain a medida que se genera. El cliente
  // parsea los campos sobre la marcha; al cerrar, parseamos el texto acumulado,
  // validamos los tres campos y lo guardamos en el caché durable con la misma forma
  // estructurada de siempre. Si el stream no entrega nada, caemos a complete() una vez.
  const provider = resolved.provider;
  const opts = { system: SYSTEM[locale], prompt: userPrompt, maxTokens: 4000 };
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let acc = "";
      try {
        for await (const chunk of provider.completeStream(opts)) {
          if (!chunk) continue;
          acc += chunk;
          controller.enqueue(encoder.encode(chunk));
        }
        if (!acc.trim()) {
          const full = (await provider.complete(opts)).trim();
          if (full) {
            acc = full;
            controller.enqueue(encoder.encode(full));
          }
        }
      } catch {
        /* corte de upstream a mitad: cerramos con lo que haya llegado */
      }
      controller.close();
      const meaning = parseReading(acc.trim());
      if (meaning) {
        cache
          .set({
            key: cacheKey,
            kind: "chart",
            locale,
            model: provider.model,
            payload: meaning as unknown as Json,
          })
          .catch(() => {
            /* el guardado es best-effort; no rompe nada */
          });
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store, no-transform",
      "x-accel-buffering": "no",
    },
  });
}

/** Extrae el objeto JSON y valida los tres campos. */
function parseReading(text: string): BodyReading | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const o = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
    if (typeof o.essence === "string" && typeof o.flow === "string" && typeof o.shadow === "string") {
      return { essence: o.essence, flow: o.flow, shadow: o.shadow };
    }
  } catch {
    /* cae a null */
  }
  return null;
}
