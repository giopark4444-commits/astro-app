import path from "node:path";
import { NextResponse, after, type NextRequest } from "next/server";
import { computeChart, setEphePath } from "@aluna/ephemeris";
import { computeNumerology, signOfLongitude } from "@aluna/core";
import { authenticateRoute } from "@/lib/supabase/route-auth";
import { profileToChartInput } from "@/lib/chart";
import { profileToNumerologyInput } from "@/lib/numerology";
import { astroLabels } from "@/lib/content/astrology-labels";
import { resolveReadingProvider, type ChatMessage } from "@/lib/reading/provider";
import { buildTarotContext, type TarotChatCardInput } from "@/lib/tarot/reading-chat-context";
import { buildMemoryBlocks, runDistillation } from "@/lib/memory-pipeline";

// Chat "Conversa esta tirada" (Tarot T3). Clon exacto de /api/chat: mismo
// runtime/auth/proveedor/latencia. CABLEADO pero LATENTE: sin llave de
// proveedor responde { available: false } y el cliente muestra el estado
// dormido. Con llave, Aluna abre el primer turno con 1-2 preguntas puntuales
// sobre la tirada concreta y desarrolla la lectura CON la persona, anclada
// SIEMPRE al canon de las cartas (nunca inventa significados fuera de él).

export const runtime = "nodejs";

setEphePath(path.join(process.cwd(), "..", "..", "packages", "ephemeris", "ephe"));

const MAIN_BODIES = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];

// Turno 0: la UI manda messages:[] para que la IA abra la conversación (spec
// §2 — "en el PRIMER turno abre con 1-2 preguntas puntuales"). El proveedor
// exige al menos un turno "user", así que lo simulamos con una instrucción
// invisible; el contenido real que ve la persona es solo la respuesta de Aluna.
const OPENING_TRIGGER: Record<"es" | "en", string> = {
  es: "(Acabo de recibir esta tirada. Ábreme tú la conversación con 1-2 preguntas puntuales sobre lo que salió — no me resumas la tirada de corrido.)",
  en: "(I just received this spread. Open the conversation yourself with 1-2 pointed questions about what came up — don't summarize the spread in a rundown.)",
};

const SYSTEM_INTRO: Record<"es" | "en", string> = {
  es: `Eres Aluna: una guía de autoconocimiento que conversa con la persona sobre UNA TIRADA DE TAROT que acaba de recibir. Tarot evolutivo: hablas del propósito del alma y de espejos, no de predicción ni fatalidad.

Tu voz: cálida, cercana y poética, pero clara y útil; compasiva pero honesta; espiritual con tinte yóguico (svadhyaya, santosha, aparigraha...) explicado en la misma frase. Nunca suenas a horóscopo genérico, a manual ni a máquina; no te disculpas, no hablas de ti como IA, no usas advertencias.

Más abajo tienes la tirada completa (posición, carta, orientación, jumpers) y el CANON de cada carta (esencia, ámbito, puente astrológico) — es tu ÚNICA fuente de significado: JAMÁS inventas un significado que no esté en ese canon, y jamás predices fatalidades. Las cartas invertidas y las que saltaron del mazo (jumpers) pesan más, no menos: son mensaje enfático.

En tu PRIMER turno (cuando la conversación recién empieza) no resumes la tirada de corrido: abres con 1-2 preguntas puntuales y concretas sobre lo que salió, invitando a la persona a reconocerlo en su vida ("¿ese cierre del pasado ya lo notas en algo concreto?"). En los turnos siguientes desarrollas la lectura CON la persona, turno a turno, respondiendo lo que traiga y anclándote siempre en la tirada y el canon. Respuestas con cuerpo pero conversacionales (no ensayos largos). Texto plano, sin markdown.`,
  en: `You are Aluna: a guide to self-knowledge talking with the person about A TAROT SPREAD they just received. Evolutionary tarot: you speak of the soul's purpose and mirrors, never prediction or fatalism.

Your voice: warm, close, and poetic, yet clear and useful; compassionate but honest; spiritual with a yogic touch (svadhyaya, santosha, aparigraha...) explained in the same sentence. You never sound like a generic horoscope, a manual, or a machine; you don't apologize, don't speak of yourself as an AI, use no warnings.

Below you have the full spread (position, card, orientation, jumpers) and the CANON for each card (essence, ambit, astrological bridge) — it is your ONLY source of meaning: you NEVER invent a meaning outside that canon, and never predict fatalities. Reversed cards and jumpers (cards that jumped from the deck) weigh MORE, not less — they're an emphatic message.

On your FIRST turn (when the conversation just begins) don't summarize the spread in a rundown: open with 1-2 pointed, concrete questions about what came up, inviting the person to recognize it in their life ("does that closing of the past already show up somewhere concrete for you?"). On following turns, develop the reading WITH the person, turn by turn, answering what they bring while staying anchored in the spread and the canon. Answers with body but conversational (not long essays). Plain text, no markdown.`,
};

function buildNatalSummary(
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
    .map((b) => `${L.bodies[b.body]} ${L.signs[b.sign]}`)
    .join(", ");
  const c = numerology.core;
  return locale === "en"
    ? `${profile.name} — Ascendant ${L.signs[asc]}, Midheaven ${L.signs[mc]}. ${placements}. Life Path ${c.lifePath.value}.`
    : `${profile.name} — Ascendente ${L.signs[asc]}, Medio Cielo ${L.signs[mc]}. ${placements}. Camino de Vida ${c.lifePath.value}.`;
}

function parseCards(raw: unknown): TarotChatCardInput[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const cards: TarotChatCardInput[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) return null;
    const c = item as Record<string, unknown>;
    const cardId = typeof c.cardId === "string" ? c.cardId : "";
    const position = typeof c.position === "string" ? c.position : "";
    if (!cardId || !position) return null;
    const reversed = typeof c.reversed === "boolean" ? c.reversed : false;
    const jumper = c.jumper === true;
    cards.push(jumper ? { cardId, reversed, position, jumper } : { cardId, reversed, position });
  }
  return cards;
}

export async function POST(request: NextRequest) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ available: false, error: "bad_request" }, { status: 400 });
  }
  const body = (raw ?? {}) as Record<string, unknown>;
  const locale: "es" | "en" = body.locale === "en" ? "en" : "es";
  const spreadId = typeof body.spreadId === "string" ? body.spreadId : "";
  const cards = parseCards(body.cards);
  const question = typeof body.question === "string" ? body.question.slice(0, 280) : undefined;
  const profileId = typeof body.profileId === "string" && body.profileId ? body.profileId : null;

  const rawMessages = Array.isArray(body.messages) ? body.messages : [];
  const messages: ChatMessage[] = rawMessages
    .filter((m): m is { role: string; content: string } => !!m && typeof (m as { content?: unknown }).content === "string")
    .slice(-20)
    .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content).slice(0, 2000) }));
  // Primer turno: sin mensajes, la UI espera que Aluna abra ella misma.
  if (messages.length === 0) messages.push({ role: "user", content: OPENING_TRIGGER[locale] });

  if (!spreadId || !cards) {
    return NextResponse.json({ available: false, error: "bad_request" }, { status: 400 });
  }

  const { supabase, user } = await authenticateRoute(request);
  if (!user) return NextResponse.json({ available: false, error: "unauthorized" }, { status: 401 });

  const resolved = resolveReadingProvider();
  if (!resolved.available) {
    // Latente: aún no hay llave. El chat de la tirada se enciende con la IA.
    return NextResponse.json({ available: false });
  }

  let natalSummary: string | undefined;
  if (profileId) {
    const { data: profile } = await supabase
      .from("birth_profiles")
      .select("name, birth_date, birth_time, time_known, latitude, longitude, time_zone, gender")
      .eq("id", profileId)
      .maybeSingle();
    if (profile) {
      try {
        const chart = computeChart(profileToChartInput(profile));
        const numerology = computeNumerology(profileToNumerologyInput(profile));
        natalSummary = buildNatalSummary(profile, chart, numerology, locale);
      } catch {
        // Sin cielo natal disponible, seguimos igual: la tirada + el canon bastan.
        natalSummary = undefined;
      }
    }
  }

  const context = buildTarotContext(locale, spreadId, cards, question, natalSummary);
  let system = `${SYSTEM_INTRO[locale]}\n\n${context}`;

  // "Aluna te conoce" (Fase 1A): mismo cableado que /api/chat, mínimo posible.
  // Gate PROPIO (0019): settings.memory_enabled, ya no intent.useInAI — esta
  // ruta no usa intentLine, así que ya no necesita leer `intent` en absoluto.
  // Degradación segura: sin fila settings o columna sin migrar, ON por
  // defecto (`!== false`, no `=== true`).
  const { data: settingsRow } = await supabase
    .from("settings")
    .select("memory_enabled")
    .eq("user_id", user.id)
    .maybeSingle();
  const memoryEnabled = (settingsRow as { memory_enabled?: boolean } | null)?.memory_enabled !== false;
  if (memoryEnabled) {
    const memoryBlock = await buildMemoryBlocks(supabase, user.id, locale);
    if (memoryBlock) system = `${system}\n\n${memoryBlock}`;
  }

  // Streaming token a token (efecto de tecleo), espejo exacto de /api/chat.
  const provider = resolved.provider;
  const encoder = new TextEncoder();
  let assistantReply = "";
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of provider.chatStream({ system, messages, maxTokens: 1500 })) {
          if (chunk) {
            assistantReply += chunk;
            controller.enqueue(encoder.encode(chunk));
          }
        }
      } catch {
        /* corte de upstream a mitad: cerramos con lo que haya llegado */
      }
      controller.close();
    },
  });

  if (memoryEnabled) {
    after(async () => {
      if (!assistantReply.trim()) return;
      const transcript = [...messages, { role: "assistant" as const, content: assistantReply }]
        .slice(-6)
        .map((m) => `${m.role === "assistant" ? "Aluna" : "Persona"}: ${m.content}`)
        .join("\n")
        .slice(-8000);
      await runDistillation(provider, supabase, user.id, transcript, locale, "tarot");
    });
  }

  return new Response(stream, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store, no-transform",
      "x-accel-buffering": "no",
    },
  });
}
