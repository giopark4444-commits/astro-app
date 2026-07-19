// apps/web/lib/chat-context.ts
// SERVER-only. Arma el contexto que Aluna lee en el chat, POR BLOQUE y POR LENTE:
// solo se incluyen las disciplinas activas (astros / números / pilares / tarot) más
// una línea de enfoque que le pide apoyarse ÚNICAMENTE en ellas. Extraído del
// `buildContext` monolítico que vivía en /api/chat/route.ts para que sea testeable en
// aislado; los bloques de astros y números quedan BYTE-EQUIVALENTES a la prosa previa
// (se extrajeron, no se reescribieron). Ba Zi y Tarot son adiciones nuevas al consejo.
import type { computeChart } from "@aluna/ephemeris";
import {
  computeNumerology,
  signOfLongitude,
  composeBaziReading,
  cardById,
  HEAVENLY_STEMS,
  EARTHLY_BRANCHES,
  TAROT_CARDS_ES,
  TAROT_CARDS_EN,
  type Pillar,
} from "@aluna/core";
import { astroLabels } from "@/lib/content/astrology-labels";
import { computeBaziNatal, type BaziNatalProfile } from "@/lib/timeline/bazi-natal";

export type Locale = "es" | "en";

/** Las cuatro lentes/palancas de enfoque del chat. Las 3 primeras son la base
 *  (siempre disponibles); tarot es opt-in y solo aporta bloque si hay carta. */
export const LENSES = ["astros", "numeros", "pilares", "tarot"] as const;
export type Lens = (typeof LENSES)[number];
/** Default cuando el cliente no manda lentes: las 3 base (sin tarot). */
export const BASE_LENSES: Lens[] = ["astros", "numeros", "pilares"];
/** Orden canónico de concatenación de bloques y de la lista de disciplinas. */
const LENS_ORDER: Lens[] = ["astros", "numeros", "pilares", "tarot"];

export interface TarotCardRef {
  id: string;
  reversed: boolean;
}

/** Resuelve las lentes del body: valida contra LENSES, dedupe en orden canónico,
 *  y default a las 3 base si viene vacío o ausente. */
export function resolveLenses(raw: unknown): Lens[] {
  if (!Array.isArray(raw)) return [...BASE_LENSES];
  const valid = new Set(raw.filter((l): l is Lens => typeof l === "string" && (LENSES as readonly string[]).includes(l)));
  const ordered = LENS_ORDER.filter((l) => valid.has(l));
  return ordered.length ? ordered : [...BASE_LENSES];
}

/** Parsea/valida `tarotCard` del body: `{id, reversed}` con id ∈ mazo (cardById).
 *  Devuelve undefined si falta o el id no existe. */
export function parseTarotCard(raw: unknown): TarotCardRef | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const id = String((raw as { id?: unknown }).id ?? "");
  if (!id || !cardById(id)) return undefined;
  return { id, reversed: (raw as { reversed?: unknown }).reversed === true };
}

/** Perfil mínimo que necesita el contexto: datos de carta (Ba Zi) + nombre/género. */
export interface ChatContextProfile extends BaziNatalProfile {
  name: string;
  gender: string;
}

type Chart = ReturnType<typeof computeChart>;
type Numerology = ReturnType<typeof computeNumerology>;

const MAIN_BODIES = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];

const mod = (n: number, m: number) => ((n % m) + m) % m;

// --- Nombres ES/EN de dominio Ba Zi (mismos que usa /api/bazi-reading). ---
const ELEMENT_NAME: Record<Locale, Record<string, string>> = {
  es: { wood: "Madera", fire: "Fuego", earth: "Tierra", metal: "Metal", water: "Agua" },
  en: { wood: "Wood", fire: "Fire", earth: "Earth", metal: "Metal", water: "Water" },
};
const ANIMAL_NAME: Record<Locale, Record<string, string>> = {
  es: {
    rat: "Rata", ox: "Buey", tiger: "Tigre", rabbit: "Conejo", dragon: "Dragón", snake: "Serpiente",
    horse: "Caballo", goat: "Cabra", monkey: "Mono", rooster: "Gallo", dog: "Perro", pig: "Cerdo",
  },
  en: {
    rat: "Rat", ox: "Ox", tiger: "Tiger", rabbit: "Rabbit", dragon: "Dragon", snake: "Snake",
    horse: "Horse", goat: "Goat", monkey: "Monkey", rooster: "Rooster", dog: "Dog", pig: "Pig",
  },
};
const POLARITY_NAME: Record<Locale, Record<"yin" | "yang", string>> = {
  es: { yin: "yin", yang: "yang" },
  en: { yin: "Yin", yang: "Yang" },
};
const POS_NAME: Record<Locale, { year: string; month: string; day: string; hour: string }> = {
  es: { year: "Año", month: "Mes", day: "Día", hour: "Hora" },
  en: { year: "Year", month: "Month", day: "Day", hour: "Hour" },
};

/** Nombre de cada disciplina en la línea de enfoque. */
const DISCIPLINE: Record<Locale, Record<Lens, string>> = {
  es: { astros: "Astrología", numeros: "Numerología", pilares: "Cuatro Pilares (Ba Zi)", tarot: "Tarot" },
  en: { astros: "Astrology", numeros: "Numerology", pilares: "Four Pillars (Ba Zi)", tarot: "Tarot" },
};

/** Une una lista con coma y "y"/"and" antes del último (voz natural). */
function joinList(items: string[], locale: Locale): string {
  if (items.length <= 1) return items.join("");
  const head = items.slice(0, -1).join(", ");
  return `${head} ${locale === "en" ? "and" : "y"} ${items[items.length - 1]}`;
}

/**
 * Bloque "Carta natal — …" (astrología). BYTE-EQUIVALENTE al que producía el
 * `buildContext` monolítico: no se reescribe su prosa, solo se extrae.
 */
export function buildAstrosBlock(chart: Chart, locale: Locale): string {
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
  return locale === "en"
    ? `Birth chart — Ascendant ${L.signs[asc]}, Midheaven ${L.signs[mc]}. ${placements}. Patterns: ${patterns}.`
    : `Carta natal — Ascendente ${L.signs[asc]}, Medio Cielo ${L.signs[mc]}. ${placements}. Patrones: ${patterns}.`;
}

/**
 * Bloque "Numerología — …". BYTE-EQUIVALENTE al que producía el `buildContext`
 * monolítico.
 */
export function buildNumerosBlock(numerology: Numerology, locale: Locale): string {
  const c = numerology.core;
  const num =
    locale === "en"
      ? `Life Path ${c.lifePath.value}, Expression ${c.expression.value}, Soul Urge ${c.soulUrge.value}, Personality ${c.personality.value}, Maturity ${c.maturity.value}`
      : `Camino de Vida ${c.lifePath.value}, Expresión ${c.expression.value}, Anhelo del Alma ${c.soulUrge.value}, Personalidad ${c.personality.value}, Madurez ${c.maturity.value}`;
  return locale === "en" ? `Numerology — ${num}.` : `Numerología — ${num}.`;
}

/** Tronco (elemento + polaridad) / rama (animal) de un pilar, en el idioma pedido. */
function pillarDesc(p: Pillar, locale: Locale): string {
  const stem = HEAVENLY_STEMS[mod(p.stem, 10)]!;
  const branch = EARTHLY_BRANCHES[mod(p.branch, 12)]!;
  const el = ELEMENT_NAME[locale][stem.element]!;
  const pol = POLARITY_NAME[locale][stem.yin ? "yin" : "yang"];
  const animal = ANIMAL_NAME[locale][branch.animal] ?? branch.animal;
  return `${el} ${pol} / ${animal}`;
}

/**
 * Bloque "Cuatro Pilares (Ba Zi) — …": pilares por posición (tronco/rama), Maestro
 * del Día y la esencia narrativa de `composeBaziReading`. ADICIÓN nueva al consejo.
 * Server-only: `computeBaziNatal` usa efemérides nativas para la longitud solar.
 */
export function buildPilaresBlock(profile: BaziNatalProfile, locale: Locale): string {
  const natal = computeBaziNatal(profile);
  const pillars = { year: natal.year, month: natal.month, day: natal.day, hour: natal.hour };
  const reading = composeBaziReading(pillars, locale);
  const dm = HEAVENLY_STEMS[mod(natal.day.stem, 10)]!;
  const dmLine = `${ELEMENT_NAME[locale][dm.element]!} ${POLARITY_NAME[locale][dm.yin ? "yin" : "yang"]}`;
  const P = POS_NAME[locale];
  const hourDesc = natal.hour
    ? pillarDesc(natal.hour, locale)
    : locale === "en"
      ? "unknown"
      : "desconocida";
  const positions = [
    `${P.year} ${pillarDesc(natal.year, locale)}`,
    `${P.month} ${pillarDesc(natal.month, locale)}`,
    `${P.day} ${pillarDesc(natal.day, locale)}`,
    `${P.hour} ${hourDesc}`,
  ].join("; ");
  return locale === "en"
    ? `Four Pillars (Ba Zi) — ${positions}. Day Master: ${dmLine}. ${reading.essence}`
    : `Cuatro Pilares (Ba Zi) — ${positions}. Maestro del Día: ${dmLine}. ${reading.essence}`;
}

/**
 * Bloque "Tarot — …" a partir de `{id, reversed}`: nombre, palabras clave y el
 * significado (sendero evolutivo) al derecho o invertido. Devuelve "" si el id no
 * tiene contenido (el llamador ya validó el id contra el mazo).
 */
export function buildTarotBlock(card: TarotCardRef, locale: Locale): string {
  const content = (locale === "en" ? TAROT_CARDS_EN : TAROT_CARDS_ES)[card.id];
  if (!content) return "";
  const orientation = card.reversed
    ? locale === "en" ? "reversed" : "invertida"
    : locale === "en" ? "upright" : "al derecho";
  const meaning = card.reversed ? content.reversed.path : content.upright.path;
  const keywords = content.keywords.join(", ");
  return locale === "en"
    ? `Tarot — Card: ${content.name} (${orientation}). Keywords: ${keywords}. Meaning: ${meaning}`
    : `Tarot — Carta: ${content.name} (${orientation}). Palabras clave: ${keywords}. Significado: ${meaning}`;
}

export interface FocusedContextArgs {
  profile: ChatContextProfile;
  chart?: Chart | undefined;
  numerology?: Numerology | undefined;
  lenses: Lens[];
  tarotCard?: TarotCardRef | undefined;
  locale: Locale;
}

/**
 * Contexto enfocado: encabeza con "DATOS DE <name>" y concatena SOLO los bloques de
 * las lentes activas, en orden canónico. Tarot solo si hay carta. Cuando astros y
 * números están ambos activos, el resultado es byte-equivalente al `buildContext`
 * previo salvo por los bloques nuevos (Ba Zi/Tarot) añadidos al final.
 */
export function buildFocusedContext(args: FocusedContextArgs): string {
  const { profile, chart, numerology, lenses, tarotCard, locale } = args;
  const active = new Set(lenses);
  const header =
    locale === "en"
      ? `DATA FOR ${profile.name} (gender: ${profile.gender}):`
      : `DATOS DE ${profile.name} (género: ${profile.gender}):`;
  const blocks: string[] = [];
  for (const lens of LENS_ORDER) {
    if (!active.has(lens)) continue;
    if (lens === "astros" && chart) blocks.push(buildAstrosBlock(chart, locale));
    else if (lens === "numeros" && numerology) blocks.push(buildNumerosBlock(numerology, locale));
    else if (lens === "pilares") blocks.push(buildPilaresBlock(profile, locale));
    else if (lens === "tarot" && tarotCard) {
      const t = buildTarotBlock(tarotCard, locale);
      if (t) blocks.push(t);
    }
  }
  return [header, ...blocks].join("\n");
}

/**
 * Línea de enfoque que se AÑADE al system: "Aconseja apoyándote ÚNICAMENTE en:
 * <disciplinas activas>. No introduzcas las demás." Tarot solo entra en la lista si
 * hay carta (sin carta no hay nada de tarot que leer).
 */
export function focusLine(lenses: Lens[], tarotCard: TarotCardRef | undefined, locale: Locale): string {
  const active = new Set(lenses);
  const names = LENS_ORDER
    .filter((l) => active.has(l))
    .filter((l) => l !== "tarot" || !!tarotCard)
    .map((l) => DISCIPLINE[locale][l]);
  const list = joinList(names, locale);
  return locale === "en"
    ? `Advise drawing ONLY on: ${list}. Do not bring in the others.`
    : `Aconseja apoyándote ÚNICAMENTE en: ${list}. No introduzcas las demás.`;
}
