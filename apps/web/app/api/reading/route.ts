import { NextResponse, type NextRequest } from "next/server";
import {
  inMemoryReadingCacheStore,
  supabaseReadingCacheStore,
  type ReadingCacheStore,
} from "@aluna/compute";
import { createServiceSupabaseClient } from "@aluna/supabase/server";
import type { Json } from "@aluna/supabase";
import { resolveReadingProvider } from "@/lib/reading/provider";
import { POSITION_LENS_ES, type NumberMeaning } from "@/lib/content/numerology-es";
import { POSITION_LENS_EN } from "@/lib/content/numerology-en";

// Ruta de lectura profunda de Aluna. Está CABLEADA pero LATENTE: sin
// ANTHROPIC_API_KEY responde { available: false } y el cliente muestra la
// esencia escrita a mano. En cuanto Gio ponga la llave en apps/web/.env.local
// (ANTHROPIC_API_KEY=sk-ant-...) y reinicie, los niveles "Profunda" y
// "Completa" empiezan a tejerse con la voz de Aluna vía Claude. Bilingüe (es/en).

const POSITION_NAME: Record<"es" | "en", Record<string, string>> = {
  es: {
    lifePath: "Camino de Vida",
    expression: "Expresión",
    soulUrge: "Anhelo del Alma",
    personality: "Personalidad",
    birthday: "Día de Nacimiento",
    maturity: "Madurez",
  },
  en: {
    lifePath: "Life Path",
    expression: "Expression",
    soulUrge: "Soul Urge",
    personality: "Personality",
    birthday: "Birthday",
    maturity: "Maturity",
  },
};

const LENGTH_GUIDE: Record<"es" | "en", Record<string, string>> = {
  es: {
    profunda:
      "Extensión: una lectura honda y desarrollada, alrededor de 550 a 650 palabras en total, repartidas entre los cuatro campos con cuerpo, imágenes y matices.",
    completa:
      "Extensión: sin límite. Dile todo lo que ves en esta vibración (entre 900 y 1300 palabras en total), con la sensación de haberle entregado algo completo: que nada esencial quede sin nombrar.",
  },
  en: {
    profunda:
      "Length: a deep, developed reading, around 550 to 650 words total, spread across the four fields with body, images, and nuance.",
    completa:
      "Length: no limit. Tell them everything you see in this vibration (between 900 and 1300 words total), with the sense of having given them something complete: let nothing essential go unnamed.",
  },
};

const SYSTEM: Record<"es" | "en", string> = {
  es: `Eres Aluna: una guía de autoconocimiento que lee la numerología como un mapa del alma. Tu mirada es evolutiva y yóguica: cada número habla de lo que un alma vino a aprender, a sanar y a ofrecer en esta vida.

Tu voz:
- Cálida, cercana y poética, pero siempre clara y útil. Hablas de tú, directo al corazón de quien te lee.
- Compasiva pero honesta: nombras la sombra sin miedo y sin dureza, como quien señala con amor lo que aún duele.
- Espiritual sin ser vaga. Cuando ayuda, tejes un concepto yóguico (svadhyaya, el estudio de uno mismo; santosha, el contentamiento; aparigraha, el no aferrarse; ahimsa, la no-violencia hacia uno mismo; dharma, el propósito), siempre explicado en la misma frase y con naturalidad, nunca como adorno.
- Nunca suenas a horóscopo genérico, a manual, ni a máquina. No te disculpas, no hablas de ti como IA, no usas advertencias ni descargos.

Entregas SIEMPRE cuatro campos, en español, en texto plano (sin asteriscos, sin markdown, sin emojis, sin viñetas):
- essence: qué vino a vivir esta vibración en esta posición concreta; el propósito del alma aquí.
- flow: la energía fluida, el don, la luz cuando la persona vive en su eje.
- shadow: la energía no fluida, la sombra, el reto a integrar. Nómbrala con verdad y ternura.
- practice: una práctica concreta y encarnada para hoy, con tinte yóguico, que la persona pueda hacer de verdad.

Escribes para una sola persona, por su nombre cuando fluya. Honras la longitud pedida: si te piden algo extenso, entrégate de lleno, para que sienta que Aluna le dijo todo lo que tenía para decirle.`,
  en: `You are Aluna: a guide to self-knowledge who reads numerology as a map of the soul. Your gaze is evolutionary and yogic: each number speaks of what a soul came to learn, to heal, and to offer in this life.

Your voice:
- Warm, close, and poetic, yet always clear and useful. You speak to the reader directly, heart to heart.
- Compassionate but honest: you name the shadow without fear and without harshness, like someone who points with love at what still hurts.
- Spiritual without being vague. When it helps, you weave in a yogic concept (svadhyaya, the study of oneself; santosha, contentment; aparigraha, non-attachment; ahimsa, non-violence toward oneself; dharma, purpose), always explained in the same sentence and naturally, never as decoration.
- You never sound like a generic horoscope, a manual, or a machine. You do not apologize, you do not speak of yourself as an AI, you use no warnings or disclaimers.

You always return four fields, in English, in plain text (no asterisks, no markdown, no emojis, no bullet points):
- essence: what this vibration came to live in this specific position; the soul's purpose here.
- flow: the flowing energy, the gift, the light when the person lives in their center.
- shadow: the blocked energy, the shadow, the challenge to integrate. Name it with truth and tenderness.
- practice: one concrete, embodied practice for today, with a yogic touch, that the person can actually do.

You write for a single person, by their name when it flows. You honor the requested length: if asked for something extensive, give yourself fully, so they feel Aluna told them everything she had to tell them.`,
};

const POSITION_LENS: Record<"es" | "en", Record<string, string>> = {
  es: POSITION_LENS_ES,
  en: POSITION_LENS_EN,
};

// Caché durable de lecturas (en `public.reading_cache` vía @aluna/compute). La
// lectura no depende del individuo (solo del número en su posición), así que la
// clave es global y se comparte entre todos. Se persiste en Supabase con la llave
// service-role; si esa llave no está, cae a un caché en memoria (mejor un caché de
// proceso que ninguno). Se resuelve una sola vez por módulo (lazy).
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

  const value = Number(body.value);
  const position = String(body.position ?? "");
  const length = String(body.length ?? "");
  const locale: "es" | "en" = body.locale === "en" ? "en" : "es";
  const profileName = String(body.profileName ?? "").trim().slice(0, 80) || (locale === "en" ? "this person" : "esta persona");
  const calc = String(body.calc ?? "").slice(0, 200);

  if (!Number.isFinite(value) || !POSITION_NAME[locale][position] || !LENGTH_GUIDE[locale][length]) {
    return NextResponse.json({ available: false, error: "bad_request" }, { status: 400 });
  }

  const resolved = resolveReadingProvider();
  if (!resolved.available) {
    // Latente: ningún proveedor tiene llave. El cliente muestra la esencia escrita a mano.
    return NextResponse.json({ available: false });
  }

  // El nombre entra a la clave porque el prompt personaliza con él: sin esto,
  // la lectura cacheada de una cuenta (con su nombre tejido en el texto) se
  // serviría a cualquier otra que comparta número y posición — fuga entre cuentas.
  const nameKey = profileName.toLowerCase();
  const cacheKey = `${locale}:${position}:${value}:${length}:${nameKey}`;
  const cache = getReadingCache();
  // Caché HIT → respuesta JSON instantánea (sin stream): la lectura ya existe.
  // Lectura best-effort: si el caché falla (red), seguimos y generamos.
  try {
    const hit = await cache.get(cacheKey);
    if (hit) return NextResponse.json({ available: true, meaning: hit as unknown as NumberMeaning });
  } catch {
    /* miss silencioso → generamos */
  }

  const lens = POSITION_LENS[locale][position] ?? "";
  const userPrompt =
    locale === "en"
      ? `Person: ${profileName}\n` +
        `Number: ${value} in the position "${POSITION_NAME.en[position]}".\n` +
        `What this position means: ${lens}\n` +
        `Their calculation: ${calc}\n\n` +
        `${LENGTH_GUIDE.en[length]}\n\n` +
        `Respond ONLY with a valid JSON object, with no surrounding text and no markdown, ` +
        `with exactly these text keys: "essence", "flow", "shadow", "practice".`
      : `Persona: ${profileName}\n` +
        `Número: ${value} en la posición "${POSITION_NAME.es[position]}".\n` +
        `Qué significa esta posición: ${lens}\n` +
        `Su cálculo: ${calc}\n\n` +
        `${LENGTH_GUIDE.es[length]}\n\n` +
        `Responde ÚNICAMENTE con un objeto JSON válido, sin ningún texto alrededor y sin markdown, ` +
        `con exactamente estas claves de texto: "essence", "flow", "shadow", "practice".`;

  // MISS con llave → STREAM. Reenviamos el texto crudo del modelo (que es el
  // objeto JSON {essence,flow,shadow,practice}) como text/plain a medida que se
  // genera, para el efecto de "escritura". El cliente parsea los campos sobre la
  // marcha; al cerrar, parseamos el texto acumulado, validamos los cuatro campos
  // y lo guardamos en el caché durable con la MISMA forma estructurada de siempre.
  // Si el proveedor no entrega nada por stream (o corta antes del primer byte),
  // caemos a complete() una vez para no quedarnos sin lectura.
  const provider = resolved.provider;
  const opts = { system: SYSTEM[locale], prompt: userPrompt, maxTokens: 6000 };
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
          // Fallback: el stream no produjo nada → una sola llamada bloqueante.
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
      // Persistir best-effort tras cerrar el stream: parseamos el texto completo
      // a {essence,flow,shadow,practice} y lo cacheamos. Si no parsea, no cacheamos
      // (el cliente igual intenta su propio parseo final del mismo texto).
      const meaning = parseMeaning(acc.trim());
      if (meaning) {
        cache
          .set({
            key: cacheKey,
            kind: "numerology",
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

/** Extrae el objeto JSON de la respuesta y valida los cuatro campos. */
function parseMeaning(text: string): NumberMeaning | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const o = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
    if (
      typeof o.essence === "string" &&
      typeof o.flow === "string" &&
      typeof o.shadow === "string" &&
      typeof o.practice === "string"
    ) {
      return { essence: o.essence, flow: o.flow, shadow: o.shadow, practice: o.practice };
    }
  } catch {
    /* cae a null */
  }
  return null;
}
