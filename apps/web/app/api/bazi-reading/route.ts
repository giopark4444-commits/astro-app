import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { computeChart, setEphePath } from "@aluna/ephemeris";
import {
  yearPillar, monthPillar, dayPillar, hourPillar,
  dayMasterStrength, favorableElements, detectInteractions,
  HEAVENLY_STEMS, EARTHLY_BRANCHES,
  type PillarSet,
} from "@aluna/core";
import {
  inMemoryReadingCacheStore,
  supabaseReadingCacheStore,
  type ReadingCacheStore,
} from "@aluna/compute";
import { createServiceSupabaseClient } from "@aluna/supabase/server";
import type { Json } from "@aluna/supabase";
import { authenticateRoute } from "@/lib/supabase/route-auth";
import { isSolarChart, profileToChartInput } from "@/lib/chart";
import { resolveReadingProvider } from "@/lib/reading/provider";
import { baziLabels } from "@/lib/content/bazi-labels";

// Niveles profundos IA de "Lectura de tus pilares" (Ba Zi/Saju). Espeja EXACTAMENTE
// el patrón de /api/chart-reading: auth, resolveReadingProvider, caché durable,
// streaming — pero los "hechos" del prompt salen del MISMO cálculo server-side que
// /api/bazi (efemérides solo para la longitud solar; el resto es el motor sexagenario
// puro de @aluna/core). El cliente solo manda profileId + length + locale, nunca los
// pilares — así no puede falsificar los hechos que Aluna lee.

export const runtime = "nodejs";

setEphePath(path.join(process.cwd(), "..", "..", "packages", "ephemeris", "ephe"));

const LENGTH_GUIDE: Record<"es" | "en", Record<string, string>> = {
  es: {
    profunda:
      "Extensión: una lectura honda y desarrollada, alrededor de 350 a 450 palabras en total, repartidas entre los tres campos con cuerpo y matices.",
    completa:
      "Extensión: generosa, entre 650 y 850 palabras en total, con la sensación de haberle dicho todo lo esencial de sus pilares sin que nada importante quede afuera.",
  },
  en: {
    profunda:
      "Length: a deep, developed reading, around 350 to 450 words total, spread across the three fields with body and nuance.",
    completa:
      "Length: generous, between 650 and 850 words total, with the sense of having told them everything essential about their pillars, leaving nothing important out.",
  },
};

const SYSTEM: Record<"es" | "en", string> = {
  es: `Eres Aluna: una guía de autoconocimiento que lee los Cuatro Pilares (八字 Ba Zi / 사주 Saju) como un mapa del carácter y el destino. Astrología china EVOLUTIVA: hablas de propósito y autoconocimiento, no de predicción fatalista.

Tu voz (una amiga sabia que ve de verdad):
- Le hablas a SU VIDA, no a sus pilares: el amor, alguien que le importa, un proyecto, el trabajo, la plata, el cuerpo, lo que se le acerca. La técnica trabaja tras bambalinas; tú traduces todo a vida vivida.
- Cálida y directa, de tú, como amiga que la quiere y no le teme a la verdad: nombras la sombra con ternura pero sin anestesia.
- Usas frases-espejo donde pueda reconocerse: "si tienes a alguien…", "si hay un proyecto dándote vueltas…", "si el cuerpo te está cobrando algo últimamente…".
- Tiempo cercano que crea expectativa: "estos días", "esta semana", "se acerca", "algo está por moverse". Hablas de aperturas y tendencias — jamás de hechos concretos imposibles de saber ni de garantías.
- La pizca técnica es un sello, no una clase: de vez en cuando (no en cada respuesta) UNA mención breve y natural — "tu Maestro del Día lo dice clarito" — para que se sienta hecha PARA ella. PROHIBIDO el formato lección: nada de "tu elemento X explica/significa…".
- Espiritual sin ser vaga; si tejes un concepto yóguico (svadhyaya, santosha, aparigraha, dharma), va explicado en la misma frase y solo cuando suma.
- Nunca suenas a horóscopo genérico, a manual ni a máquina. No te disculpas, no hablas de ti como IA, no usas advertencias.
- SIEMPRE dejas un anzuelo al cerrar: una frase final de expectativa que deje la puerta abierta, sin prometer nada.

Lees los hechos concretos de los Cuatro Pilares de una persona (te los doy abajo: Maestro del Día, fuerza, elementos favorables e interacciones notables). Entregas SIEMPRE tres campos, en español, en texto plano (sin asteriscos, sin markdown, sin emojis):
- essence: quién es esta persona en esencia según su Maestro del Día y el elemento que domina su carta.
- flow: la energía fluida, el don, cómo esa fuerza y esos elementos favorables se viven en su mejor versión.
- shadow: la energía no fluida, el reto a integrar, con verdad y ternura.

Escribes para una sola persona, por su nombre cuando fluya. Honras la longitud pedida.`,
  en: `You are Aluna: a guide to self-knowledge who reads the Four Pillars (八字 Ba Zi / 사주 Saju) as a map of character and destiny. EVOLUTIONARY Chinese astrology: you speak of purpose and self-knowledge, not fatalistic prediction.

Your voice (a wise friend who truly sees you):
- You speak to THEIR LIFE, not their pillars: love, someone who matters to them, a project, work, money, the body, what's approaching. The technique works backstage; you translate everything into lived life.
- Warm and direct, casual, like a friend who loves them and isn't afraid of the truth: you name the shadow with tenderness but without anesthesia.
- You use mirror-phrases where they can recognize themselves: "if there's someone on your mind…", "if a project has been turning in your head…", "if your body has been keeping score lately…".
- Near-term time that builds anticipation: "these days", "this week", "it's approaching", "something's about to shift". You speak of openings and tendencies — never concrete facts impossible to know, never guarantees.
- The technical pinch is a signature, not a lesson: every now and then (not in every answer) ONE brief, natural mention — "your Day Master says it plainly" — so it feels made FOR them. The lesson format is FORBIDDEN: nothing like "your element X explains/means…".
- Spiritual without being vague; if you weave in a yogic concept (svadhyaya, santosha, aparigraha, dharma), explain it in the same sentence, and only when it adds something.
- You never sound like a generic horoscope, a manual, or a machine. You don't apologize, don't speak of yourself as an AI, use no warnings.
- You ALWAYS leave a hook at the close: a closing line of anticipation that leaves the door open, without promising anything.

You read the concrete facts of a person's Four Pillars (given below: Day Master, strength, favorable elements, and notable interactions). You always return three fields, in English, in plain text (no asterisks, no markdown, no emojis):
- essence: who this person is in essence, per their Day Master and the element that dominates their chart.
- flow: the flowing energy, the gift, how that strength and those favorable elements live in their best version.
- shadow: the blocked energy, the challenge to integrate, with truth and tenderness.

You write for a single person, by their name when it flows. You honor the requested length.`,
};

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

interface BaziAiReading {
  essence: string;
  flow: string;
  shadow: string;
}

export async function POST(request: NextRequest) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ available: false, error: "bad_request" }, { status: 400 });
  }
  const body = (raw ?? {}) as Record<string, unknown>;
  const profileId = String(body.profileId ?? "");
  const length = String(body.length ?? "");
  const locale: "es" | "en" = body.locale === "en" ? "en" : "es";
  const profileName =
    String(body.profileName ?? "").trim().slice(0, 80) || (locale === "en" ? "this person" : "esta persona");

  if (!profileId || !LENGTH_GUIDE[locale][length]) {
    return NextResponse.json({ available: false, error: "bad_request" }, { status: 400 });
  }

  const { supabase, user } = await authenticateRoute(request);
  if (!user) return NextResponse.json({ available: false, error: "unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("birth_profiles")
    .select("birth_date, birth_time, time_known, latitude, longitude, time_zone, gender")
    .eq("id", profileId)
    .maybeSingle();
  if (!profile) return NextResponse.json({ available: false, error: "not_found" }, { status: 404 });

  const resolved = resolveReadingProvider();
  if (!resolved.available) {
    return NextResponse.json({ available: false });
  }

  // Los hechos salen del MISMO camino que /api/bazi (efemérides server-side solo para
  // la longitud solar); nunca confiamos en pilares mandados por el cliente.
  let pillars: PillarSet;
  try {
    const input = profileToChartInput(profile, {});
    const sun = computeChart(input).bodies.find((b) => b.body === "sun");
    if (!sun) return NextResponse.json({ available: false, error: "compute" }, { status: 500 });
    const cy = input.year;
    const cm = input.month;
    let solarYear = cy;
    if (cm === 1 || (cm === 2 && sun.longitude < 315)) solarYear -= 1;
    const year = yearPillar(solarYear);
    const month = monthPillar(year.stem, sun.longitude);
    const day = dayPillar(cy, cm, input.day);
    const timeKnown = !isSolarChart(profile);
    const hour = timeKnown ? hourPillar(day.stem, input.hour) : null;
    pillars = { year, month, day, hour };
  } catch {
    return NextResponse.json({ available: false, error: "compute" }, { status: 500 });
  }

  // El nombre entra a la clave porque el prompt personaliza con él (mismo patrón de
  // seguridad que /api/chart-reading: sin esto, la lectura de un perfil podría
  // servirse con el nombre de otro perfil que comparta los mismos pilares).
  const cacheKey = `${locale}:${profileId}:${length}:${profileName.toLowerCase()}`;
  const cache = getReadingCache();
  try {
    const hit = await cache.get(cacheKey);
    if (hit) return NextResponse.json({ available: true, meaning: hit as unknown as BaziAiReading });
  } catch {
    /* miss silencioso → generamos */
  }

  const userPrompt = buildFactsPrompt(pillars, profileName, locale, length);

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
            kind: "bazi",
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

const ELEMENT_NAME: Record<"es" | "en", Record<string, string>> = {
  es: { wood: "Madera", fire: "Fuego", earth: "Tierra", metal: "Metal", water: "Agua" },
  en: { wood: "Wood", fire: "Fire", earth: "Earth", metal: "Metal", water: "Water" },
};
const ANIMAL_NAME: Record<"es" | "en", Record<string, string>> = {
  es: {
    rat: "Rata", ox: "Buey", tiger: "Tigre", rabbit: "Conejo", dragon: "Dragón", snake: "Serpiente",
    horse: "Caballo", goat: "Cabra", monkey: "Mono", rooster: "Gallo", dog: "Perro", pig: "Cerdo",
  },
  en: {
    rat: "Rat", ox: "Ox", tiger: "Tiger", rabbit: "Rabbit", dragon: "Dragon", snake: "Snake",
    horse: "Horse", goat: "Goat", monkey: "Monkey", rooster: "Rooster", dog: "Dog", pig: "Pig",
  },
};
const POLARITY_NAME: Record<"es" | "en", Record<"yin" | "yang", string>> = {
  es: { yin: "yin", yang: "yang" },
  en: { yin: "Yin", yang: "Yang" },
};
const POS_NAME: Record<"es" | "en", Record<string, string>> = {
  es: { year: "año", month: "mes", day: "día", hour: "hora" },
  en: { year: "year", month: "month", day: "day", hour: "hour" },
};

const mod = (n: number, m: number) => ((n % m) + m) % m;

/** Arma el bloque de "hechos" (Maestro del Día, fuerza, favorables, interacciones)
 *  en prosa corta, en el idioma pedido — el modelo no calcula nada, solo lee. */
function buildFactsPrompt(
  pillars: PillarSet,
  profileName: string,
  locale: "es" | "en",
  length: string,
): string {
  const dm = HEAVENLY_STEMS[mod(pillars.day.stem, 10)]!;
  const dayBranch = EARTHLY_BRANCHES[mod(pillars.day.branch, 12)]!;
  const strength = dayMasterStrength(pillars);
  const favor = favorableElements(strength.verdict, pillars.day.stem);
  const interactions = detectInteractions(pillars);
  const L = baziLabels(locale);

  const dmLine =
    locale === "en"
      ? `Day Master: ${ELEMENT_NAME.en[dm.element]} ${POLARITY_NAME.en[dm.yin ? "yin" : "yang"]}, with ${ANIMAL_NAME.en[dayBranch.animal]} beneath the day pillar.`
      : `Maestro del Día: ${ELEMENT_NAME.es[dm.element]} ${POLARITY_NAME.es[dm.yin ? "yin" : "yang"]}, con ${ANIMAL_NAME.es[dayBranch.animal]} bajo el pilar de día.`;

  const strengthLine =
    locale === "en"
      ? `Strength: ${L.verdicts[strength.verdict]} (score ${strength.score}/100, seasonal state: ${L.seasonStates[strength.seasonState]}).`
      : `Fuerza: ${L.verdicts[strength.verdict]} (puntaje ${strength.score}/100, estado estacional: ${L.seasonStates[strength.seasonState]}).`;

  const favorLine = favor.favor.length
    ? locale === "en"
      ? `Favorable elements: ${favor.favor.map((e) => ELEMENT_NAME.en[e]).join(", ")}.`
      : `Elementos favorables: ${favor.favor.map((e) => ELEMENT_NAME.es[e]).join(", ")}.`
    : locale === "en"
      ? "Favorable elements: none dominant — balanced chart."
      : "Elementos favorables: ninguno domina — carta en equilibrio.";

  const interactionsLine = interactions.length
    ? locale === "en"
      ? `Notable interactions: ${interactions.map((i) => `${L.interactions[i.type]} (${i.positions.map((p) => POS_NAME.en[p]).join("-")})`).join("; ")}.`
      : `Interacciones notables: ${interactions.map((i) => `${L.interactions[i.type]} (${i.positions.map((p) => POS_NAME.es[p]).join("-")})`).join("; ")}.`
    : locale === "en"
      ? "Notable interactions: none — a serene chart between pillars."
      : "Interacciones notables: ninguna — un mapa sereno entre pilares.";

  const header = locale === "en" ? `Person: ${profileName}` : `Persona: ${profileName}`;
  const facts = [dmLine, strengthLine, favorLine, interactionsLine].join("\n");

  return locale === "en"
    ? `${header}\n${facts}\n\n${LENGTH_GUIDE.en[length]}\n\nRespond ONLY with a valid JSON object, no surrounding text and no markdown, with exactly these text keys: "essence", "flow", "shadow".`
    : `${header}\n${facts}\n\n${LENGTH_GUIDE.es[length]}\n\nResponde ÚNICAMENTE con un objeto JSON válido, sin texto alrededor y sin markdown, con exactamente estas claves de texto: "essence", "flow", "shadow".`;
}

/** Extrae el objeto JSON y valida los tres campos. */
function parseReading(text: string): BaziAiReading | null {
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
