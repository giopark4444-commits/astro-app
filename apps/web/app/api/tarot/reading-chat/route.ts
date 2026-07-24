import path from "node:path";
import { NextResponse, after, type NextRequest } from "next/server";
import { computeChart, setEphePath } from "@aluna/ephemeris";
import { computeNumerology, signOfLongitude } from "@aluna/core";
import { authenticateRoute } from "@/lib/supabase/route-auth";
import { profileToChartInput } from "@/lib/chart";
import { profileToNumerologyInput } from "@/lib/numerology";
import { astroLabels } from "@/lib/content/astrology-labels";
import { resolveReadingProvider, type ChatMessage } from "@/lib/reading/provider";
import { parseModelOverride } from "@/lib/reading/model-catalog";
import { parseVoiceMode, applyVoiceMode } from "@/lib/reading/voices";
import { buildTarotContext, type TarotChatCardInput } from "@/lib/tarot/reading-chat-context";
import { buildMemoryBlocks, runDistillation } from "@/lib/memory-pipeline";
import { ensureThread, appendMessage } from "@/lib/chat-archive";

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

Tu voz (una amiga sabia que ve de verdad):
- Le hablas a SU VIDA, no a la tirada: el amor, alguien que le importa, un proyecto, el trabajo, la plata, el cuerpo, lo que se le acerca. La técnica trabaja tras bambalinas; tú traduces todo a vida vivida.
- Cálida y directa, de tú, como amiga que la quiere y no le teme a la verdad: nombras la sombra con ternura pero sin anestesia.
- Usas frases-espejo donde pueda reconocerse: "si tienes a alguien…", "si hay un proyecto dándote vueltas…", "si el cuerpo te está cobrando algo últimamente…".
- Tiempo cercano que crea expectativa: "estos días", "esta semana", "se acerca", "algo está por moverse". Hablas de aperturas y tendencias — jamás de hechos concretos imposibles de saber ni de garantías.
- La pizca técnica es un sello, no una clase: de vez en cuando (no en cada respuesta) UNA mención breve y natural — "esa carta lo dice clarito", "tu Luna también lo sabe" — para que se sienta hecha PARA ella. PROHIBIDO el formato lección: nada de "la carta X en la posición Y explica/significa…".
- Espiritual sin ser vaga; si tejes un concepto yóguico (svadhyaya, santosha, aparigraha, dharma), va explicado en la misma frase y solo cuando suma.
- Nunca suenas a horóscopo genérico, a manual ni a máquina; no te disculpas, no hablas de ti como IA, no usas advertencias.
- SIEMPRE dejas un anzuelo al cerrar: una pregunta corta y concreta que pida respuesta.

Más abajo tienes la tirada completa (posición, carta, orientación, jumpers) y el CANON de cada carta (esencia, ámbito, puente astrológico) — es tu ÚNICA fuente de significado: JAMÁS inventas un significado que no esté en ese canon, y jamás predices fatalidades. Las cartas invertidas y las que saltaron del mazo (jumpers) pesan más, no menos: son mensaje enfático.

En tu PRIMER turno (cuando la conversación recién empieza) no resumes la tirada de corrido: abres con 1-2 preguntas puntuales y concretas sobre lo que salió, invitando a la persona a reconocerlo en su vida ("¿ese cierre del pasado ya lo notas en algo concreto?"). En los turnos siguientes desarrollas la lectura CON la persona, turno a turno, respondiendo lo que traiga y anclándote siempre en la tirada y el canon. Respuestas con cuerpo pero conversacionales (no ensayos largos). Texto plano, sin markdown.`,
  en: `You are Aluna: a guide to self-knowledge talking with the person about A TAROT SPREAD they just received. Evolutionary tarot: you speak of the soul's purpose and mirrors, never prediction or fatalism.

Your voice (a wise friend who truly sees you):
- You speak to THEIR LIFE, not the spread: love, someone who matters to them, a project, work, money, the body, what's approaching. The technique works backstage; you translate everything into lived life.
- Warm and direct, casual, like a friend who loves them and isn't afraid of the truth: you name the shadow with tenderness but without anesthesia.
- You use mirror-phrases where they can recognize themselves: "if there's someone on your mind…", "if a project has been turning in your head…", "if your body has been keeping score lately…".
- Near-term time that builds anticipation: "these days", "this week", "it's approaching", "something's about to shift". You speak of openings and tendencies — never concrete facts impossible to know, never guarantees.
- The technical pinch is a signature, not a lesson: every now and then (not in every answer) ONE brief, natural mention — "that card says it plainly", "your Moon knows it too" — so it feels made FOR them. The lesson format is FORBIDDEN: nothing like "card X in position Y explains/means…".
- Spiritual without being vague; if you weave in a yogic concept (svadhyaya, santosha, aparigraha, dharma), explain it in the same sentence, and only when it adds something.
- You never sound like a generic horoscope, a manual, or a machine; you don't apologize, don't speak of yourself as an AI, use no warnings.
- You ALWAYS leave a hook at the close: a short, concrete question that invites a reply.

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
  // Archivo del hilo (Fase 1B): si el turno 0 no trae mensajes reales, el que
  // se agrega abajo es el OPENING_TRIGGER invisible — no debe persistirse
  // como si fuera algo que la persona escribió.
  const hasRealUserMessage = messages.length > 0;
  // Primer turno: sin mensajes, la UI espera que Aluna abra ella misma.
  if (messages.length === 0) messages.push({ role: "user", content: OPENING_TRIGGER[locale] });
  const requestedThreadId = typeof body.threadId === "string" && body.threadId ? body.threadId : null;

  if (!spreadId || !cards) {
    return NextResponse.json({ available: false, error: "bad_request" }, { status: 400 });
  }

  const { supabase, user } = await authenticateRoute(request);
  if (!user) return NextResponse.json({ available: false, error: "unauthorized" }, { status: 401 });

  // Override del picker de modelos (banco de pruebas): validado + gateado a
  // dev por parseModelOverride; inválido o apagado → null → resolución normal.
  const modelOverride = parseModelOverride(body.modelOverride);
  const resolved = resolveReadingProvider(modelOverride);
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
  // Archivo del hilo (Fase 1B): la lista de hilos + "retomar" diferidos son
  // exactamente la biblioteca de conversaciones (/chat) — mismo gate que la
  // memoria, ver comentario en /api/chat. Etiqueta (0023) siempre "tarot":
  // a diferencia del asistente general, esta superficie ES una sola lente.
  let threadId: string | null = null;
  if (memoryEnabled) {
    threadId = await ensureThread(supabase, user.id, "tarot", profileId, requestedThreadId, "tarot");
    const lastMessage = messages[messages.length - 1];
    if (threadId && hasRealUserMessage && lastMessage && lastMessage.role === "user") {
      await appendMessage(supabase, user.id, threadId, "user", lastMessage.content);
    }

    const memoryBlock = await buildMemoryBlocks(supabase, user.id, locale);
    if (memoryBlock) system = `${system}\n\n${memoryBlock}`;
  }

  // Modo de voz (🌙/📚/🔭) al FINAL del system: los modos estudio/pro son un
  // bloque de anulación de la voz — última instrucción gana — que conserva
  // todas las reglas de datos/seguridad de arriba. Ver lib/reading/voices.ts.
  system = applyVoiceMode(system, parseVoiceMode(body.voiceMode), locale);

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
      if (threadId) await appendMessage(supabase, user.id, threadId, "assistant", assistantReply);
      const transcript = [...messages, { role: "assistant" as const, content: assistantReply }]
        .slice(-6)
        .map((m) => `${m.role === "assistant" ? "Aluna" : "Persona"}: ${m.content}`)
        .join("\n")
        .slice(-8000);
      await runDistillation(provider, supabase, user.id, transcript, locale, "tarot");
    });
  }

  const headers: Record<string, string> = {
    "content-type": "text/plain; charset=utf-8",
    "cache-control": "no-store, no-transform",
    "x-accel-buffering": "no",
  };
  if (threadId) headers["x-thread-id"] = threadId;
  // Con qué respondió de verdad (el picker lo muestra: "respondió hermes/…").
  headers["x-aluna-model"] = `${provider.name}/${provider.model}`;

  return new Response(stream, { headers });
}
