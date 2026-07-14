import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { computeChart, setEphePath } from "@aluna/ephemeris";
import { computeNumerology, signOfLongitude } from "@aluna/core";
import { authenticateRoute } from "@/lib/supabase/route-auth";
import { profileToChartInput } from "@/lib/chart";
import { profileToNumerologyInput } from "@/lib/numerology";
import { astroLabels } from "@/lib/content/astrology-labels";
import { resolveReadingProvider, type ChatMessage } from "@/lib/reading/provider";

// Chat "Pregúntale a Aluna" (premium Fase 4). CABLEADO pero LATENTE: sin llave de
// proveedor responde { available: false } y el cliente muestra el estado dormido.
// Con llave, Aluna conversa ANCLADA en la carta + numerología del usuario.

export const runtime = "nodejs";

setEphePath(path.join(process.cwd(), "..", "..", "packages", "ephemeris", "ephe"));

const MAIN_BODIES = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];

const SYSTEM_INTRO: Record<"es" | "en", string> = {
  es: `Eres Aluna: una guía de autoconocimiento que conversa con la persona apoyándose en SU carta astral y SU numerología (que conoces; van más abajo). Astrología EVOLUTIVA: hablas del propósito del alma, no de predicción.

Tu voz: cálida, cercana y poética, pero clara y útil; compasiva pero honesta (nombras la sombra con ternura); espiritual con tinte yóguico (svadhyaya, santosha, aparigraha...) explicado en la misma frase. Nunca suenas a horóscopo genérico, a manual ni a máquina; no te disculpas, no hablas de ti como IA, no usas advertencias.

Responde lo que te pregunte ANCLÁNDOTE en sus datos: relaciona la pregunta con sus planetas, casas y números concretos (p.ej. "tu Sol en Acuario en la casa 11 explica..."). Si la pregunta no es sobre su carta o su autoconocimiento, redirígela con cariño hacia eso. Respuestas con cuerpo pero conversacionales (no ensayos largos). Texto plano, sin markdown.`,
  en: `You are Aluna: a guide to self-knowledge who converses with the person grounded in THEIR birth chart and THEIR numerology (which you know; they are below). EVOLUTIONARY astrology: you speak of the soul's purpose, not prediction.

Your voice: warm, close, and poetic, yet clear and useful; compassionate but honest (you name the shadow with tenderness); spiritual with a yogic touch (svadhyaya, santosha, aparigraha...) explained in the same sentence. You never sound like a generic horoscope, a manual, or a machine; you don't apologize, don't speak of yourself as an AI, use no warnings.

Answer what they ask GROUNDED in their data: relate the question to their specific planets, houses, and numbers (e.g. "your Sun in Aquarius in the 11th house explains..."). If the question isn't about their chart or self-knowledge, lovingly steer it back there. Answers with body but conversational (not long essays). Plain text, no markdown.`,
};

function buildContext(
  profile: { name: string; birth_date: string; gender: string },
  chart: ReturnType<typeof computeChart>,
  numerology: ReturnType<typeof computeNumerology>,
  locale: "es" | "en",
): string {
  const L = astroLabels(locale);
  const asc = signOfLongitude(chart.houses.ascendant).sign;
  const mc = signOfLongitude(chart.houses.midheaven).sign;
  const placements = chart.bodies
    .filter((b) => MAIN_BODIES.includes(b.body))
    .map((b) => `${L.bodies[b.body]} ${L.signs[b.sign]} ${locale === "en" ? "h" : "casa"}${b.house}${b.dignity ? ` (${L.dignities[b.dignity]})` : ""}`)
    .join("; ");
  const patterns =
    chart.patterns.map((p) => `${L.patterns[p.type]} (${p.bodies.map((k) => L.bodies[k] ?? k).join(", ")})`).join("; ") ||
    (locale === "en" ? "none" : "ninguno");
  const c = numerology.core;
  const num =
    locale === "en"
      ? `Life Path ${c.lifePath.value}, Expression ${c.expression.value}, Soul Urge ${c.soulUrge.value}, Personality ${c.personality.value}, Maturity ${c.maturity.value}`
      : `Camino de Vida ${c.lifePath.value}, Expresión ${c.expression.value}, Anhelo del Alma ${c.soulUrge.value}, Personalidad ${c.personality.value}, Madurez ${c.maturity.value}`;

  return locale === "en"
    ? `DATA FOR ${profile.name} (gender: ${profile.gender}):
Birth chart — Ascendant ${L.signs[asc]}, Midheaven ${L.signs[mc]}. ${placements}. Patterns: ${patterns}.
Numerology — ${num}.`
    : `DATOS DE ${profile.name} (género: ${profile.gender}):
Carta natal — Ascendente ${L.signs[asc]}, Medio Cielo ${L.signs[mc]}. ${placements}. Patrones: ${patterns}.
Numerología — ${num}.`;
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
  const locale: "es" | "en" = body.locale === "en" ? "en" : "es";
  const rawMessages = Array.isArray(body.messages) ? body.messages : [];
  const messages: ChatMessage[] = rawMessages
    .filter((m): m is { role: string; content: string } => !!m && typeof (m as { content?: unknown }).content === "string")
    .slice(-20)
    .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content).slice(0, 2000) }));
  if (!profileId || messages.length === 0) {
    return NextResponse.json({ available: false, error: "bad_request" }, { status: 400 });
  }

  const { supabase, user } = await authenticateRoute(request);
  if (!user) return NextResponse.json({ available: false, error: "unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("birth_profiles")
    .select("name, birth_date, birth_time, time_known, latitude, longitude, time_zone, gender")
    .eq("id", profileId)
    .maybeSingle();
  if (!profile) return NextResponse.json({ available: false, error: "not_found" }, { status: 404 });

  const resolved = resolveReadingProvider();
  if (!resolved.available) {
    // Latente: aún no hay llave. El chat se enciende con la IA.
    return NextResponse.json({ available: false });
  }

  let system: string;
  try {
    const chart = computeChart(profileToChartInput(profile));
    const numerology = computeNumerology(profileToNumerologyInput(profile));
    system = `${SYSTEM_INTRO[locale]}\n\n${buildContext(profile, chart, numerology, locale)}`;
  } catch {
    return NextResponse.json({ available: false, error: "upstream" }, { status: 502 });
  }

  // Streaming token a token (efecto de tecleo). El proveedor emite trozos de texto;
  // los reenviamos como text/plain en streaming. Si el proveedor no soporta streaming,
  // su chatStream cae a entregar el resultado de chat() de una vez. Cualquier error
  // antes del primer byte se traduce a 502; una vez empezado el stream, se corta limpio.
  const provider = resolved.provider;
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of provider.chatStream({ system, messages, maxTokens: 1500 })) {
          if (chunk) controller.enqueue(encoder.encode(chunk));
        }
      } catch {
        /* corte de upstream a mitad: cerramos con lo que haya llegado */
      }
      controller.close();
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
