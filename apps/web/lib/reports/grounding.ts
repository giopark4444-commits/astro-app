// apps/web/lib/reports/grounding.ts
// Reúne el material fuente que ANCLA el informe natal en el corpus escrito a
// mano (apps/web/lib/content/astrology-readings-{es,en}.ts): así el modelo
// TEJE sobre lecturas ya validadas en vez de inventar posiciones desde cero.
// Puro: solo lee el ChartResult y compone texto, sin red ni Supabase.

import { signOfLongitude, type ChartResult, type BodyPosition } from "@aluna/core";
import { composeBodyReading as composeEs } from "../content/astrology-readings-es";
import { composeBodyReading as composeEn } from "../content/astrology-readings-en";
import type { AstroLabelMaps } from "../content/astrology-labels";

// Planetas personales que se suman al trío Sol/Luna/Ascendente: dan textura
// (comunicación, amor, impulso) sin inflar demasiado el material fuente.
const PERSONAL_BODIES = ["mercury", "venus", "mars"] as const;

// Cuántos aspectos "más ajustados" (menor orbe = más activos) se citan.
const GROUNDING_ASPECT_COUNT = 3;

function composerFor(locale: string) {
  return locale === "en" ? composeEn : composeEs;
}

function findBody(chart: ChartResult, key: string): BodyPosition | undefined {
  return chart.bodies.find((b) => b.body === key);
}

/** Une essence/flow/shadow de una lectura ya compuesta en un bloque legible. */
function bodyBlock(label: string, reading: { essence: string; flow: string; shadow: string }): string {
  return `${label}\n- ${reading.essence}\n- ${reading.flow}\n- ${reading.shadow}`;
}

/**
 * Selecciona las posiciones clave de la carta natal (Sol, Luna, Ascendente,
 * planetas personales y los aspectos más ajustados), compone su lectura con
 * `composeBodyReading` del corpus existente, y devuelve el material fuente
 * como texto plano listo para embeber en el prompt.
 */
export function gatherNatalGrounding(chart: ChartResult, labels: AstroLabelMaps, locale: string): string {
  const compose = composerFor(locale);
  const parts: string[] = [];

  const sun = findBody(chart, "sun");
  if (sun) {
    const reading = compose("sun", sun.sign, sun.house, sun.dignity);
    if (reading) parts.push(bodyBlock(labels.bodies.sun ?? "sun", reading));
  }

  const moon = findBody(chart, "moon");
  if (moon) {
    const reading = compose("moon", moon.sign, moon.house, moon.dignity);
    if (reading) parts.push(bodyBlock(labels.bodies.moon ?? "moon", reading));
  }

  // El Ascendente NO es un "body" en chart.bodies[]: su signo sale de
  // houses.ascendant (longitud 0-360). No hay tema en composeBodyReading para
  // "ascendant", así que aquí solo dejamos constancia del signo (sin
  // essence/flow/shadow inventados).
  const asc = signOfLongitude(chart.houses.ascendant);
  const ascSignName = labels.signs[asc.sign] ?? asc.sign;
  parts.push(
    locale === "en" ? `Ascendant in ${ascSignName}.` : `Ascendente en ${ascSignName}.`,
  );

  for (const key of PERSONAL_BODIES) {
    const body = findBody(chart, key);
    if (!body) continue;
    const reading = compose(key, body.sign, body.house, body.dignity);
    if (reading) parts.push(bodyBlock(labels.bodies[key] ?? key, reading));
  }

  const tightest = [...chart.aspects].sort((a, b) => a.orb - b.orb).slice(0, GROUNDING_ASPECT_COUNT);
  if (tightest.length > 0) {
    const header = locale === "en" ? "Tightest aspects:" : "Aspectos más ajustados:";
    const aspectLines = tightest.map((asp) => {
      const a = labels.bodies[asp.a] ?? asp.a;
      const b = labels.bodies[asp.b] ?? asp.b;
      const name = labels.aspects[asp.aspect] ?? asp.aspect;
      return `- ${a} ${name} ${b} (orbe ${asp.orb.toFixed(1)}°)`;
    });
    parts.push([header, ...aspectLines].join("\n"));
  }

  if (chart.patterns.length > 0) {
    const header = locale === "en" ? "Patterns:" : "Patrones:";
    const patternLines = chart.patterns.map((p) => {
      const name = labels.patterns[p.type] ?? p.type;
      const bodies = p.bodies.map((k) => labels.bodies[k] ?? k).join(", ");
      return `- ${name}: ${bodies}`;
    });
    parts.push([header, ...patternLines].join("\n"));
  }

  parts.push(
    locale === "en"
      ? `Dominant element: ${labels.elements[chart.distribution.dominantElement]}. Dominant modality: ${labels.modalities[chart.distribution.dominantModality]}.`
      : `Elemento dominante: ${labels.elements[chart.distribution.dominantElement]}. Modalidad dominante: ${labels.modalities[chart.distribution.dominantModality]}.`,
  );

  return parts.join("\n\n");
}
