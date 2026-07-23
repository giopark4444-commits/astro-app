import {
  TAROT_CARDS_ES,
  TAROT_CARDS_EN,
  READING_POSITION_LABELS_ES,
  READING_POSITION_LABELS_EN,
  type TarotCardContent,
} from "@aluna/core";

// Contexto PURO del chat de la tirada (Tarot T3). Arma el bloque de texto que
// la ruta /api/tarot/reading-chat inyecta en el system prompt: la tirada
// (posición → carta → orientación → jumper), el CANON de cada carta tal cual
// vive en @aluna/core (essence + el ámbito `path` según orientación + bridge
// — la ÚNICA fuente de significado que el chat puede usar, nunca inventa
// fuera de esto) y, si hay perfil, un resumen compacto del cielo natal (la
// ruta lo computa igual que /api/chat y lo pasa ya formateado — esta función
// no toca BD ni efemérides). Sin efectos secundarios: fácil de testear y
// reusable desde móvil si algún día comparte lógica de contexto.

export interface TarotChatCardInput {
  cardId: string;
  reversed: boolean;
  position: string;
  jumper?: boolean;
}

// T4: las 11 tiradas del motor (@aluna/core) ya no caben en un dict local
// limitado a daily/three/celtic — reusa el mismo catálogo que alimenta
// composeReadingProse (content-es.ts/content-en.ts), así cualquier tirada
// nueva queda cubierta sin tocar este archivo.
const POSITION_LABELS: Record<"es" | "en", Record<string, string>> = {
  es: READING_POSITION_LABELS_ES,
  en: READING_POSITION_LABELS_EN,
};

// Tirada libre (free-1..free-N, T3): sin rol fijo, se presentan por orden.
const FREE_ORDINALS: Record<"es" | "en", string[]> = {
  es: [
    "primera carta",
    "segunda carta",
    "tercera carta",
    "cuarta carta",
    "quinta carta",
    "sexta carta",
    "séptima carta",
    "octava carta",
    "novena carta",
    "décima carta",
  ],
  en: [
    "first card",
    "second card",
    "third card",
    "fourth card",
    "fifth card",
    "sixth card",
    "seventh card",
    "eighth card",
    "ninth card",
    "tenth card",
  ],
};

function freeIndex(position: string): number | null {
  const m = /^free-(\d+)$/.exec(position);
  if (!m) return null;
  return Number.parseInt(m[1]!, 10);
}

function jumperIndex(position: string): number | null {
  const m = /^jumper-(\d+)$/.exec(position);
  if (!m) return null;
  return Number.parseInt(m[1]!, 10);
}

function positionLabel(locale: "es" | "en", position: string): string {
  const known = POSITION_LABELS[locale][position];
  if (known) return known;
  const free = freeIndex(position);
  if (free !== null) {
    return FREE_ORDINALS[locale][free - 1] ?? (locale === "en" ? `card ${free}` : `carta ${free}`);
  }
  const jumper = jumperIndex(position);
  if (jumper !== null) {
    return locale === "en" ? `jumper card ${jumper}` : `carta que saltó ${jumper}`;
  }
  return position;
}

const T = {
  es: {
    spreadHeading: (spreadId: string) => `TIRADA (${spreadId}):`,
    upright: "derecha",
    reversed: "invertida",
    jumperTag: " — SALTÓ DEL MAZO",
    jumperHeading: "CARTAS QUE SALTARON DEL MAZO (mensaje enfático, léelas aparte):",
    canonHeading: "CANON DE CADA CARTA (única fuente de significado — nunca inventes fuera de esto):",
    essenceLabel: "esencia",
    ambitLabel: "ámbito (camino de alma)",
    bridgeLabel: "puente astrológico",
    questionHeading: (question: string) => `PREGUNTA DE LA PERSONA: "${question}"`,
    natalHeading: (summary: string) => `CIELO NATAL (resumen): ${summary}`,
  },
  en: {
    spreadHeading: (spreadId: string) => `SPREAD (${spreadId}):`,
    upright: "upright",
    reversed: "reversed",
    jumperTag: " — JUMPED FROM THE DECK",
    jumperHeading: "CARDS THAT JUMPED FROM THE DECK (an emphatic message, read them apart):",
    canonHeading: "CANON FOR EACH CARD (the only source of meaning — never invent beyond this):",
    essenceLabel: "essence",
    ambitLabel: "ambit (soul path)",
    bridgeLabel: "astrological bridge",
    questionHeading: (question: string) => `PERSON'S QUESTION: "${question}"`,
    natalHeading: (summary: string) => `BIRTH CHART (summary): ${summary}`,
  },
} as const;

function canonBlock(locale: "es" | "en", card: TarotCardContent, reversed: boolean): string {
  const t = T[locale];
  const ambit = reversed ? card.reversed.path : card.upright.path;
  return `${card.name} (${reversed ? t.reversed : t.upright}) — ${t.essenceLabel}: ${card.essence} ${t.ambitLabel}: ${ambit} ${t.bridgeLabel}: ${card.bridge}`;
}

/**
 * Arma el bloque de contexto del chat de una tirada de tarot. PURO: no toca
 * BD ni efemérides — `natalSummary` ya viene formateado por la ruta (mismo
 * patrón que `buildContext` de /api/chat, versión compacta) o `undefined` si
 * la persona no tiene perfil.
 */
export function buildTarotContext(
  locale: "es" | "en",
  spreadId: string,
  cards: TarotChatCardInput[],
  question?: string,
  natalSummary?: string,
): string {
  const t = T[locale];
  const dict = locale === "en" ? TAROT_CARDS_EN : TAROT_CARDS_ES;

  const spreadCards = cards.filter((c) => !c.jumper);
  const jumperCards = cards.filter((c) => c.jumper);

  const spreadLines = spreadCards.map((c) => {
    const card = dict[c.cardId];
    const name = card?.name ?? c.cardId;
    return `- ${positionLabel(locale, c.position)}: ${name} (${c.reversed ? t.reversed : t.upright})`;
  });

  const jumperLines = jumperCards.map((c) => {
    const card = dict[c.cardId];
    const name = card?.name ?? c.cardId;
    return `- ${positionLabel(locale, c.position)}: ${name} (${c.reversed ? t.reversed : t.upright})${t.jumperTag}`;
  });

  const canonLines = cards
    .map((c) => {
      const card = dict[c.cardId];
      return card ? canonBlock(locale, card, c.reversed) : null;
    })
    .filter((line): line is string => line !== null);

  const sections: string[] = [t.spreadHeading(spreadId), spreadLines.join("\n")];

  if (jumperLines.length > 0) {
    sections.push(t.jumperHeading, jumperLines.join("\n"));
  }

  sections.push(t.canonHeading, canonLines.join("\n\n"));

  if (question) sections.push(t.questionHeading(question));
  if (natalSummary) sections.push(t.natalHeading(natalSummary));

  return sections.join("\n\n");
}
