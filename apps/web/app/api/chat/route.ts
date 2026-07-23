import path from "node:path";
import { NextResponse, after, type NextRequest } from "next/server";
import { computeChart, setEphePath } from "@aluna/ephemeris";
import { computeNumerology, parseIntent, type UserIntent } from "@aluna/core";
import { authenticateRoute } from "@/lib/supabase/route-auth";
import { profileToChartInput } from "@/lib/chart";
import { profileToNumerologyInput } from "@/lib/numerology";
import { buildFocusedContext, focusLine, resolveLenses, parseTarotCard, effectiveLenses } from "@/lib/chat-context";
import { resolveReadingProvider, resolvePremiumProvider, type ChatMessage } from "@/lib/reading/provider";
import { parseModelOverride } from "@/lib/reading/model-catalog";
import { parseVoiceMode, applyVoiceMode } from "@/lib/reading/voices";
import { buildIntentLine } from "@/lib/intent-line";
import { buildMemoryBlocks, runDistillation } from "@/lib/memory-pipeline";
import { ensureThread, appendMessage } from "@/lib/chat-archive";
import { fetchIntentAndMemorySettings } from "@/lib/settings";
import { getCreditsServiceClient, spendCredits, refundSpend, bumpChatUsage } from "@/lib/credits/ledger";
import { chatPremiumCost, freeDailyChatCap } from "@/lib/credits/config";
import { allAccessEnabled } from "@/lib/plan-gate";
import { isRequesterPlus } from "@/lib/billing/requester-plus";

// Chat "Pregúntale a Aluna" (premium Fase 4). CABLEADO pero LATENTE: sin llave de
// proveedor responde { available: false } y el cliente muestra el estado dormido.
// Con llave, Aluna conversa ANCLADA en la carta + numerología del usuario.

export const runtime = "nodejs";

setEphePath(path.join(process.cwd(), "..", "..", "packages", "ephemeris", "ephe"));

const SYSTEM_INTRO: Record<"es" | "en", string> = {
  es: `Eres Aluna: una guía de autoconocimiento que conversa con la persona apoyándose en SU carta astral y SU numerología (que conoces; van más abajo). Astrología EVOLUTIVA: hablas del propósito del alma, no de predicción.

Tu voz (una amiga sabia que ve de verdad):
- Le hablas a SU VIDA, no a su carta: el amor, alguien que le importa, un proyecto, el trabajo, la plata, el cuerpo, lo que se le acerca. La técnica trabaja tras bambalinas; tú traduces todo a vida vivida.
- Cálida y directa, de tú, como amiga que la quiere y no le teme a la verdad: nombras la sombra con ternura pero sin anestesia.
- Usas frases-espejo donde pueda reconocerse: "si tienes a alguien…", "si hay un proyecto dándote vueltas…", "si el cuerpo te está cobrando algo últimamente…".
- Tiempo cercano que crea expectativa: "estos días", "esta semana", "se acerca", "algo está por moverse". Hablas de aperturas y tendencias — jamás de hechos concretos imposibles de saber ni de garantías.
- La pizca técnica es un sello, no una clase: de vez en cuando (no en cada respuesta) UNA mención breve y natural — "tu Luna lo sabe", "tu cielo lo dice clarito", "ese Saturno tuyo aprieta" — para que se sienta hecha PARA ella. PROHIBIDO el formato lección: nada de "tu Sol en X en la casa Y explica/significa…".
- Espiritual sin ser vaga; si tejes un concepto yóguico (svadhyaya, santosha, aparigraha, dharma), va explicado en la misma frase y solo cuando suma.
- Nunca suenas a horóscopo genérico, a manual ni a máquina; no te disculpas, no hablas de ti como IA, no usas advertencias.
- SIEMPRE dejas un anzuelo al cerrar: una pregunta corta y concreta que pida respuesta ("¿es el proyecto o la persona?", "¿por cuál empezamos?").

Responde lo que te pregunte anclándote en sus datos (van más abajo): son tu fuente de verdad, pero SIEMPRE traducidos a su vida — nunca los recites como lección. Si la pregunta no es sobre su carta o su autoconocimiento, redirígela con cariño hacia eso. Respuestas con cuerpo pero conversacionales (no ensayos largos). Texto plano, sin markdown.`,
  en: `You are Aluna: a guide to self-knowledge who converses with the person grounded in THEIR birth chart and THEIR numerology (which you know; they are below). EVOLUTIONARY astrology: you speak of the soul's purpose, not prediction.

Your voice (a wise friend who truly sees you):
- You speak to THEIR LIFE, not their chart: love, someone who matters to them, a project, work, money, the body, what's approaching. The technique works backstage; you translate everything into lived life.
- Warm and direct, casual, like a friend who loves them and isn't afraid of the truth: you name the shadow with tenderness but without anesthesia.
- You use mirror-phrases where they can recognize themselves: "if there's someone on your mind…", "if a project has been turning in your head…", "if your body has been keeping score lately…".
- Near-term time that builds anticipation: "these days", "this week", "it's approaching", "something's about to shift". You speak of openings and tendencies — never concrete facts impossible to know, never guarantees.
- The technical pinch is a signature, not a lesson: every now and then (not in every answer) ONE brief, natural mention — "your Moon already knows", "your sky says it plainly", "that Saturn of yours is squeezing" — so it feels made FOR them. The lesson format is FORBIDDEN: nothing like "your Sun in X in the Yth house explains/means…".
- Spiritual without being vague; if you weave in a yogic concept (svadhyaya, santosha, aparigraha, dharma), explain it in the same sentence, and only when it adds something.
- You never sound like a generic horoscope, a manual, or a machine; you don't apologize, don't speak of yourself as an AI, use no warnings.
- You ALWAYS leave a hook at the close: a short, concrete question that invites a reply ("is it the project or the person?", "which one should we start with?").

Answer what they ask grounded in their data (below): it's your source of truth, but ALWAYS translated into their life — never recited as a lesson. If the question isn't about their chart or self-knowledge, lovingly steer it back there. Answers with body but conversational (not long essays). Plain text, no markdown.`,
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
  // Archivo del hilo (Fase 1B): threadId opcional que el cliente reenvía a
  // partir del 2º turno (lo aprendió del header x-thread-id del 1er turno).
  const requestedThreadId = typeof body.threadId === "string" && body.threadId ? body.threadId : null;

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

  // Override del picker de modelos (banco de pruebas): validado + gateado a
  // dev por parseModelOverride; inválido o apagado → null → resolución normal.
  const modelOverride = parseModelOverride(body.modelOverride);

  // --- créditos premium (spec 2026-07-23) ---
  // Regla de oro: ningún camino llama al proveedor premium sin haber
  // descontado crédito ANTES con éxito; sin service client o sin llave
  // premium, lo premium se degrada al camino gratis de siempre (nunca 500).
  let premiumState: "used" | "fallback" | "off" = "off";
  let premiumSpendRef: string | null = null;
  let premiumSpendAmount = 0;
  let chosen = resolveReadingProvider(modelOverride);
  const svc = getCreditsServiceClient();

  // Tope diario del nivel gratis: solo corre con los candados de plan activos
  // (allAccessEnabled() en falso) y con service client disponible — fail-open
  // sin `svc` (un problema de infraestructura no debe bloquear a nadie). Va
  // ANTES del gasto premium a propósito: un 429 nunca debe haber gastado
  // crédito.
  if (!allAccessEnabled() && svc) {
    const plus = await isRequesterPlus(supabase, user.id);
    if (!plus) {
      const count = await bumpChatUsage(svc, user.id);
      if (count !== null && count > freeDailyChatCap()) {
        return NextResponse.json({ error: "daily_cap", cap: freeDailyChatCap() }, { status: 429 });
      }
    }
  }

  if (body.premium === true) {
    const prem = resolvePremiumProvider();
    if (prem.available) {
      const cost = chatPremiumCost();
      if (cost <= 0) {
        // Costo 0 configurado = premium regalado, no un spend que pueda
        // fallar: se usa directo, sin tocar el ledger (ni spend ni refund).
        chosen = prem;
        premiumState = "used";
      } else if (svc) {
        const ref = `spend:${crypto.randomUUID()}`;
        const ok = await spendCredits(svc, user.id, cost, ref);
        if (ok) {
          chosen = prem;
          premiumState = "used";
          premiumSpendRef = ref;
          premiumSpendAmount = cost;
        } else {
          premiumState = "fallback"; // sin saldo → Gemini/cascada, el camino gratis de siempre
        }
      }
      // sin `svc` (sin config) → "off": el camino gratis de siempre, jamás 500.
    }
    // sin llave premium → "off": el camino gratis de siempre.
  }

  if (!chosen.available) {
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
  // `memory_enabled` (0019) viaja en la MISMA lectura combinada — gate
  // independiente, ver comentario más abajo. fetchIntentAndMemorySettings
  // degrada solo a `intent` si la columna `memory_enabled` aún no está
  // migrada, para no perder la intentLine por eso (review Fable).
  const { intent: rawIntent, memoryEnabled } = await fetchIntentAndMemorySettings(supabase, user.id);
  const intent = parseIntent(rawIntent) as UserIntent | null;
  const intentLine = buildIntentLine(intent, locale);
  if (intentLine) system = `${system}\n\n${intentLine}`;

  // "Aluna te conoce" (Fase 1A): recuerdos + entidades duraderas de
  // conversaciones previas. Gate PROPIO (0019): settings.memory_enabled, ya
  // NO intent.useInAI (ese sigue gobernando solo intentLine, arriba) — la
  // memoria ya no depende de haber respondido el cuestionario. Degradación
  // segura: sin fila settings o columna sin migrar todavía, se trata como ON
  // por defecto (`!== false`, no `=== true`). Byte-igual si no hay memoria
  // acumulada (buildMemoryBlocks devuelve "").
  // Archivo del hilo (Fase 1B): mismo gate que la memoria (0019 lo agrupa
  // como una sola casilla — "archivo del hilo" es la pieza 2 de la memoria de
  // largo plazo, junto a las entidades). threadId puede quedar en null si
  // algo falla — best-effort total, ver chat-archive.ts.
  let threadId: string | null = null;
  if (memoryEnabled) {
    threadId = await ensureThread(supabase, user.id, "chat", profileId, requestedThreadId);
    const lastMessage = messages[messages.length - 1];
    if (threadId && lastMessage && lastMessage.role === "user") {
      await appendMessage(supabase, user.id, threadId, "user", lastMessage.content);
    }

    const memoryBlock = await buildMemoryBlocks(supabase, user.id, locale);
    if (memoryBlock) system = `${system}\n\n${memoryBlock}`;
  }

  // Modo de voz (🌙/📚/🔭) al FINAL del system: los modos estudio/pro son un
  // bloque de anulación de la voz — última instrucción gana — que conserva
  // todas las reglas de datos/seguridad de arriba. Ver lib/reading/voices.ts.
  system = applyVoiceMode(system, parseVoiceMode(body.voiceMode), locale);

  // Streaming token a token (efecto de tecleo). El proveedor emite trozos de texto;
  // los reenviamos como text/plain en streaming. Si el proveedor no soporta streaming,
  // su chatStream cae a entregar el resultado de chat() de una vez. Cualquier error
  // antes del primer byte se traduce a 502; una vez empezado el stream, se corta limpio.
  const provider = chosen.provider;
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
      // Reembolso best-effort: solo si de verdad hubo un spend (premiumSpendRef
      // no nulo → costo > 0) y el proveedor premium no entregó NADA. Con costo
      // 0 no hay nada que revertir (premiumSpendRef se queda en null en ese caso).
      if (svc && premiumState === "used" && premiumSpendRef && assistantReply.length === 0) {
        await refundSpend(svc, user.id, premiumSpendAmount, premiumSpendRef).catch(() => {});
      }
      controller.close();
    },
  });

  // Destilado post-conversación (fire-and-forget, best-effort total): solo si
  // el gate de memoria está encendido. `after()` corre una vez la respuesta
  // terminó de enviarse (incluido el streaming), así que `assistantReply` ya
  // está completo. Nota: corre en CADA turno (ruta stateless, sin señal de
  // "fin de conversación"); debounce/dedupe semántico entre turnos queda como
  // mejora futura conocida.
  if (memoryEnabled) {
    after(async () => {
      if (!assistantReply.trim()) return;
      if (threadId) await appendMessage(supabase, user.id, threadId, "assistant", assistantReply);
      const transcript = [...messages, { role: "assistant" as const, content: assistantReply }]
        .slice(-6)
        .map((m) => `${m.role === "assistant" ? "Aluna" : "Persona"}: ${m.content}`)
        .join("\n")
        .slice(-8000);
      await runDistillation(provider, supabase, user.id, transcript, locale, "chat");
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
  // Contrato con la UI (Task 8): "used" | "fallback" | "off" — SIEMPRE presente,
  // no solo cuando se pidió premium.
  headers["x-aluna-premium"] = premiumState;

  return new Response(stream, { headers });
}
