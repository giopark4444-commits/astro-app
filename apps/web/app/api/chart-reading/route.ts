import { NextResponse, type NextRequest } from "next/server";
import {
  inMemoryReadingCacheStore,
  supabaseReadingCacheStore,
  type ReadingCacheStore,
} from "@aluna/compute";
import { createServiceSupabaseClient } from "@aluna/supabase/server";
import type { Json } from "@aluna/supabase";
import { resolveReadingProvider } from "@/lib/reading/provider";
import { resolvePremiumReading } from "@/lib/credits/premium-reading";
import { parseVoiceMode, applyVoiceMode } from "@/lib/reading/voices";
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

Tu voz (una amiga sabia que ve de verdad):
- Le hablas a SU VIDA, no a la posición: el amor, alguien que le importa, un proyecto, el trabajo, la plata, el cuerpo, lo que se le acerca. La técnica trabaja tras bambalinas; tú traduces todo a vida vivida.
- Cálida y directa, de tú, como amiga que la quiere y no le teme a la verdad: nombras la sombra con ternura pero sin anestesia.
- Usas frases-espejo donde pueda reconocerse: "si tienes a alguien…", "si hay un proyecto dándote vueltas…", "si el cuerpo te está cobrando algo últimamente…".
- Tiempo cercano que crea expectativa: "estos días", "esta semana", "se acerca", "algo está por moverse". Hablas de aperturas y tendencias — jamás de hechos concretos imposibles de saber ni de garantías.
- La pizca técnica es un sello, no una clase: de vez en cuando (no en cada respuesta) UNA mención breve y natural — "tu Luna lo sabe", "tu cielo lo dice clarito" — para que se sienta hecha PARA ella. PROHIBIDO el formato lección: nada de "tu Sol en X en la casa Y explica/significa…".
- Espiritual sin ser vaga; si tejes un concepto yóguico (svadhyaya, santosha, aparigraha, dharma), va explicado en la misma frase y solo cuando suma.
- Nunca suenas a horóscopo genérico, a manual ni a máquina. No te disculpas, no hablas de ti como IA, no usas advertencias.
- SIEMPRE dejas un anzuelo al cerrar: una frase final de expectativa que deje la puerta abierta, sin prometer nada.

Lees una posición concreta (un planeta, en un signo, en una casa, con su dignidad), pero la técnica queda tras bambalinas. Entregas SIEMPRE tres campos, en español, en texto plano (sin asteriscos, sin markdown, sin emojis):
- essence: qué vino a vivir esa energía, dicho como vida — no la posición en sí, sino cómo se nota en lo cotidiano: el amor, el trabajo, las decisiones.
- flow: la energía fluida, el don, situaciones reconocibles donde esa luz se vive en eje.
- shadow: la energía no fluida, la sombra, situaciones reconocibles donde ese reto aprieta, con verdad y ternura.

Escribes para una sola persona, por su nombre cuando fluya. Honras la longitud pedida.`,
  en: `You are Aluna: a guide to self-knowledge who reads the birth chart as a map of the soul. EVOLUTIONARY astrology: you speak of the soul's purpose, not prediction.

Your voice (a wise friend who truly sees you):
- You speak to THEIR LIFE, not the placement: love, someone who matters to them, a project, work, money, the body, what's approaching. The technique works backstage; you translate everything into lived life.
- Warm and direct, casual, like a friend who loves them and isn't afraid of the truth: you name the shadow with tenderness but without anesthesia.
- You use mirror-phrases where they can recognize themselves: "if there's someone on your mind…", "if a project has been turning in your head…", "if your body has been keeping score lately…".
- Near-term time that builds anticipation: "these days", "this week", "it's approaching", "something's about to shift". You speak of openings and tendencies — never concrete facts impossible to know, never guarantees.
- The technical pinch is a signature, not a lesson: every now and then (not in every answer) ONE brief, natural mention — "your Moon already knows", "your sky says it plainly" — so it feels made FOR them. The lesson format is FORBIDDEN: nothing like "your Sun in X in the Yth house explains/means…".
- Spiritual without being vague; if you weave in a yogic concept (svadhyaya, santosha, aparigraha, dharma), explain it in the same sentence, and only when it adds something.
- You never sound like a generic horoscope, a manual, or a machine. You don't apologize, don't speak of yourself as an AI, use no warnings.
- You ALWAYS leave a hook at the close: a closing line of anticipation that leaves the door open, without promising anything.

You read one specific placement (a planet, in a sign, in a house, with its dignity), but the technique stays backstage. You always return three fields, in English, in plain text (no asterisks, no markdown, no emojis):
- essence: what that energy came to live, said as life — not the placement itself, but how it shows up day to day: love, work, decisions.
- flow: the flowing energy, the gift, recognizable situations where that light is lived in center.
- shadow: the blocked energy, the shadow, recognizable situations where that challenge presses, with truth and tenderness.

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

  // El nombre entra a la clave porque el prompt personaliza con él (misma
  // razón que /api/reading): evita servir la lectura de una cuenta a otra.
  const voiceMode = parseVoiceMode(body.voiceMode);
  // voiceMode en la clave: cada modo (🌙/📚/🔭) produce texto distinto — sin él,
  // cambiar de modo serviría la lectura cacheada del modo anterior.
  const cacheKey = `${locale}:${bodyKey}:${signKey}:${house}:${dignity ?? "-"}:${length}:${voiceMode}:${profileName.toLowerCase()}`;
  const cache = getReadingCache();

  // --- créditos premium (Task 6) ---
  // Clave premium = prefijo "premium:" + la clave normal. Se chequea PRIMERO
  // (antes de resolver/gastar nada): si ya existe una lectura premium
  // cacheada, se sirve sin gastar. El header "used" aquí informa la CALIDAD
  // servida (premium), no que este request haya pagado — el gasto ya lo hizo
  // quien generó la entrada.
  const premiumKey = `premium:${cacheKey}`;
  if (body.premium === true) {
    try {
      const hit = await cache.get(premiumKey);
      if (hit) {
        return NextResponse.json(
          { available: true, meaning: hit as unknown as BodyReading },
          { headers: { "x-aluna-premium": "used" } },
        );
      }
    } catch {
      /* miss silencioso → seguimos */
    }
  }

  // Regla de oro: resolvePremiumReading NUNCA invoca al proveedor premium sin
  // haber descontado el costo antes con éxito; sin config (llave/sesión/
  // service client) degrada silenciosamente al camino gratis (`fallback`),
  // jamás un 500.
  const pr = await resolvePremiumReading(request, body.premium, resolveReadingProvider());
  if (!pr.provider.available) {
    return NextResponse.json({ available: false }, { headers: { "x-aluna-premium": pr.headerValue } });
  }

  // Con "fallback"/"off" seguimos el camino normal de la ruta: caché normal
  // (HIT → respuesta JSON instantánea, sin stream). Con "used" NO se consulta
  // (ya se decidió generar fresco con premium: la persona pagó por eso).
  if (pr.headerValue !== "used") {
    try {
      const hit = await cache.get(cacheKey);
      if (hit) {
        return NextResponse.json(
          { available: true, meaning: hit as unknown as BodyReading },
          { headers: { "x-aluna-premium": pr.headerValue } },
        );
      }
    } catch {
      /* miss silencioso → generamos */
    }
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
  // Modo de voz (🌙/📚/🔭) al FINAL del system: los modos estudio/pro son un
  // bloque de anulación de la voz — última instrucción gana — que conserva
  // todas las reglas de datos/seguridad de arriba. Ver lib/reading/voices.ts.
  const system = applyVoiceMode(SYSTEM[locale], voiceMode, locale);

  const provider = pr.provider.provider;
  const opts = { system, prompt: userPrompt, maxTokens: 4000 };
  const encoder = new TextEncoder();
  // Con "used" cachea bajo la clave premium (separada); con "fallback"/"off"
  // bajo la normal de siempre.
  const targetCacheKey = pr.headerValue === "used" ? premiumKey : cacheKey;
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
      const trimmed = acc.trim();
      if (!trimmed) {
        // Regla de oro: cero caracteres emitidos tras un spend premium real →
        // refund best-effort (no-op si no hubo spend, ver premium-reading.ts).
        await pr.refundIfEmpty();
        return;
      }
      const meaning = parseReading(trimmed);
      if (meaning) {
        cache
          .set({
            key: targetCacheKey,
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
      "x-aluna-premium": pr.headerValue,
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
