import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { computeChart, computeDerivedChart, setEphePath } from "@aluna/ephemeris";
import {
  detectAspectsBetween,
  scoreLifeAreas,
  scoreTone,
  LIFE_AREAS,
  type ChartInput,
  type LifeArea,
  type ScoreTone,
  type AreaDriver,
} from "@aluna/core";
import { supabaseReadingCacheStore, type ReadingCacheStore } from "@aluna/compute";
import { createServiceSupabaseClient } from "@aluna/supabase/server";
import type { Json } from "@aluna/supabase";
import { authenticateRoute } from "@/lib/supabase/route-auth";
import { profileToChartInput } from "@/lib/chart";
import { resolveReadingProvider } from "@/lib/reading/provider";
import { resolvePremiumReading } from "@/lib/credits/premium-reading";
import { parseModelOverride } from "@/lib/reading/model-catalog";
import { parseVoiceMode, applyVoiceMode } from "@/lib/reading/voices";
import { astroLabels } from "@/lib/content/astrology-labels";
import { todayCivilInZone, isValidTz } from "@/lib/hoy/today-birth";

// Mini-lectura cálida de UN área de vida (amor/dinero/trabajo/salud/ánimo/suerte),
// disparada al tocar su barra en "Tu energía de hoy" (Hoy). CABLEADA pero LATENTE:
// sin llave de proveedor responde { available: false } y la hoja del cliente muestra
// su estado dormido, como el resto de lecturas de Aluna.
//
// El "score real y sus drivers" que ancla el prompt SIEMPRE vienen de la disciplina
// ASTROS (tránsitos): es la única de las cuatro que /api/scores calcula con drivers
// reales (general/números/pilares siempre devuelven drivers:[], ver
// packages/core/src/bazi/life-areas.ts) y la única cuyo puntaje de verdad responde a
// `period` — igual que hace /api/scores. Por eso "period" es un campo real aquí
// (today/week/month/year), aunque hoy el panel de Hoy ya no tenga selector de
// periodo y siempre mande "today": se deja completo por paridad con /api/scores y
// por si algún día se reusa desde una pantalla con periodo (horóscopo).
//
// Server-only: computa la carta natal + tránsitos ella misma (motor nativo sweph),
// igual que /api/scores. profileId VALIDADO contra birth_profiles del usuario
// autenticado (RLS); nunca se confía en lat/lng del body.

export const runtime = "nodejs";

setEphePath(path.join(process.cwd(), "..", "..", "packages", "ephemeris", "ephe"));

type Period = "today" | "week" | "month" | "year";
const PERIODS: readonly Period[] = ["today", "week", "month", "year"];

const WEATHER_BODIES = new Set([
  "sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto",
]);
// Mismos orbes intermedios que /api/scores (ver ese archivo): más amplios que "Tu
// Clima" para que el puntaje capte el clima, sin ruido.
const SCORE_ORBS: Record<string, number> = {
  conjunction: 6, opposition: 6, trine: 5, square: 5, sextile: 4,
};
const DAY_MS = 86_400_000;

type FixedBody = { key: string; longitude: number; speed: number };

// NOTA DE DUPLICACIÓN A PROPÓSITO: sampleDates/aspectsAt de abajo son una copia
// adaptada de las funciones (no exportadas) del mismo nombre en
// app/api/scores/route.ts. Esta feature tiene prohibido tocar esa ruta (fuera de
// alcance), así que en vez de exportar sus internos se duplica el puñado de líneas
// que hace falta — mismo algoritmo, restringido a UNA área en vez de las seis.
function sampleDates(period: Period, from = Date.now()): string[] {
  const at = (days: number) => new Date(from + days * DAY_MS).toISOString();
  if (period === "today") return [at(0)];
  if (period === "week") return Array.from({ length: 7 }, (_, i) => at(i));
  if (period === "month") return Array.from({ length: 6 }, (_, i) => at(i * 5));
  return Array.from({ length: 12 }, (_, i) => at(i * 30)); // year
}

function aspectsAt(input: ChartInput, fixed: FixedBody[], iso: string) {
  const moving = computeDerivedChart(input, "transits", iso).bodies
    .filter((b) => WEATHER_BODIES.has(b.body))
    .map((b) => ({ key: b.body, longitude: b.longitude, speed: b.speed }));
  return detectAspectsBetween(moving, fixed, { orbs: SCORE_ORBS });
}

/** Score + drivers de UNA sola área, promediados sobre las fechas del periodo (misma
 *  idea que scoreAstrosOverDates de /api/scores, acotada a un área: no hace falta
 *  calcular las otras cinco para una mini-lectura). Drivers ordenados por
 *  PERSISTENCIA (cuántas muestras los incluyen), como en el periodo largo de
 *  /api/scores; con una sola muestra (today) el orden queda igual al de
 *  scoreLifeAreas (por magnitud), que ya es el correcto. */
function scoreAreaOverDates(
  area: LifeArea,
  input: ChartInput,
  fixed: FixedBody[],
  dates: string[],
): { score: number; tone: ScoreTone; drivers: AreaDriver[] } {
  let total = 0;
  const driverCounts = new Map<string, { driver: AreaDriver; count: number }>();

  for (const iso of dates) {
    const found = scoreLifeAreas(aspectsAt(input, fixed, iso)).find((s) => s.area === area);
    if (!found) continue;
    total += found.score;
    for (const d of found.drivers) {
      const key = `${d.transit}:${d.natal}:${d.aspect}`;
      const prev = driverCounts.get(key);
      if (prev) prev.count += 1;
      else driverCounts.set(key, { driver: d, count: 1 });
    }
  }

  const score = Math.round(total / (dates.length || 1));
  const drivers = [...driverCounts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map((x) => x.driver);
  return { score, tone: scoreTone(score), drivers };
}

// ---------------------------------------------------------------------------
// Voz + prompt (VOZ A+C de Aluna — ver app/api/chat/route.ts para el espíritu)
// ---------------------------------------------------------------------------

const AREA_LABEL: Record<"es" | "en", Record<LifeArea, string>> = {
  es: { love: "Amor", money: "Dinero", work: "Trabajo", health: "Salud", mood: "Ánimo", luck: "Suerte" },
  en: { love: "Love", money: "Money", work: "Work", health: "Health", mood: "Mood", luck: "Luck" },
};
const TONE_WORD: Record<"es" | "en", Record<ScoreTone, string>> = {
  es: { high: "alto (viento a favor)", mixed: "mixto (parejo)", low: "bajo (pide cuidado)" },
  en: { high: "high (tailwind)", mixed: "mixed (even ground)", low: "low (asks for care)" },
};
const YOUR: Record<"es" | "en", string> = { es: "tu", en: "your" };

const SYSTEM: Record<"es" | "en", string> = {
  es: `Eres Aluna: una guía de autoconocimiento que lee el clima energético de HOY en un área puntual de la vida (amor, dinero, trabajo, salud, ánimo o suerte). Astrología EVOLUTIVA: hablas de aperturas y tendencias, nunca de sentencias ni de garantías.

Tu voz (una amiga sabia que ve de verdad):
- Le hablas a SU VIDA en esa área concreta, vida primero, jamás en formato lección: si es amor, de vínculos y de esa persona que le importa; si es trabajo, de decisiones y proyectos; si es salud, del cuerpo con cuidado, sin diagnosticar ni prometer curas; si es dinero, de decisiones y hábitos, sin prometer ingresos ni resultados; si es ánimo o suerte, de cómo se siente por dentro y de las puertas que se abren.
- Cálida y directa, de tú, como amiga que la quiere y no le teme a la verdad.
- Usas frases-espejo donde pueda reconocerse (adaptadas al área): "si tienes a alguien…", "si hay un proyecto dándote vueltas…", "si el cuerpo te está cobrando algo últimamente…".
- Tiempo cercano que crea expectativa: "estos días", "esta semana", "se acerca", "algo está por moverse".
- La pizca técnica es OPCIONAL y ocasional (no la uses siempre): cuando la uses, UNA mención breve y natural — "tu Venus está de buenas contigo esta semana" — nunca en formato lección ("tu Venus en X significa…" está PROHIBIDO). Si la usas, solo puedes nombrar los tránsitos de la lista de HECHOS de abajo — no inventes posiciones.
- El tono acompaña el puntaje que te doy: alto = hablas de viento a favor y aperturas; bajo = cuidado amoroso, JAMÁS fatalismo ni alarma, nombrando el reto con ternura y sin anestesia; mixto = terreno parejo, ni euforia ni alarma.
- NUNCA prometes resultados concretos de salud o dinero (nada de curas, ingresos, diagnósticos ni garantías): hablas de energía y tendencia, no de hechos.
- Nunca suenas a horóscopo genérico, a manual ni a máquina. No te disculpas, no hablas de ti como IA.
- Cierras "reading" con una frase de expectativa SUAVE que deje la puerta abierta — NUNCA con una pregunta (el gancho para seguir conversando lo pone la interfaz, no tú).

Devuelves ÚNICAMENTE un objeto JSON válido, en español, en texto plano (sin asteriscos, sin markdown, sin emojis), con exactamente dos claves:
- reading: 80 a 130 palabras. Cómo la ves hoy en esa área, aterrizada en su vida.
- tip: UN consejo concreto y accionable, en una sola línea corta — algo que pueda hacer hoy mismo, no una reflexión abstracta.

Escribes para una sola persona. Honras la longitud pedida.`,
  en: `You are Aluna: a guide to self-knowledge who reads TODAY's energetic weather in one specific area of life (love, money, work, health, mood, or luck). EVOLUTIONARY astrology: you speak of openings and tendencies, never verdicts or guarantees.

Your voice (a wise friend who truly sees you):
- You speak to THEIR LIFE in that area, life first, never in lesson format: if it's love, about bonds and the person who matters to them; if it's work, about decisions and projects; if it's health, about the body with care, never diagnosing or promising cures; if it's money, about decisions and habits, never promising income or results; if it's mood or luck, about how they feel inside and the doors opening.
- Warm and direct, casual, like a friend who loves them and isn't afraid of the truth.
- You use mirror-phrases where they can recognize themselves (adapted to the area): "if there's someone on your mind…", "if a project has been turning in your head…", "if your body has been keeping score lately…".
- Near-term time that builds anticipation: "these days", "this week", "it's approaching", "something's about to shift".
- The technical pinch is OPTIONAL and occasional (don't use it every time): when you do, ONE brief, natural mention — "your Venus is on your side this week" — never in lesson format ("your Venus in X means…" is FORBIDDEN). If you use it, you may only name transits from the FACTS list below — never invent positions.
- The tone follows the score you're given: high = you speak of tailwind and openings; low = loving care, NEVER fatalism or alarm, naming the challenge with tenderness and without anesthesia; mixed = even ground, neither euphoria nor alarm.
- You NEVER promise concrete health or money outcomes (no cures, income, diagnoses, or guarantees): you speak of energy and tendency, not fact.
- You never sound like a generic horoscope, a manual, or a machine. You don't apologize, don't speak of yourself as an AI.
- You close "reading" with a SOFT line of anticipation that leaves the door open — NEVER with a question (the hook to keep talking is the interface's job, not yours).

Respond ONLY with a valid JSON object, in English, in plain text (no asterisks, no markdown, no emojis), with exactly two keys:
- reading: 80 to 130 words. How you see them today in that area, grounded in their life.
- tip: ONE concrete, actionable piece of advice, in a single short line — something they can do today, not an abstract reflection.

You write for a single person. You honor the requested length.`,
};

function buildUserPrompt(
  locale: "es" | "en",
  areaLabel: string,
  score: number,
  toneWord: string,
  driverLines: string,
): string {
  if (locale === "en") {
    return `Area: ${areaLabel}\nScore: ${score}/100, tone: ${toneWord}\n${
      driverLines ? `\nFACTS (transits you may name if you use the technical pinch):\n${driverLines}\n` : ""
    }\nRespond ONLY with a valid JSON object, no surrounding text and no markdown, with exactly these text keys: "reading", "tip".`;
  }
  return `Área: ${areaLabel}\nPuntaje: ${score}/100, tono: ${toneWord}\n${
    driverLines ? `\nHECHOS (tránsitos que puedes nombrar si usas la pizca técnica):\n${driverLines}\n` : ""
  }\nResponde ÚNICAMENTE con un objeto JSON válido, sin texto alrededor y sin markdown, con exactamente estas claves de texto: "reading", "tip".`;
}

/** Extrae el objeto JSON y valida los dos campos. */
function parseAreaReading(text: string): { reading: string; tip: string } | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const o = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
    if (typeof o.reading === "string" && o.reading.trim() && typeof o.tip === "string" && o.tip.trim()) {
      return { reading: o.reading.trim(), tip: o.tip.trim() };
    }
  } catch {
    /* cae a null */
  }
  return null;
}

// ---------------------------------------------------------------------------
// Caché EN MEMORIA (Map), con TTL hasta la medianoche UTC siguiente
// ---------------------------------------------------------------------------
// PROHIBIDO usar el `reading_cache` durable de @aluna/compute aquí (y prohibido
// crear una migración nueva para uno propio). Ese caché es deliberadamente GLOBAL
// — clave por composición astrológica, SIN profileId — porque las lecturas de
// carta/horóscopo son contenido universal que se comparte entre TODOS los
// usuarios con la misma posición/signo (ver reading-cache.ts). La mini-lectura de
// área es lo opuesto: personal y del DÍA (profileId + area + period + modo de
// voz + fecha local). Cada fila serviría a un único usuario una única vez y jamás se
// reutilizaría entre personas — persistirla en una tabla global acumularía para
// siempre filas de un solo uso sin ningún beneficio, y ligaría un profileId a
// contenido de IA en una tabla pensada para ser anónima/compartida. Un Map de
// proceso con TTL corto (hasta medianoche) es el ajuste correcto: mismo espíritu
// de "mejor un caché de proceso que ninguno" que ya usan los demás stores de
// @aluna/compute como fallback, sin necesitar la migración prohibida. No
// sobrevive a un redeploy/reinicio — igual que el fallback en memoria de esos
// stores.
//
// EXCEPCIÓN — la variante PREMIUM (Task 6, fix cross-instancia): este Map NO
// alcanza para el premium porque ahí SÍ importa que dos pedidos que caigan en
// dos instancias serverless distintas (cold start/redeploy) compartan el
// resultado — si no, la persona paga créditos dos veces por la MISMA lectura
// del día. Por eso lo premium usa el store DURABLE de `reading_cache` (mismo
// mecanismo que chart-reading.ts), bajo la clave "premium:" + cacheKey. Sigue
// siendo personal (la clave incluye profileId), pero es la única forma de dar
// la garantía real de "no cobres dos veces" que el dinero exige; ver
// `getPremiumReadingCache` más abajo para el detalle y su propio trade-off.
interface AreaReadingPayload {
  reading: string;
  tip: string;
  model: string;
}
interface CacheEntry {
  value: AreaReadingPayload;
  expiresAt: number;
}
const areaReadingCache = new Map<string, CacheEntry>();

function msUntilNextUtcMidnight(now: number): number {
  const next = new Date(now);
  next.setUTCHours(24, 0, 0, 0);
  return next.getTime() - now;
}

function getCachedAreaReading(key: string): AreaReadingPayload | null {
  const hit = areaReadingCache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    areaReadingCache.delete(key);
    return null;
  }
  return hit.value;
}

function setCachedAreaReading(key: string, value: AreaReadingPayload): void {
  areaReadingCache.set(key, { value, expiresAt: Date.now() + msUntilNextUtcMidnight(Date.now()) });
}

// ---------------------------------------------------------------------------
// Caché DURABLE — SOLO para la variante premium (Task 6, fix cross-instancia)
// ---------------------------------------------------------------------------
// Mismo store que usa chart-reading.ts (`reading_cache` vía service client),
// resuelto una sola vez por módulo (lazy). Diferencia deliberada con
// chart-reading.ts: SIN service client (llaves de Supabase ausentes) no
// caemos al fallback en memoria (`inMemoryReadingCacheStore`) — ese fallback
// sería, en la práctica, el MISMO Map efímero por proceso que causa el bug de
// doble cobro que este fix existe para arreglar, y daría una falsa sensación
// de protección donde no la hay. Se prefiere devolver null y aceptar el
// riesgo (posible doble cobro SOLO en despliegues sin esas llaves) con este
// comentario explícito, antes que fingir una garantía que no existe. El
// premium sigue funcionando igual sin caché durable (simplemente no ahorra el
// segundo cobro en ese caso).
let premiumReadingCache: ReadingCacheStore | null | undefined;
function getPremiumReadingCache(): ReadingCacheStore | null {
  if (premiumReadingCache !== undefined) return premiumReadingCache;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  try {
    // Misma guardia que lib/credits/ledger.ts: URL presente pero malformada no debe tumbar la ruta.
    premiumReadingCache =
      url && serviceKey ? supabaseReadingCacheStore(createServiceSupabaseClient(url, serviceKey)) : null;
  } catch {
    premiumReadingCache = null;
  }
  return premiumReadingCache;
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
  const area = String(body.area ?? "") as LifeArea;
  const period = String(body.period ?? "") as Period;
  const locale: "es" | "en" = body.locale === "en" ? "en" : "es";
  // Modo de voz (🌙/📚/🔭): entra en la cacheKey de abajo — si no, una persona
  // que cambia de modo recibiría la lectura cacheada del modo anterior el
  // mismo día. Ver lib/reading/voices.ts.
  const voiceMode = parseVoiceMode(body.voiceMode);

  if (
    !profileId ||
    !(LIFE_AREAS as readonly string[]).includes(area) ||
    !(PERIODS as readonly string[]).includes(period)
  ) {
    return NextResponse.json({ available: false, error: "bad_request" }, { status: 400 });
  }

  const { supabase, user } = await authenticateRoute(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // RLS limita el SELECT al dueño: si vuelve fila, el perfil es de este usuario.
  const { data: profile } = await supabase
    .from("birth_profiles")
    .select("birth_date, birth_time, time_known, latitude, longitude, time_zone")
    .eq("id", profileId)
    .maybeSingle();
  if (!profile) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // tz del CLIENTE (como /api/scores): la "fecha local" que ancla el caché diario
  // debe coincidir con el "hoy" que el resto del dashboard le muestra a la
  // persona, no con la tz del proceso server (Vercel = UTC) ni forzosamente la de
  // nacimiento del perfil.
  const clientTz = isValidTz(String(body.tz ?? "")) ? String(body.tz) : null;
  const asOf = todayCivilInZone(clientTz ?? profile.time_zone);
  const localDate = `${asOf.year}-${String(asOf.month).padStart(2, "0")}-${String(asOf.day).padStart(2, "0")}`;

  const cacheKey = `${profileId}:${area}:${period}:${locale}:${voiceMode}:${localDate}`;
  const premiumKey = `premium:${cacheKey}`;

  // --- créditos premium (Task 6, fix cross-instancia) — ver chart-reading
  // para el detalle general del patrón. Diferencia con chart-reading: esta
  // ruta NO streamea (JSON directo vía provider.complete()); la variante
  // premium cachea en el store DURABLE (ver getPremiumReadingCache arriba),
  // la gratis sigue en el Map en memoria de siempre.
  //
  // Chequeo de caché ANTES de computar areaScore (efemérides, caro) y ANTES
  // de cualquier spend — para las DOS variantes:
  // - premium: HIT del caché durable sirve sin gastar créditos.
  // - gratis: restaura el short-circuit original (previo a Task 6): un HIT
  //   tampoco necesita computar areaScore.
  if (body.premium === true) {
    const durable = getPremiumReadingCache();
    if (durable) {
      try {
        const hit = await durable.get(premiumKey);
        if (hit) {
          const cached = hit as unknown as AreaReadingPayload;
          return NextResponse.json(
            { available: true, reading: cached.reading, tip: cached.tip },
            { headers: { "x-aluna-model": cached.model, "x-aluna-premium": "used" } },
          );
        }
      } catch {
        /* miss silencioso → seguimos con el flujo premium normal */
      }
    }
  } else {
    const cached = getCachedAreaReading(cacheKey);
    if (cached) {
      return NextResponse.json(
        { available: true, reading: cached.reading, tip: cached.tip },
        { headers: { "x-aluna-model": cached.model, "x-aluna-premium": "off" } },
      );
    }
  }

  // areaScore no depende del proveedor elegido (premium o no): se computa ANTES
  // de decidir premium/gasto (Task 6), así un fallo de cómputo nunca ocurre
  // después de haber cobrado y no hace falta revertir nada por esta causa. (El
  // short-circuit de arriba ya filtró los HIT de caché — esto solo corre en un
  // MISS real, gratis o premium.)
  let areaScore: { score: number; tone: ScoreTone; drivers: AreaDriver[] };
  try {
    const input = profileToChartInput(profile, {});
    const natalChart = computeChart(input);
    const fixed: FixedBody[] = natalChart.bodies
      .filter((b) => WEATHER_BODIES.has(b.body))
      .map((b) => ({ key: b.body, longitude: b.longitude, speed: 0 }));
    areaScore = scoreAreaOverDates(area, input, fixed, sampleDates(period));
  } catch {
    return NextResponse.json({ error: "compute" }, { status: 500 });
  }

  const pr = await resolvePremiumReading(request, body.premium, resolveReadingProvider(parseModelOverride(body.modelOverride)));
  if (!pr.provider.available) {
    return NextResponse.json({ available: false }, { headers: { "x-aluna-premium": pr.headerValue } });
  }

  if (pr.headerValue !== "used") {
    // Premium pedido pero degradado (sin saldo/config) — o el "off" de
    // siempre en un MISS que ya pasó por el short-circuit de arriba: puede
    // existir una versión GRATIS ya cacheada de esta misma lectura.
    const cached = getCachedAreaReading(cacheKey);
    if (cached) {
      return NextResponse.json(
        { available: true, reading: cached.reading, tip: cached.tip },
        { headers: { "x-aluna-model": cached.model, "x-aluna-premium": pr.headerValue } },
      );
    }
  }

  const L = astroLabels(locale);
  const areaLabel = AREA_LABEL[locale][area];
  const toneWord = TONE_WORD[locale][areaScore.tone];
  const driverLines = areaScore.drivers
    .map(
      (d) =>
        `- ${L.bodies[d.transit] ?? d.transit} ${L.aspects[d.aspect] ?? d.aspect} ${YOUR[locale]} ${L.bodies[d.natal] ?? d.natal}`,
    )
    .join("\n");
  const userPrompt = buildUserPrompt(locale, areaLabel, areaScore.score, toneWord, driverLines);

  // Modo de voz (🌙/📚/🔭) al FINAL del system: los modos estudio/pro son un
  // bloque de anulación de la voz — última instrucción gana — que conserva
  // todas las reglas de datos/seguridad de arriba. Ver lib/reading/voices.ts.
  const system = applyVoiceMode(SYSTEM[locale], voiceMode, locale);

  const provider = pr.provider.provider;
  let text: string;
  try {
    // 1200 y no ~700: los modelos pensantes (Gemini 3.6) gastan parte del
    // presupuesto en razonar antes de emitir el JSON; con margen corto se quedan
    // sin tokens para la respuesta y la ruta devolvería bad_response.
    text = await provider.complete({ system, prompt: userPrompt, maxTokens: 1200 });
  } catch {
    // Regla de oro: esta ruta no streamea — si el proveedor lanza, la persona
    // no recibió NADA (a diferencia de las rutas con stream, acá no hay chunks
    // parciales ya entregados). Un spend premium real se revierte siempre
    // (refundIfEmpty es no-op si no hubo spend).
    await pr.refundIfEmpty();
    return NextResponse.json({ error: "upstream" }, { status: 502, headers: { "x-aluna-premium": pr.headerValue } });
  }

  const parsed = parseAreaReading(text);
  if (!parsed) {
    // Mismo razonamiento: JSON no parseable = cero contenido útil entregado.
    await pr.refundIfEmpty();
    return NextResponse.json({ error: "bad_response" }, { status: 502, headers: { "x-aluna-premium": pr.headerValue } });
  }

  // Mismo formato proveedor/modelo que las rutas de chat (el picker lo muestra).
  const modelUsed = `${provider.name}/${provider.model}`;
  if (pr.headerValue === "used") {
    // Premium: caché DURABLE (best-effort — si falla el guardado no rompe la
    // respuesta ya generada; ver comentario de getPremiumReadingCache arriba).
    const durable = getPremiumReadingCache();
    if (durable) {
      durable
        .set({
          key: premiumKey,
          kind: "area",
          locale,
          model: modelUsed,
          payload: { reading: parsed.reading, tip: parsed.tip, model: modelUsed } as unknown as Json,
        })
        .catch(() => {
          /* el guardado es best-effort; no rompe nada */
        });
    }
  } else {
    // Gratis ("off"/"fallback"): el Map efímero de siempre, como antes de esta task.
    setCachedAreaReading(cacheKey, { reading: parsed.reading, tip: parsed.tip, model: modelUsed });
  }

  return NextResponse.json(
    { available: true, reading: parsed.reading, tip: parsed.tip },
    { headers: { "x-aluna-model": modelUsed, "x-aluna-premium": pr.headerValue } },
  );
}
