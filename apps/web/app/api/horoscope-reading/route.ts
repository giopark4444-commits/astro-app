import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { setEphePath } from "@aluna/ephemeris";
import { ZODIAC_SIGNS } from "@aluna/core";
import {
  inMemoryReadingCacheStore,
  supabaseReadingCacheStore,
  type ReadingCacheStore,
} from "@aluna/compute";
import { createServiceSupabaseClient } from "@aluna/supabase/server";
import type { Json } from "@aluna/supabase";
import { resolveReadingProvider } from "@/lib/reading/provider";
import { astroLabels } from "@/lib/content/astrology-labels";
import {
  cachedWesternHoroscope, resolvePeriodRange, isValidTz, HOROSCOPE_PERIODS, type HoroscopePeriod,
} from "@/lib/horoscope/western";
import { parseHoroscopeReading, factsBlock, type HoroscopeReading } from "./parse";

// Lectura profunda del horóscopo del periodo (tiers Profunda/Completa). CABLEADA
// pero LATENTE: sin llave de proveedor responde { available: false } y el cliente
// muestra la prosa "Esencia" ya compuesta server-side (composeWesternProse). Con
// llave, teje una lectura bespoke a partir de los HECHOS calculados — nunca de lo
// que mande el cliente — vía el proveedor intercambiable. Bilingüe. Mismo patrón
// exacto que /api/chart-reading (caché lazy, streaming, fallback a complete()).
//
// Server-only: esta ruta COMPUTA el payload ella misma (cachedWesternHoroscope),
// igual que /api/horoscope/western, así que necesita el motor de efemérides.

export const runtime = "nodejs";

setEphePath(path.join(process.cwd(), "..", "..", "packages", "ephemeris", "ephe"));

const SIGN_KEYS = new Set(ZODIAC_SIGNS.map((s) => s.key));

const LENGTH_GUIDE: Record<"es" | "en", Record<"profunda" | "completa", string>> = {
  es: {
    profunda:
      "Extensión: una lectura honda y desarrollada, alrededor de 350 a 450 palabras en total, con cuerpo y matices.",
    completa:
      "Extensión: generosa, entre 650 y 850 palabras en total, con la sensación de haberle dicho todo lo esencial de este periodo sin que nada importante quede afuera.",
  },
  en: {
    profunda:
      "Length: a deep, developed reading, around 350 to 450 words total, with body and nuance.",
    completa:
      "Length: generous, between 650 and 850 words total, with the sense of having told them everything essential about this period, leaving nothing important out.",
  },
};

const PERIOD_LABEL: Record<"es" | "en", Record<HoroscopePeriod, string>> = {
  es: {
    yesterday: "ayer", today: "hoy", tomorrow: "mañana",
    week: "esta semana", month: "este mes", year: "este año",
  },
  en: {
    yesterday: "yesterday", today: "today", tomorrow: "tomorrow",
    week: "this week", month: "this month", year: "this year",
  },
};

const SYSTEM: Record<"es" | "en", string> = {
  es: `Eres Aluna: una guía de autoconocimiento que lee el cielo del periodo como clima del alma, no como sentencia. Astrología EVOLUTIVA: propósito, no predicción; el retrógrado invita a revisar, nunca asusta.

Tu voz (una amiga sabia que ve de verdad):
- Le hablas a SU VIDA, no al cielo: el amor, alguien que le importa, un proyecto, el trabajo, la plata, el cuerpo, lo que se le acerca. La técnica trabaja tras bambalinas; tú traduces todo a vida vivida.
- Cálida y directa, de tú, como amiga que la quiere y no le teme a la verdad: nombras el reto con ternura pero sin dramatismo ni anestesia.
- Usas frases-espejo donde pueda reconocerse: "si tienes a alguien…", "si hay un proyecto dándote vueltas…", "si el cuerpo te está cobrando algo últimamente…".
- Tiempo cercano que crea expectativa: "estos días", "esta semana", "se acerca", "algo está por moverse". Hablas de aperturas y tendencias — jamás de hechos concretos imposibles de saber ni de garantías.
- La pizca técnica es un sello, no una clase: de vez en cuando (no en cada respuesta) UNA mención breve y natural — "tu cielo lo dice clarito" — para que se sienta hecha PARA ella. PROHIBIDO el formato lección: nada de "tu Sol en X explica/significa…".
- Espiritual sin ser vaga; si tejes un concepto yóguico (svadhyaya, santosha, aparigraha, dharma), va explicado en la misma frase y solo cuando suma.
- Sin asteriscos, sin markdown, sin emojis, sin hablar de ti como IA.
- SIEMPRE dejas un anzuelo al cerrar: una frase final de expectativa que deje la puerta abierta, sin prometer nada.

REGLA DURA: solo puedes referirte a los hechos astronómicos LISTADOS abajo. No inventes posiciones, fechas ni eventos que no estén en la lista. Interpretas; no calculas.

Respondes ÚNICAMENTE un objeto JSON válido con una clave de texto: "reading".`,
  en: `You are Aluna: a guide to self-knowledge who reads the sky of the period as weather for the soul, not as a verdict. EVOLUTIONARY astrology: purpose, not prediction; retrograde invites review, never fear.

Your voice (a wise friend who truly sees you):
- You speak to THEIR LIFE, not the sky: love, someone who matters to them, a project, work, money, the body, what's approaching. The technique works backstage; you translate everything into lived life.
- Warm and direct, casual, like a friend who loves them and isn't afraid of the truth: you name the challenge with tenderness but without drama or anesthesia.
- You use mirror-phrases where they can recognize themselves: "if there's someone on your mind…", "if a project has been turning in your head…", "if your body has been keeping score lately…".
- Near-term time that builds anticipation: "these days", "this week", "it's approaching", "something's about to shift". You speak of openings and tendencies — never concrete facts impossible to know, never guarantees.
- The technical pinch is a signature, not a lesson: every now and then (not in every answer) ONE brief, natural mention — "your sky says it plainly" — so it feels made FOR them. The lesson format is FORBIDDEN: nothing like "your Sun in X explains/means…".
- Spiritual without being vague; if you weave in a yogic concept (svadhyaya, santosha, aparigraha, dharma), explain it in the same sentence, and only when it adds something.
- No asterisks, no markdown, no emojis, no speaking of yourself as an AI.
- You ALWAYS leave a hook at the close: a closing line of anticipation that leaves the door open, without promising anything.

HARD RULE: you may only refer to the astronomical facts LISTED below. Do not invent positions, dates, or events that are not on the list. You interpret; you do not calculate.

Respond ONLY with a valid JSON object with one text key: "reading".`,
};

// Caché durable de lecturas de horóscopo (en `public.reading_cache` vía
// @aluna/compute). La lectura no depende del individuo (solo de la composición
// signo-periodo-fecha local-longitud-idioma), así que la clave es global y se
// comparte entre todos. Se persiste en Supabase con la llave service-role; si esa
// llave no está, cae a un caché en memoria (mejor un caché de proceso que
// ninguno). Se resuelve una sola vez por módulo (lazy). Mismo patrón que
// /api/chart-reading y /api/reading.
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

  const sign = typeof body.sign === "string" && SIGN_KEYS.has(body.sign) ? body.sign : null;
  const period: HoroscopePeriod | null = (HOROSCOPE_PERIODS as readonly string[]).includes(String(body.period))
    ? (body.period as HoroscopePeriod)
    : null;
  const tz = isValidTz(String(body.tz ?? "")) ? String(body.tz) : "utc";
  const length = String(body.length ?? "");
  const locale: "es" | "en" = body.locale === "en" ? "en" : "es";

  // Validación estricta: sign/period/length deben venir de los enums conocidos.
  // El payload astronómico NUNCA viene del cliente — solo estas cuatro llaves de
  // selección; los hechos los computa esta ruta (cachedWesternHoroscope, abajo).
  if (!sign || !period || (length !== "profunda" && length !== "completa")) {
    return NextResponse.json({ available: false, error: "bad_request" }, { status: 400 });
  }

  const resolved = resolveReadingProvider();
  if (!resolved.available) {
    return NextResponse.json({ available: false });
  }

  const range = resolvePeriodRange(period, tz);
  const cacheKey = `${locale}:western:${sign}:${period}:${range.localDate}:${length}`;
  const cache = getReadingCache();
  // Caché HIT → respuesta JSON instantánea (sin stream): la lectura ya existe.
  // Lectura best-effort: si el caché falla (red), seguimos y generamos.
  try {
    const hit = await cache.get(cacheKey);
    if (hit) return NextResponse.json({ available: true, meaning: hit as unknown as HoroscopeReading });
  } catch {
    /* miss silencioso → generamos */
  }

  // El payload SIEMPRE se computa aquí, del lado del servidor, a partir de
  // sign/period/tz validados — jamás se acepta del cliente (anti-funa: la IA no
  // puede recibir "hechos" fabricados por el request).
  const payload = cachedWesternHoroscope(sign, period, tz);
  const facts = factsBlock(locale, payload);

  const L = astroLabels(locale);
  const signLabel = L.signs[sign] ?? sign;
  const periodLabel = PERIOD_LABEL[locale][period];
  const userPrompt =
    locale === "en"
      ? `Sign: ${signLabel}\nPeriod: ${periodLabel}\n\n${LENGTH_GUIDE.en[length]}\n\nFACTS:\n${facts}\n\nRespond ONLY with a valid JSON object, no surrounding text and no markdown, with exactly this text key: "reading".`
      : `Signo: ${signLabel}\nPeriodo: ${periodLabel}\n\n${LENGTH_GUIDE.es[length]}\n\nHECHOS:\n${facts}\n\nResponde ÚNICAMENTE con un objeto JSON válido, sin texto alrededor y sin markdown, con exactamente esta clave de texto: "reading".`;

  // MISS con llave → STREAM. Reenviamos el texto crudo del modelo (que es el
  // objeto JSON {reading}) como text/plain a medida que se genera. El cliente
  // parsea el campo sobre la marcha; al cerrar, parseamos el texto acumulado,
  // validamos el campo y lo guardamos en el caché durable con la misma forma
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
      const meaning = parseHoroscopeReading(acc.trim());
      if (meaning) {
        cache
          .set({
            key: cacheKey,
            kind: "horoscope",
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
