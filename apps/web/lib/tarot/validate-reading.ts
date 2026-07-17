import { TAROT_SPREADS, TAROT_DECKS, cardById } from "@aluna/core";

// Validación PURA del payload de una lectura de tarot antes de tocar la BD.
// T2 solo expone daily y three: celtic-cross vive en el motor (@aluna/core)
// pero se rechaza aquí hasta T3, donde se abrirá con gate Plus.
const ALLOWED_SPREAD_IDS = new Set(["daily", "three"]);

const MAX_QUESTION_LEN = 280;

export interface TarotReadingCardInput {
  cardId: string;
  reversed: boolean;
  position: string;
}

export interface ValidatedTarotReading {
  spread: "daily" | "three";
  question?: string;
  cards: TarotReadingCardInput[];
  deck: string;
}

export type ValidateReadingResult =
  | { ok: true; value: ValidatedTarotReading }
  | { ok: false; error: string };

/**
 * Valida un payload arbitrario (unknown, viene de request.json()) contra el
 * motor de tarot: spread soportado en T2, conteo de cartas exacto para ese
 * spread, cada cardId existe en el mazo, las posiciones son las del spread sin
 * repetirse, question ≤280 y el mazo pedido está habilitado. Nunca confía en
 * el cliente: todo se re-verifica server-side contra @aluna/core.
 */
export function validateReadingPayload(body: unknown): ValidateReadingResult {
  if (typeof body !== "object" || body === null) return { ok: false, error: "bad_request" };
  const b = body as Record<string, unknown>;

  const spreadId = typeof b.spread === "string" ? b.spread : "";
  if (!ALLOWED_SPREAD_IDS.has(spreadId)) return { ok: false, error: "invalid_spread" };
  const spread = TAROT_SPREADS.find((s) => s.id === spreadId);
  if (!spread) return { ok: false, error: "invalid_spread" };

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

  if (!Array.isArray(b.cards) || b.cards.length !== spread.cardCount) {
    return { ok: false, error: "invalid_cards" };
  }

  const validPositions = new Set(spread.positions.map((p) => p.key));
  const seenPositions = new Set<string>();
  const cards: TarotReadingCardInput[] = [];
  for (const rawCard of b.cards) {
    if (typeof rawCard !== "object" || rawCard === null) return { ok: false, error: "invalid_cards" };
    const c = rawCard as Record<string, unknown>;

    const cardId = typeof c.cardId === "string" ? c.cardId : "";
    if (!cardById(cardId)) return { ok: false, error: "invalid_cards" };

    const position = typeof c.position === "string" ? c.position : "";
    if (!validPositions.has(position) || seenPositions.has(position)) return { ok: false, error: "invalid_cards" };
    seenPositions.add(position);

    const reversed = typeof c.reversed === "boolean" ? c.reversed : false;
    cards.push({ cardId, reversed, position });
  }

  const value: ValidatedTarotReading =
    question === undefined
      ? { spread: spreadId as "daily" | "three", cards, deck: deckId }
      : { spread: spreadId as "daily" | "three", question, cards, deck: deckId };
  return { ok: true, value };
}
