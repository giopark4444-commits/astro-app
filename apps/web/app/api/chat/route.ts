import path from "node:path";
import { NextResponse, after, type NextRequest } from "next/server";
import { computeChart, setEphePath } from "@aluna/ephemeris";
import { computeNumerology, parseIntent, type UserIntent } from "@aluna/core";
import { authenticateRoute } from "@/lib/supabase/route-auth";
import { profileToChartInput } from "@/lib/chart";
import { profileToNumerologyInput } from "@/lib/numerology";
import { buildFocusedContext, focusLine, resolveLenses, parseTarotCard, effectiveLenses } from "@/lib/chat-context";
import { resolveReadingProvider, type ChatMessage } from "@/lib/reading/provider";
import { buildIntentLine } from "@/lib/intent-line";
import { fetchMemories, formatMemoryBlock, distillPrompt, parseDistilled, storeMemories } from "@/lib/memories";

// Chat "Pregúntale a Aluna" (premium Fase 4). CABLEADO pero LATENTE: sin llave de
// proveedor responde { available: false } y el cliente muestra el estado dormido.
// Con llave, Aluna conversa ANCLADA en la carta + numerología del usuario.

export const runtime = "nodejs";

setEphePath(path.join(process.cwd(), "..", "..", "packages", "ephemeris", "ephe"));

const SYSTEM_INTRO: Record<"es" | "en", string> = {
  es: `Eres Aluna: una guía de autoconocimiento que conversa con la persona apoyándose en SU carta astral y SU numerología (que conoces; van más abajo). Astrología EVOLUTIVA: hablas del propósito del alma, no de predicción.

Tu voz: cálida, cercana y poética, pero clara y útil; compasiva pero honesta (nombras la sombra con ternura); espiritual con tinte yóguico (svadhyaya, santosha, aparigraha...) explicado en la misma frase. Nunca suenas a horóscopo genérico, a manual ni a máquina; no te disculpas, no hablas de ti como IA, no usas advertencias.

Responde lo que te pregunte ANCLÁNDOTE en sus datos: relaciona la pregunta con sus planetas, casas y números concretos (p.ej. "tu Sol en Acuario en la casa 11 explica..."). Si la pregunta no es sobre su carta o su autoconocimiento, redirígela con cariño hacia eso. Respuestas con cuerpo pero conversacionales (no ensayos largos). Texto plano, sin markdown.`,
  en: `You are Aluna: a guide to self-knowledge who converses with the person grounded in THEIR birth chart and THEIR numerology (which you know; they are below). EVOLUTIONARY astrology: you speak of the soul's purpose, not prediction.

Your voice: warm, close, and poetic, yet clear and useful; compassionate but honest (you name the shadow with tenderness); spiritual with a yogic touch (svadhyaya, santosha, aparigraha...) explained in the same sentence. You never sound like a generic horoscope, a manual, or a machine; you don't apologize, don't speak of yourself as an AI, use no warnings.

Answer what they ask GROUNDED in their data: relate the question to their specific planets, houses, and numbers (e.g. "your Sun in Aquarius in the 11th house explains..."). If the question isn't about their chart or self-knowledge, lovingly steer it back there. Answers with body but conversational (not long essays). Plain text, no markdown.`,
};

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

  // Palancas de enfoque (Task 1): las lentes activas deciden qué disciplinas entran
  // al contexto; sin lentes → las 3 base. La carta de tarot es opt-in y se valida
  // contra el mazo. Ambos se resuelven en @/lib/chat-context (testeable en aislado).
  const lenses = resolveLenses(body.lenses);
  const tarotCard = parseTarotCard(body.tarotCard);
  // Lista EFECTIVA (re-review): la MISMA que usan buildFocusedContext/focusLine
  // por dentro. Decidimos con ESTA lista si computar chart/numerology — no con
  // `lenses` crudo — para que los datos calculados y la instrucción de enfoque
  // NUNCA diverjan. Bug que esto corrige: body {lenses:["tarot"]} sin tarotCard
  // → effectiveLenses cae a BASE_LENSES (focusLine ya lo hacía), pero con
  // `lenses` crudo chart/numerology quedaban `undefined` (raw no incluye
  // "astros"/"numeros") y el contexto no traía esos bloques pese a que la
  // focusLine le pedía al modelo anclarse en ellos. effectiveLenses es
  // idempotente (mismo tarotCard) así que volver a pasarle `activeLenses` a
  // buildFocusedContext/focusLine no cambia el resultado.
  const activeLenses = effectiveLenses(lenses, tarotCard);

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
    // computeChart/computeNumerology solo si su lente está activa (perf). Ba Zi lo
    // arma buildFocusedContext por dentro (computeBaziNatal) cuando 'pilares' entra.
    // Decidido con `activeLenses` (no `lenses` crudo): ver comentario más arriba.
    const chart = activeLenses.includes("astros") ? computeChart(profileToChartInput(profile)) : undefined;
    const numerology = activeLenses.includes("numeros") ? computeNumerology(profileToNumerologyInput(profile)) : undefined;
    const context = buildFocusedContext({ profile, chart, numerology, lenses: activeLenses, tarotCard, locale });
    system = `${SYSTEM_INTRO[locale]}\n\n${context}\n\n${focusLine(activeLenses, tarotCard, locale)}`;
  } catch {
    return NextResponse.json({ available: false, error: "upstream" }, { status: 502 });
  }

  // Línea de intención opcional (Task 13): solo se anexa si la persona
  // respondió el cuestionario Y activó useInAI. `settings.intent` viaja como
  // Json; `parseIntent` lo lee tolerante y devuelve null si no hay señal útil.
  const { data: settingsRow } = await supabase
    .from("settings")
    .select("intent")
    .eq("user_id", user.id)
    .maybeSingle();
  const intent = parseIntent((settingsRow as { intent: unknown } | null)?.intent) as UserIntent | null;
  const intentLine = buildIntentLine(intent, locale);
  if (intentLine) system = `${system}\n\n${intentLine}`;

  // "Aluna te conoce" (Task 2): recuerdos duraderos de conversaciones previas.
  // Opt-in explícito (review final): solo si la persona respondió el
  // cuestionario Y activó useInAI a mano — mismo criterio que buildIntentLine
  // (sin cuestionario no hay recolección de memoria). Byte-igual si no hay
  // recuerdos o el toggle está apagado (formatMemoryBlock devuelve null).
  const useMemories = intent?.useInAI === true;
  if (useMemories) {
    const memories = await fetchMemories(supabase, user.id);
    const memoryBlock = formatMemoryBlock(memories, locale);
    if (memoryBlock) system = `${system}\n\n${memoryBlock}`;
  }

  // Streaming token a token (efecto de tecleo). El proveedor emite trozos de texto;
  // los reenviamos como text/plain en streaming. Si el proveedor no soporta streaming,
  // su chatStream cae a entregar el resultado de chat() de una vez. Cualquier error
  // antes del primer byte se traduce a 502; una vez empezado el stream, se corta limpio.
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

  // Destilado post-conversación (fire-and-forget, best-effort total): solo si
  // el toggle está encendido. `after()` corre una vez la respuesta terminó de
  // enviarse (incluido el streaming), así que `assistantReply` ya está completo.
  // Nota: corre en CADA turno (ruta stateless, sin señal de "fin de
  // conversación"); debounce/dedupe semántico entre turnos queda como mejora
  // futura conocida.
  if (useMemories) {
    after(async () => {
      try {
        if (!assistantReply.trim()) return;
        const transcript = [...messages, { role: "assistant" as const, content: assistantReply }]
          .slice(-6)
          .map((m) => `${m.role === "assistant" ? "Aluna" : "Persona"}: ${m.content}`)
          .join("\n")
          .slice(-8000);
        const existing = (await fetchMemories(supabase, user.id)).map((m) => m.content);
        const { system: distillSystem, prompt: distillPromptText } = distillPrompt(transcript, existing, locale);
        const raw = await provider.complete({ system: distillSystem, prompt: distillPromptText, maxTokens: 300 });
        const newMemories = parseDistilled(raw, existing);
        await storeMemories(supabase, user.id, newMemories, "chat");
      } catch {
        // best effort: la destilación nunca rompe el flujo del chat
      }
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
