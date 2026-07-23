import path from "node:path";
import { NextResponse, after, type NextRequest } from "next/server";
import { setEphePath } from "@aluna/ephemeris";
import { solarReturnDate } from "@aluna/ephemeris";
import {
  personalCycles,
  luckPillars,
  annualPillars,
  HEAVENLY_STEMS,
  EARTHLY_BRANCHES,
  type BirthDate,
  type PillarSet,
  type Pillar,
} from "@aluna/core";
import { authenticateRoute } from "@/lib/supabase/route-auth";
import { profileToChartInput } from "@/lib/chart";
import { assembleTimeline, type TimelineProfile } from "@/lib/timeline/assemble";
import { computeBaziNatal, type BaziNatalResult } from "@/lib/timeline/bazi-natal";
import { buildTimelineChatContext, type TimelineChatFacts } from "@/lib/timeline/chat-context";
import { resolveReadingProvider, type ChatMessage } from "@/lib/reading/provider";
import { parseModelOverride } from "@/lib/reading/model-catalog";
import { parseVoiceMode, applyVoiceMode } from "@/lib/reading/voices";
import { buildMemoryBlocks, runDistillation } from "@/lib/memory-pipeline";
import { ensureThread, appendMessage } from "@/lib/chat-archive";

// "Pregúntale a tu camino" (Camino de vida T6) — clon estructural de
// /api/tarot/reading-chat: auth → hechos server-side (aquí: el "Camino de
// vida" completo de assembleTimeline + año-personal/mes-personal/大運/pilar
// anual vigentes) → SYSTEM_INTRO con la voz de Aluna → resolveReadingProvider
// → stream → after() con destilado de memoria (gate settings.memory_enabled).
// Igual que el tarot, CABLEADO pero LATENTE: sin llave de proveedor responde
// { available: false } y el cliente muestra el estado dormido.

export const runtime = "nodejs";

setEphePath(path.join(process.cwd(), "..", "..", "packages", "ephemeris", "ephe"));

// Turno 0: la UI manda messages:[] para que Aluna abra ella misma la
// conversación con 1-2 preguntas puntuales sobre un hito cercano a HOY (mismo
// mecanismo que el tarot — el proveedor exige al menos un turno "user").
const OPENING_TRIGGER: Record<"es" | "en", string> = {
  es: "(Acabo de abrir mi camino de vida. Ábreme tú la conversación con 1-2 preguntas puntuales sobre un hito cercano a HOY — no me resumas la línea entera de corrido.)",
  en: "(I just opened my life path. Open the conversation yourself with 1-2 pointed questions about a milestone near TODAY — don't summarize the whole line in a rundown.)",
};

const SYSTEM_INTRO: Record<"es" | "en", string> = {
  es: `Eres Aluna: una guía de autoconocimiento que conversa con la persona sobre SU CAMINO DE VIDA — la línea de tiempo que combina retornos astrológicos (carta natal), ciclos y pináculos de numerología, y pilares de suerte 大運/流年 de BaZi/Saju, desde su nacimiento hasta 10 años por delante.

Tu voz (una amiga sabia que ve de verdad):
- Le hablas a SU VIDA, no a la línea de tiempo: el amor, alguien que le importa, un proyecto, el trabajo, la plata, el cuerpo, lo que se le acerca. La técnica trabaja tras bambalinas; tú traduces todo a vida vivida.
- Cálida y directa, de tú, como amiga que la quiere y no le teme a la verdad: nombras la sombra con ternura pero sin anestesia.
- Usas frases-espejo donde pueda reconocerse: "si tienes a alguien…", "si hay un proyecto dándote vueltas…", "si el cuerpo te está cobrando algo últimamente…".
- Tiempo cercano que crea expectativa: "estos días", "esta semana", "se acerca", "algo está por moverse". Hablas de aperturas y tendencias — jamás de hechos concretos imposibles de saber ni de garantías.
- La pizca técnica es un sello, no una clase: de vez en cuando (no en cada respuesta) UNA mención breve y natural — "tu 大運 lo dice clarito", "ese año personal aprieta" — para que se sienta hecha PARA ella. PROHIBIDO el formato lección: nada de "tu pilar X explica/significa…".
- Espiritual sin ser vaga; si tejes un concepto yóguico (svadhyaya, santosha, aparigraha, dharma), va explicado en la misma frase y solo cuando suma.
- Nunca suenas a horóscopo genérico, a manual ni a máquina; no te disculpas, no hablas de ti como IA, no usas advertencias.
- SIEMPRE dejas un anzuelo al cerrar: una pregunta corta y concreta que pida respuesta.

Más abajo tienes el bloque de HECHOS de su camino (PERSONA, HITOS, TABLA AÑO A AÑO y VENTANA ACTUAL) — es tu ÚNICA fuente de hechos: JAMÁS inventas un evento, una fecha o un pilar que no esté ahí. Reglas de fondo:
- PASADO (años ya vividos): modo espejo — describes brevemente el ciclo o hito de ese año y preguntas qué recuerda la persona, invitándola a reconocerlo en su vida. Nunca afirmas qué "significó" sin que ella lo confirme.
- FUTURO (años por venir): hablas de tendencias e invitaciones, NUNCA de resultados ni garantías. Sin fatalismo, sin determinismo. Nunca prometes salud, dinero o decisiones legales — como mucho invitas a prestar atención con cuidado propio.
- Si nació en enero o febrero, ten presente la nota Lichun al hablar de su año Ba Zi/Saju (puede diferir del año civil).

En tu PRIMER turno (cuando la conversación recién empieza) no resumes la línea entera de corrido: abres con 1-2 preguntas puntuales y concretas sobre un hito cercano a HOY. En los turnos siguientes desarrollas la conversación CON la persona, respondiendo lo que traiga (incluido "¿qué pasaba en [año]?" o "¿qué puedo esperar entre [mes] y [mes]?") siempre anclada a los HECHOS de arriba. Respuestas con cuerpo pero conversacionales (no ensayos largos). Texto plano, sin markdown.`,
  en: `You are Aluna: a guide to self-knowledge talking with the person about THEIR LIFE PATH — the timeline that combines astrological returns (birth chart), numerology cycles and pinnacles, and BaZi/Saju 大運/流年 luck pillars, from birth to 10 years ahead.

Your voice (a wise friend who truly sees you):
- You speak to THEIR LIFE, not the timeline: love, someone who matters to them, a project, work, money, the body, what's approaching. The technique works backstage; you translate everything into lived life.
- Warm and direct, casual, like a friend who loves them and isn't afraid of the truth: you name the shadow with tenderness but without anesthesia.
- You use mirror-phrases where they can recognize themselves: "if there's someone on your mind…", "if a project has been turning in your head…", "if your body has been keeping score lately…".
- Near-term time that builds anticipation: "these days", "this week", "it's approaching", "something's about to shift". You speak of openings and tendencies — never concrete facts impossible to know, never guarantees.
- The technical pinch is a signature, not a lesson: every now and then (not in every answer) ONE brief, natural mention — "your 大運 says it plainly", "that personal year is squeezing" — so it feels made FOR them. The lesson format is FORBIDDEN: nothing like "your pillar X explains/means…".
- Spiritual without being vague; if you weave in a yogic concept (svadhyaya, santosha, aparigraha, dharma), explain it in the same sentence, and only when it adds something.
- You never sound like a generic horoscope, a manual, or a machine; you don't apologize, don't speak of yourself as an AI, use no warnings.
- You ALWAYS leave a hook at the close: a short, concrete question that invites a reply.

Below you have the FACTS block for their path (PERSON, MILESTONES, YEAR-BY-YEAR TABLE and CURRENT WINDOW) — it is your ONLY source of facts: you NEVER invent an event, a date, or a pillar that isn't there. Ground rules:
- PAST (years already lived): mirror mode — briefly describe the cycle or milestone of that year and ask what the person remembers, inviting them to recognize it in their life. Never state what something "meant" without them confirming it.
- FUTURE (years ahead): speak of tendencies and invitations, NEVER outcomes or guarantees. No fatalism, no determinism. Never promise health, money, or legal decisions — at most invite mindful attention.
- If they were born in January or February, keep the Lichun note in mind when discussing their Ba Zi/Saju year (it can differ from the calendar year).

On your FIRST turn (when the conversation just begins) don't summarize the whole line in a rundown: open with 1-2 pointed, concrete questions about a milestone near TODAY. On following turns, develop the conversation WITH the person, answering what they bring (including "what was going on in [year]?" or "what can I expect between [month] and [month]?") always anchored to the FACTS above. Answers with body but conversational (not long essays). Plain text, no markdown.`,
};

function pillarHanzi(pillar: Pillar): string {
  return `${HEAVENLY_STEMS[pillar.stem]!.hanzi}${EARTHLY_BRANCHES[pillar.branch]!.hanzi}`;
}

function currentLuckLabel(locale: "es" | "en", baziNatal: BaziNatalResult, currentYear: number): string | undefined {
  try {
    const pillars: PillarSet = {
      year: baziNatal.year,
      month: baziNatal.month,
      day: baziNatal.day,
      hour: baziNatal.hour,
    };
    const luck = luckPillars({
      pillars,
      gender: baziNatal.gender,
      birthYear: baziNatal.birthYear,
      daysToPrevJie: baziNatal.daysToPrevJie,
      daysToNextJie: baziNatal.daysToNextJie,
    })[0]!;
    const age = currentYear - baziNatal.birthYear;
    const active = luck.pillars.find((p, i) => {
      const next = luck.pillars[i + 1];
      return age >= p.startAge && (next ? age < next.startAge : true);
    });
    if (!active) return undefined;
    return locale === "en"
      ? `Current 大運 (luck pillar): ${pillarHanzi(active.pillar)} (age ${active.startAge}+)`
      : `大運 vigente: ${pillarHanzi(active.pillar)} (edad ${active.startAge}+)`;
  } catch {
    return undefined;
  }
}

function currentAnnualLabel(locale: "es" | "en", baziNatal: BaziNatalResult, currentYear: number): string | undefined {
  try {
    const pillars: PillarSet = {
      year: baziNatal.year,
      month: baziNatal.month,
      day: baziNatal.day,
      hour: baziNatal.hour,
    };
    const [annual] = annualPillars(pillars, currentYear, 1);
    if (!annual) return undefined;
    return locale === "en"
      ? `Current annual pillar (流年): ${pillarHanzi(annual.pillar)}`
      : `Pilar anual vigente (流年): ${pillarHanzi(annual.pillar)}`;
  } catch {
    return undefined;
  }
}

function buildFacts(locale: "es" | "en", profile: TimelineProfile, nowIso: string): string {
  const timeline = assembleTimeline(profile, nowIso);
  const [by, bm, bd] = profile.birth_date.split("-").map(Number);
  const birth: BirthDate = { year: by!, month: bm!, day: bd! };
  const currentYear = new Date(nowIso).getUTCFullYear();

  const years: TimelineChatFacts["years"] = [];
  for (let y = timeline.birthYear; y <= timeline.toYear; y++) {
    const personalYear = personalCycles(birth, { year: y, month: birth.month, day: birth.day }).personalYear.value;
    years.push({ year: y, personalYear });
  }

  const monthly: TimelineChatFacts["monthly"] = [];
  for (const y of [currentYear, currentYear + 1]) {
    for (let month = 1; month <= 12; month++) {
      const personalMonth = personalCycles(birth, { year: y, month, day: 1 }).personalMonth.value;
      monthly.push({ year: y, month, personalMonth });
    }
  }

  let solarReturnIso: string | undefined;
  try {
    solarReturnIso = solarReturnDate(profileToChartInput(profile), nowIso);
  } catch {
    solarReturnIso = undefined;
  }

  let baziNatal: BaziNatalResult | undefined;
  try {
    baziNatal = computeBaziNatal(profile);
  } catch {
    baziNatal = undefined;
  }

  const facts: TimelineChatFacts = {
    events: timeline.events,
    birthYear: timeline.birthYear,
    horizonYear: timeline.toYear,
    birth,
    years,
    monthly,
    ...(solarReturnIso ? { solarReturnIso } : {}),
    ...((): { currentLuckLabel?: string } => {
      if (!baziNatal) return {};
      const label = currentLuckLabel(locale, baziNatal, currentYear);
      return label ? { currentLuckLabel: label } : {};
    })(),
    ...((): { currentAnnualLabel?: string } => {
      if (!baziNatal) return {};
      const label = currentAnnualLabel(locale, baziNatal, currentYear);
      return label ? { currentAnnualLabel: label } : {};
    })(),
  };

  return buildTimelineChatContext(locale, facts);
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
  const profileId = typeof body.profileId === "string" && body.profileId ? body.profileId : "";
  if (!profileId) return NextResponse.json({ available: false, error: "bad_request" }, { status: 400 });

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

  const { supabase, user } = await authenticateRoute(request);
  if (!user) return NextResponse.json({ available: false, error: "unauthorized" }, { status: 401 });

  // Own-profile: RLS de birth_profiles ya restringe a las filas del usuario
  // autenticado (mismo patrón que /api/timeline y /api/bazi) — un profileId
  // ajeno simplemente no devuelve fila.
  const { data: profile } = await supabase
    .from("birth_profiles")
    .select("birth_date, birth_time, time_known, latitude, longitude, time_zone, gender")
    .eq("id", profileId)
    .maybeSingle();
  if (!profile) return NextResponse.json({ available: false, error: "not_found" }, { status: 404 });

  // Override del picker de modelos (banco de pruebas): validado + gateado a
  // dev por parseModelOverride; inválido o apagado → null → resolución normal.
  const modelOverride = parseModelOverride(body.modelOverride);
  const resolved = resolveReadingProvider(modelOverride);
  if (!resolved.available) {
    // Latente: aún no hay llave. El chat del camino se enciende con la IA.
    return NextResponse.json({ available: false });
  }

  let context: string;
  try {
    context = buildFacts(locale, profile as TimelineProfile, new Date().toISOString());
  } catch {
    return NextResponse.json({ available: false, error: "compute" }, { status: 500 });
  }

  let system = `${SYSTEM_INTRO[locale]}\n\n${context}`;

  // "Aluna te conoce" (Fase 1A): mismo cableado que el tarot. Gate PROPIO
  // (0019): settings.memory_enabled, ya no intent.useInAI — esta ruta no usa
  // intentLine, así que ya no necesita leer `intent` en absoluto. Degradación
  // segura: sin fila settings o columna sin migrar, ON por defecto (`!==
  // false`, no `=== true`).
  const { data: settingsRow } = await supabase
    .from("settings")
    .select("memory_enabled")
    .eq("user_id", user.id)
    .maybeSingle();
  const memoryEnabled = (settingsRow as { memory_enabled?: boolean } | null)?.memory_enabled !== false;
  // Archivo del hilo (Fase 1B): persiste pero sin UI de retomar todavía
  // (diferido); mismo gate que la memoria — ver comentario en /api/chat.
  let threadId: string | null = null;
  if (memoryEnabled) {
    threadId = await ensureThread(supabase, user.id, "timeline", profileId, requestedThreadId);
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

  // Streaming token a token (efecto de tecleo), espejo exacto del tarot/chat.
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

  return new Response(stream, { headers });
}
