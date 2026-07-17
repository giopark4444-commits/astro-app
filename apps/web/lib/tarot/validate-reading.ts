import { TAROT_SPREADS, TAROT_DECKS, cardById } from "@aluna/core";

// Validación PURA del payload de una lectura de tarot antes de tocar la BD.
// T3 suma la tirada 'free' (modo manual con mazo físico: el usuario compone su
// propia tirada de 1 a 10 cartas, positions "free-1".."free-N" consecutivas) y
// los "jumpers" (cartas que se salen del mazo al barajar; opcionales, hasta 3,
// positions "jumper-1".."jumper-M" consecutivas, con flag jumper:true) — estos
// últimos disponibles en cualquier spread (daily/three/free), no solo free.
// celtic-cross sigue vivo solo en el motor (@aluna/core): aquí se rechaza
// hasta que se abra con gate Plus.
const ALLOWED_SPREAD_IDS = new Set(["daily", "three", "free"]);

const MAX_QUESTION_LEN = 280;
const FREE_MIN_CARDS = 1;
const FREE_MAX_CARDS = 10;
const MAX_JUMPERS = 3;
const JUMPER_POSITION_RE = /^jumper-\d+$/;

export interface TarotReadingCardInput {
  cardId: string;
  reversed: boolean;
  position: string;
  jumper?: boolean;
}

export interface ValidatedTarotReading {
  spread: "daily" | "three" | "free";
  question?: string;
  cards: TarotReadingCardInput[];
  deck: string;
}

export type ValidateReadingResult =
  | { ok: true; value: ValidatedTarotReading }
  | { ok: false; error: string };

/**
 * Valida un payload arbitrario (unknown, viene de request.json()) contra el
 * motor de tarot: spread soportado (daily/three con plantilla fija, free con
 * 1-10 cartas libres), conteo de cartas correcto para ese spread, cada cardId
 * existe en el mazo y es único en TODO el conjunto (tirada + jumpers), las
 * positions son las esperadas sin repetirse, jumpers opcionales (máx 3,
 * consecutivos, flag jumper:true honesto), question ≤280 y el mazo pedido
 * está habilitado. Nunca confía en el cliente: todo se re-verifica
 * server-side contra @aluna/core.
 */
export function validateReadingPayload(body: unknown): ValidateReadingResult {
  if (typeof body !== "object" || body === null) return { ok: false, error: "bad_request" };
  const b = body as Record<string, unknown>;

  const spreadId = typeof b.spread === "string" ? b.spread : "";
  if (!ALLOWED_SPREAD_IDS.has(spreadId)) return { ok: false, error: "invalid_spread" };

  const deckId = typeof b.deck === "string" ? b.deck : "";
  const deckInfo = TAROT_DECKS.find((d) => d.id === deckId);
  if (!deckInfo || !deckInfo.enabled) return { ok: false, error: "invalid_deck" };

  let question: string | undefined;
  if (b.question !== undefined && b.question !== null) {
    if (typeof b.question !== "string" || b.question.length > MAX_QUESTION_LEN) {
      return { ok: false, error: "invalid_question" };
    }
    question = b.question;
  }

  if (!Array.isArray(b.cards)) return { ok: false, error: "invalid_cards" };

  // Separa cartas de la tirada de los jumpers: un jumper se identifica por su
  // position "jumper-N" (el flag jumper:true se re-verifica al parsear, nunca
  // se confía solo en él para clasificar).
  const mainRaw: unknown[] = [];
  const jumperRaw: unknown[] = [];
  for (const rawCard of b.cards) {
    if (typeof rawCard !== "object" || rawCard === null) return { ok: false, error: "invalid_cards" };
    const position =
      typeof (rawCard as Record<string, unknown>).position === "string"
        ? ((rawCard as Record<string, unknown>).position as string)
        : "";
    if (JUMPER_POSITION_RE.test(position)) jumperRaw.push(rawCard);
    else mainRaw.push(rawCard);
  }

  const seenCardIds = new Set<string>();

  // Parsea+valida una carta individual: cardId real y no repetido en TODO el
  // conjunto (tirada + jumpers), y su flag jumper coincide con el grupo al
  // que fue clasificada (la position ya lo hizo arriba; acá se exige que el
  // flag no mienta sobre lo que su position ya afirma).
  function parseCard(raw: unknown, expectJumper: boolean): TarotReadingCardInput | null {
    const c = raw as Record<string, unknown>;
    const cardId = typeof c.cardId === "string" ? c.cardId : "";
    if (!cardId || !cardById(cardId) || seenCardIds.has(cardId)) return null;
    if ((c.jumper === true) !== expectJumper) return null;
    const position = typeof c.position === "string" ? c.position : "";
    const reversed = typeof c.reversed === "boolean" ? c.reversed : false;
    seenCardIds.add(cardId);
    return expectJumper ? { cardId, reversed, position, jumper: true } : { cardId, reversed, position };
  }

  // Valida un grupo (tirada principal o jumpers) contra el set de positions
  // esperado: cada position debe estar en el set, sin repetirse.
  function parseGroup(
    raws: unknown[],
    expectedPositions: Set<string>,
    expectJumper: boolean,
  ): TarotReadingCardInput[] | null {
    const seenPositions = new Set<string>();
    const out: TarotReadingCardInput[] = [];
    for (const raw of raws) {
      const position =
        typeof (raw as Record<string, unknown>).position === "string"
          ? ((raw as Record<string, unknown>).position as string)
          : "";
      if (!expectedPositions.has(position) || seenPositions.has(position)) return null;
      seenPositions.add(position);
      const parsed = parseCard(raw, expectJumper);
      if (!parsed) return null;
      out.push(parsed);
    }
    return out;
  }

  let mainCards: TarotReadingCardInput[];
  if (spreadId === "free") {
    const count = mainRaw.length;
    if (count < FREE_MIN_CARDS || count > FREE_MAX_CARDS) return { ok: false, error: "invalid_cards" };
    const expected = new Set(Array.from({ length: count }, (_, i) => `free-${i + 1}`));
    const result = parseGroup(mainRaw, expected, false);
    if (!result) return { ok: false, error: "invalid_cards" };
    mainCards = result;
  } else {
    const spread = TAROT_SPREADS.find((s) => s.id === spreadId);
    if (!spread) return { ok: false, error: "invalid_spread" };
    if (mainRaw.length !== spread.cardCount) return { ok: false, error: "invalid_cards" };
    const expected = new Set(spread.positions.map((p) => p.key));
    const result = parseGroup(mainRaw, expected, false);
    if (!result) return { ok: false, error: "invalid_cards" };
    mainCards = result;
  }

  if (jumperRaw.length > MAX_JUMPERS) return { ok: false, error: "invalid_cards" };
  const expectedJumperPositions = new Set(Array.from({ length: jumperRaw.length }, (_, i) => `jumper-${i + 1}`));
  const jumperCards = parseGroup(jumperRaw, expectedJumperPositions, true);
  if (!jumperCards) return { ok: false, error: "invalid_cards" };

  const cards = [...mainCards, ...jumperCards];

  const value: ValidatedTarotReading =
    question === undefined
      ? { spread: spreadId as "daily" | "three" | "free", cards, deck: deckId }
      : { spread: spreadId as "daily" | "three" | "free", question, cards, deck: deckId };
  return { ok: true, value };
}
