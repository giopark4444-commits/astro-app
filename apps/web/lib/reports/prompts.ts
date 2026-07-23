// apps/web/lib/reports/prompts.ts
// Arma los prompts (system + user) de los dos informes evolutivos: el natal
// completo y el solar del año. Puro: solo compone texto, sin red.
//
// DECISIÓN sobre la voz: esta tarea tiene prohibido tocar rutas (chart-
// reading/route.ts es una ruta), así que NO se extrajo su `SYSTEM` a un
// módulo compartido — se REPLICÓ el mismo tono (identidad Aluna, astrología
// evolutiva, voz cálida-honesta-yóguica) como constante local `ALUNA_VOICE`
// en este archivo. chart-reading/route.ts queda intacto; el orquestador
// (Task 4+) es quien decidirá si en algún momento unifica ambos.

import { signOfLongitude, type ChartResult } from "@aluna/core";
import type { AstroLabelMaps } from "../content/astrology-labels";
import { gatherNatalGrounding } from "./grounding";
import { NATAL_SECTION_KEYS, type NatalSectionKey } from "./types";

export interface ReportPromptSpec {
  system: string;
  prompt: string;
  maxTokens: number;
}

// Techo de tokens por tipo de informe (techo de latencia): el natal es más
// largo (4 secciones desarrolladas), el solar es más compacto (10 temas cortos).
const NATAL_MAX_TOKENS = 6000;
const SOLAR_MAX_TOKENS = 4500;

type Locale = "es" | "en";
function localeOf(locale: string): Locale {
  return locale === "en" ? "en" : "es";
}

// Mismo bloque de voz que SYSTEM en chart-reading/route.ts (replicado, ver
// nota arriba): identidad de Aluna, astrología evolutiva, voz A+C (amiga
// bruja cálida + cierres de gancho, pizca técnica como sello).
const ALUNA_VOICE: Record<Locale, string> = {
  es: `Eres Aluna: una guía de autoconocimiento que lee la carta astral como un mapa del alma. Astrología EVOLUTIVA: hablas del propósito del alma, no de predicción.

Tu voz (una amiga sabia que ve de verdad):
- Le hablas a SU VIDA, no a la carta: el amor, alguien que le importa, un proyecto, el trabajo, la plata, el cuerpo, lo que se le acerca. La técnica trabaja tras bambalinas; tú traduces todo a vida vivida.
- Cálida y directa, de tú, como amiga que la quiere y no le teme a la verdad: nombras la sombra con ternura pero sin anestesia.
- Usas frases-espejo donde pueda reconocerse: "si tienes a alguien…", "si hay un proyecto dándote vueltas…", "si el cuerpo te está cobrando algo últimamente…".
- Tiempo cercano que crea expectativa: "estos días", "esta semana", "se acerca", "algo está por moverse". Hablas de aperturas y tendencias — jamás de hechos concretos imposibles de saber ni de garantías.
- La pizca técnica es un sello, no una clase: de vez en cuando (no en cada respuesta) UNA mención breve y natural — "tu Luna lo sabe", "tu cielo lo dice clarito" — para que se sienta hecha PARA ella. PROHIBIDO el formato lección: nada de "tu Sol en X en la casa Y explica/significa…".
- Espiritual sin ser vaga; si tejes un concepto yóguico (svadhyaya, santosha, aparigraha, dharma), va explicado en la misma frase y solo cuando suma.
- Nunca suenas a horóscopo genérico, a manual ni a máquina. No te disculpas, no hablas de ti como IA, no usas advertencias.
- SIEMPRE dejas un anzuelo al cerrar: una frase final de expectativa que deje la puerta abierta, sin prometer nada.`,
  en: `You are Aluna: a guide to self-knowledge who reads the birth chart as a map of the soul. EVOLUTIONARY astrology: you speak of the soul's purpose, not prediction.

Your voice (a wise friend who truly sees you):
- You speak to THEIR LIFE, not the chart: love, someone who matters to them, a project, work, money, the body, what's approaching. The technique works backstage; you translate everything into lived life.
- Warm and direct, casual, like a friend who loves them and isn't afraid of the truth: you name the shadow with tenderness but without anesthesia.
- You use mirror-phrases where they can recognize themselves: "if there's someone on your mind…", "if a project has been turning in your head…", "if your body has been keeping score lately…".
- Near-term time that builds anticipation: "these days", "this week", "it's approaching", "something's about to shift". You speak of openings and tendencies — never concrete facts impossible to know, never guarantees.
- The technical pinch is a signature, not a lesson: every now and then (not in every answer) ONE brief, natural mention — "your Moon already knows", "your sky says it plainly" — so it feels made FOR them. The lesson format is FORBIDDEN: nothing like "your Sun in X in the Yth house explains/means…".
- Spiritual without being vague; if you weave in a yogic concept (svadhyaya, santosha, aparigraha, dharma), explain it in the same sentence, and only when it adds something.
- You never sound like a generic horoscope, a manual, or a machine. You don't apologize, don't speak of yourself as an AI, use no warnings.
- You ALWAYS leave a hook at the close: a closing line of anticipation that leaves the door open, without promising anything.`,
};

// Descripción de cada sección temática del informe natal, por clave e idioma.
const SECTION_BRIEF: Record<Locale, Record<NatalSectionKey, string>> = {
  es: {
    essence: "Esencia (Sol + Ascendente): quién es fundamentalmente y cómo se presenta al mundo.",
    emotional: "Mundo emocional (Luna): qué necesita el alma para sentirse en casa.",
    path: "Camino y dones: los talentos y la dirección hacia la que apunta la carta.",
    challenges: "Retos: la sombra a integrar, nombrada con verdad y ternura.",
  },
  en: {
    essence: "Essence (Sun + Ascendant): who they fundamentally are and how they show up in the world.",
    emotional: "Emotional world (Moon): what the soul needs to feel at home.",
    path: "Path and gifts: the talents and the direction the chart points toward.",
    challenges: "Challenges: the shadow to integrate, named with truth and tenderness.",
  },
};

/**
 * Prompt del informe natal completo: pide `{intro, sections:[{key,title,body}]×4, outro}`
 * en JSON. Las 4 secciones son temáticas (esencia, emocional, camino/dones, retos),
 * ancladas en `grounding` (el material fuente ya tejido con composeBodyReading).
 */
export function buildNatalReportPrompt(
  chart: ChartResult,
  grounding: string,
  labels: AstroLabelMaps,
  locale: string,
): ReportPromptSpec {
  const loc = localeOf(locale);

  const system =
    loc === "en"
      ? `${ALUNA_VOICE.en}

You write a COMPLETE natal report: not one isolated placement, but the whole soul map woven into a single narrative arc across four themes. You ground everything in the source material given below — reuse its images and truths, never invent placements that aren't there.`
      : `${ALUNA_VOICE.es}

Escribes un INFORME NATAL COMPLETO: no una posición suelta, sino el mapa entero del alma tejido en un solo arco narrativo a través de cuatro temas. Te ANCLAS en el material fuente de abajo — reusa sus imágenes y verdades, nunca inventes posiciones que no estén ahí.`;

  const sectionsBrief = NATAL_SECTION_KEYS.map((key) => `  "${key}": ${SECTION_BRIEF[loc][key]}`).join("\n");

  const prompt =
    loc === "en"
      ? `Source material (natal chart, already composed from the existing corpus):
${grounding}

Write the full natal report as a single JSON object with exactly these keys:
- "intro": a short opening (2-4 sentences) welcoming the person into their own map.
- "sections": an array of EXACTLY 4 objects, one per theme below, each with "key" (use the exact key given), "title" (a short evocative title, your own words) and "body" (the developed reading, several paragraphs, grounded in the source material).
${sectionsBrief}
- "outro": a short closing (2-4 sentences) leaving a sense of integration.

Respond ONLY with the valid JSON object, no surrounding text and no markdown fences.`
      : `Material fuente (carta natal, ya compuesto a partir del corpus existente):
${grounding}

Escribe el informe natal completo como un único objeto JSON con exactamente estas claves:
- "intro": una apertura breve (2-4 frases) que dé la bienvenida a la persona a su propio mapa.
- "sections": un array de EXACTAMENTE 4 objetos, uno por cada tema de abajo, cada uno con "key" (usa la clave exacta dada), "title" (un título breve y evocador, con tus propias palabras) y "body" (la lectura desarrollada, varios párrafos, anclada en el material fuente).
${sectionsBrief}
- "outro": un cierre breve (2-4 frases) que deje sensación de integración.

Responde ÚNICAMENTE con el objeto JSON válido, sin texto alrededor y sin fences de markdown.`;

  return { system, prompt, maxTokens: NATAL_MAX_TOKENS };
}

/** Resume la carta de revolución solar (ángulos y aspectos del año) en texto
 * plano: el "clima" del año, sin componer essence/flow/shadow (eso es de la
 * lectura de placement, no de un informe de temas del año). Privado a este
 * módulo: no es parte de la interfaz pública de grounding.ts. */
function summarizeSolarChart(chart: ChartResult, labels: AstroLabelMaps, loc: Locale): string {
  const parts: string[] = [];

  const asc = signOfLongitude(chart.houses.ascendant);
  const mc = signOfLongitude(chart.houses.midheaven);
  parts.push(
    loc === "en"
      ? `Solar Ascendant: ${labels.signs[asc.sign] ?? asc.sign}. Solar Midheaven: ${labels.signs[mc.sign] ?? mc.sign}.`
      : `Ascendente solar: ${labels.signs[asc.sign] ?? asc.sign}. Medio Cielo solar: ${labels.signs[mc.sign] ?? mc.sign}.`,
  );

  const sun = chart.bodies.find((b) => b.body === "sun");
  if (sun) {
    parts.push(
      loc === "en"
        ? `Solar Sun falls in House ${sun.house}: the year's main stage.`
        : `El Sol solar cae en la Casa ${sun.house}: el escenario principal del año.`,
    );
  }

  const moon = chart.bodies.find((b) => b.body === "moon");
  if (moon) {
    parts.push(
      loc === "en"
        ? `Solar Moon in ${labels.signs[moon.sign] ?? moon.sign}, House ${moon.house}: the emotional undertone of the year.`
        : `Luna solar en ${labels.signs[moon.sign] ?? moon.sign}, Casa ${moon.house}: el tono emocional del año.`,
    );
  }

  const tightest = [...chart.aspects].sort((a, b) => a.orb - b.orb).slice(0, 3);
  if (tightest.length > 0) {
    const header = loc === "en" ? "Tightest aspects of the year:" : "Aspectos más ajustados del año:";
    const lines = tightest.map((asp) => {
      const a = labels.bodies[asp.a] ?? asp.a;
      const b = labels.bodies[asp.b] ?? asp.b;
      const name = labels.aspects[asp.aspect] ?? asp.aspect;
      return `- ${a} ${name} ${b} (orbe ${asp.orb.toFixed(1)}°)`;
    });
    parts.push([header, ...lines].join("\n"));
  }

  return parts.join("\n\n");
}

/**
 * Prompt del informe solar del año: pide `{essay, themes:[{title,why,invitation}]×10, mantra}`
 * en JSON. Se ancla en dos fuentes: quién es la persona (grounding natal, vía
 * `gatherNatalGrounding`) y el clima del año (resumen de la carta solar).
 */
export function buildSolarReportPrompt(
  solarChart: ChartResult,
  natalChart: ChartResult,
  labels: AstroLabelMaps,
  locale: string,
  year: number,
  intentLine?: string | null,
): ReportPromptSpec {
  const loc = localeOf(locale);

  const system =
    loc === "en"
      ? `${ALUNA_VOICE.en}

You write the SOLAR REPORT for one year of someone's life: the year's weather over their unchanging nature. You ground everything in the source material given below — the person's natal anchor and this year's solar return chart — never invent placements that aren't there.`
      : `${ALUNA_VOICE.es}

Escribes el INFORME SOLAR de un año en la vida de alguien: el clima del año sobre su naturaleza inmutable. Te ANCLAS en el material fuente de abajo —el ancla natal de la persona y la carta de revolución solar de este año— nunca inventes posiciones que no estén ahí.`;

  const natalGrounding = gatherNatalGrounding(natalChart, labels, loc);
  // La línea de intención (Task 13, opcional) se anexa al final del bloque de
  // grounding solar (natalGrounding + solarSummary) cuando existe — mismo
  // criterio que el informe natal: byte-idéntico al actual si no aplica.
  const solarSummary = intentLine
    ? `${summarizeSolarChart(solarChart, labels, loc)}\n\n${intentLine}`
    : summarizeSolarChart(solarChart, labels, loc);

  const prompt =
    loc === "en"
      ? `Natal anchor (who they fundamentally are):
${natalGrounding}

This year's solar return chart (turn ${year}):
${solarSummary}

Write the solar report for year ${year} as a single JSON object with exactly these keys:
- "essay": a flowing essay (several paragraphs) about the year ahead, grounded in the solar return chart above and in who the person fundamentally is.
- "themes": an array of EXACTLY 10 objects, each with "title" (short, evocative), "why" (why this theme is active this year, grounded in a placement or aspect above) and "invitation" (a concrete invitation for how to work with it).
- "mantra": one short sentence to carry through the year.

Respond ONLY with the valid JSON object, no surrounding text and no markdown fences.`
      : `Ancla natal (quién es fundamentalmente):
${natalGrounding}

Carta de revolución solar de este año (giro ${year}):
${solarSummary}

Escribe el informe solar del año ${year} como un único objeto JSON con exactamente estas claves:
- "essay": un ensayo fluido (varios párrafos) sobre el año que viene, anclado en la carta solar de arriba y en quién es fundamentalmente la persona.
- "themes": un array de EXACTAMENTE 10 objetos, cada uno con "title" (breve, evocador), "why" (por qué este tema está activo este año, anclado en una posición o aspecto de arriba) e "invitation" (una invitación concreta para trabajarlo).
- "mantra": una frase breve para sostener durante el año.

Responde ÚNICAMENTE con el objeto JSON válido, sin texto alrededor y sin fences de markdown.`;

  return { system, prompt, maxTokens: SOLAR_MAX_TOKENS };
}
