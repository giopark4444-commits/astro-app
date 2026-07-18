import sharp from "sharp";
import { TAROT_DECK, buildBackSvg, type BackConfig, type BackSymbol } from "@aluna/core";

const MAX_BYTES = 5_000_000;
const OK_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const VALID_SYMBOLS: readonly BackSymbol[] = ["enso", "star", "moon"];
const VALID_CARD_IDS: ReadonlySet<string> = new Set(TAROT_DECK.map((c) => c.id));

/** Ruta en el bucket `tarot-decks` para una carta del mazo custom. El primer
 * segmento SIEMPRE es el uid de la sesión verificada (RLS/convención de path),
 * nunca un valor recibido del cliente. Espejo de `avatarPath`. */
export function deckCardPath(userId: string, cardId: string): string {
  return `${userId}/${cardId}.webp`;
}

/** Ruta del reverso custom del usuario. */
export function deckBackPath(userId: string): string {
  return `${userId}/back.webp`;
}

export function validateDeckImage(file: { type: string; size: number }):
  { ok: true } | { ok: false; error: "type" | "size" } {
  if (!OK_TYPES.has(file.type)) return { ok: false, error: "type" };
  if (file.size > MAX_BYTES) return { ok: false, error: "size" };
  return { ok: true };
}

/** true si `cardId` es una de las 78 cartas del mazo Golden Dawn (@aluna/core). */
export function isValidCardId(cardId: string): boolean {
  return VALID_CARD_IDS.has(cardId);
}

/** Valida la config del editor de reverso: colores hex y symbol conocido.
 * Devuelve null si es inválida — el server nunca confía en el shape del cliente. */
export function validateBackConfig(raw: unknown): BackConfig | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { bg, border, symbol } = raw as Record<string, unknown>;
  if (typeof bg !== "string" || !HEX_RE.test(bg)) return null;
  if (typeof border !== "string" || !HEX_RE.test(border)) return null;
  if (typeof symbol !== "string" || !VALID_SYMBOLS.includes(symbol as BackSymbol)) return null;
  return { bg, border, symbol: symbol as BackSymbol };
}

/** Renderiza el SVG puro del reverso (buildBackSvg, @aluna/core) a webp. Único
 * punto de I/O de este módulo — el resto es puro/testeable sin mocks. */
export async function renderBackWebp(cfg: BackConfig): Promise<Buffer> {
  const svg = buildBackSvg(cfg);
  return sharp(Buffer.from(svg)).webp().toBuffer();
}
