import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { computeChart, setEphePath } from "@aluna/ephemeris";
import { computeNumerology, signOfLongitude } from "@aluna/core";
import { authenticateRoute } from "@/lib/supabase/route-auth";
import { profileToChartInput } from "@/lib/chart";
import { profileToNumerologyInput } from "@/lib/numerology";
import { astroLabels } from "@/lib/content/astrology-labels";
import { resolveReadingProvider } from "@/lib/reading/provider";
import { parseModelOverride } from "@/lib/reading/model-catalog";
import { parseVoiceMode, applyVoiceMode } from "@/lib/reading/voices";
import { readingSystem, readingPrompt, parsePalmReading } from "@/lib/palm/prompts";
import { parsePalmFeatures, type PalmFeatures } from "@/lib/palm/schema";

// Etapa 2 de la lectura de mano: la VOZ. Recibe el inventario de rasgos (1 o 2
// manos, extraído por /api/palm-analysis de la foto real) + el perfil, y
// escribe la lectura por secciones ANCLADA al canon quiromántico y cruzada con
// la carta natal (puente astral). Los 3 modos de voz aplican: el modo 🔭 pro
// convierte esto en el informe técnico completo para profesionales.
//
// Sin caché de servidor: la lectura vive en el dispositivo (localStorage del
// cliente) — el inventario viene de una foto única y no debe persistir aquí.

export const runtime = "nodejs";

setEphePath(path.join(process.cwd(), "..", "..", "packages", "ephemeris", "ephe"));

const MAIN_BODIES = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];

function buildNatalSummary(
  profile: { name: string; birth_date: string },
  chart: ReturnType<typeof computeChart>,
  numerology: ReturnType<typeof computeNumerology>,
  locale: "es" | "en",
): string {
  const L = astroLabels(locale);
  const asc = signOfLongitude(chart.houses.ascendant).sign;
  const placements = chart.bodies
    .filter((b) => MAIN_BODIES.includes(b.body))
    .map((b) => `${L.bodies[b.body]} ${L.signs[b.sign]}`)
    .join(", ");
  const c = numerology.core;
  return locale === "en"
    ? `${profile.name} — Ascendant ${L.signs[asc]}. ${placements}. Life Path ${c.lifePath.value}.`
    : `${profile.name} — Ascendente ${L.signs[asc]}. ${placements}. Camino de Vida ${c.lifePath.value}.`;
}

/** Re-valida un inventario que viene del cliente (ya pasó por palm-analysis,
 *  pero el body es input no confiable: mismo saneo tolerante). */
function revalidate(raw: unknown): PalmFeatures | null {
  if (!raw || typeof raw !== "object") return null;
  return parsePalmFeatures(JSON.stringify(raw));
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
  const profileId = typeof body.profileId === "string" && body.profileId ? body.profileId : null;

  const handsRaw = (body.hands ?? {}) as Record<string, unknown>;
  const dominante = revalidate(handsRaw.dominante);
  const pasiva = revalidate(handsRaw.pasiva);
  if (!dominante && !pasiva) {
    return NextResponse.json({ available: false, error: "bad_request" }, { status: 400 });
  }
  const hands: { dominante?: PalmFeatures; pasiva?: PalmFeatures } = {};
  if (dominante) hands.dominante = dominante;
  if (pasiva) hands.pasiva = pasiva;

  const { supabase, user } = await authenticateRoute(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const voiceMode = parseVoiceMode(body.voiceMode);
  // 150s y no los 60s por defecto: la lectura de mano es la generación one-shot
  // más larga de la app (7 secciones con cuerpo) y el free tier congestionado
  // la cortaba justo al minuto.
  const resolved = resolveReadingProvider(parseModelOverride(body.modelOverride), { timeoutMs: 150_000 });
  if (!resolved.available) {
    return NextResponse.json({ available: false });
  }

  // Puente astral: mejor con carta, pero la mano se lee igual sin ella (el
  // prompt lo maneja: omite la sección invitando a completar el perfil).
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
        natalSummary = undefined;
      }
    }
  }

  const system = applyVoiceMode(readingSystem(locale), voiceMode, locale);
  const prompt = readingPrompt(locale, hands, natalSummary);

  let text: string;
  try {
    text = await resolved.provider.complete({ system, prompt, maxTokens: 4000 });
  } catch {
    return NextResponse.json({ error: "upstream" }, { status: 502 });
  }

  const sections = parsePalmReading(text);
  if (!sections) {
    return NextResponse.json({ error: "bad_response" }, { status: 502 });
  }

  return NextResponse.json(
    { available: true, sections, hasNatal: Boolean(natalSummary) },
    { headers: { "x-aluna-model": `${resolved.provider.name}/${resolved.provider.model}` } },
  );
}
