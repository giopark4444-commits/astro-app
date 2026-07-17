/**
 * Resolver central de URLs de imagen de carta/mazo. Puro, sin I/O.
 *
 * Hoy solo el mazo "rws" (Rider-Waite-Smith) está activo; `rwsCtx(base)`
 * reproduce byte a byte las URLs hardcodeadas históricas:
 *   web:    base=""       -> "/tarot/rws/{id}.webp"
 *   móvil:  base=apiUrl() -> "{apiUrl()}/tarot/rws/{id}.webp"
 *
 * El mazo custom se cablea en una tarea posterior; esta interfaz ya lo
 * contempla para no tener que volver a tocar los ~24 call sites.
 */
export interface DeckAssetCtx {
  /** web: ""; móvil: apiUrl(). Prefijo para las URLs del mazo rws (fallback). */
  base: string;
  activeDeck: "rws" | "custom";
  /** ids de carta cubiertos por el mazo custom del usuario. */
  customCardIds?: ReadonlySet<string>;
  /** URL base (hasta la carpeta del usuario en Storage) para las cartas custom. */
  customBase?: string;
  /** URL del dorso custom, o null/undefined para usar el dorso rws. */
  customBack?: string | null;
}

export function cardImageUrl(cardId: string, ctx: DeckAssetCtx): string {
  if (ctx.activeDeck === "custom" && ctx.customCardIds?.has(cardId) && ctx.customBase) {
    return `${ctx.customBase}/${cardId}.webp`;
  }
  return `${ctx.base}/tarot/rws/${cardId}.webp`;
}

export function cardBackUrl(ctx: DeckAssetCtx): string {
  if (ctx.activeDeck === "custom" && ctx.customBack) {
    return ctx.customBack;
  }
  return `${ctx.base}/tarot/rws/back.webp`;
}

export function rwsCtx(base: string): DeckAssetCtx {
  return { base, activeDeck: "rws" };
}

/**
 * Shape mínimo del manifiesto GET /api/tarot/deck que necesita el resolver
 * (subset de lo que devuelve la ruta / `DeckManifest` en apps/mobile) — no
 * importamos el tipo completo de la ruta para no acoplar @aluna/core a Next.
 */
export interface DeckManifestLike {
  available: boolean;
  active?: boolean;
  cardIds?: readonly string[];
  cardBase?: string | null;
  backUrl?: string | null;
}

/**
 * Traduce el manifiesto del mazo (Task 4/7) a un `DeckAssetCtx` puro y
 * testeable, sin I/O. Latente (`available:false`), inactivo (`active:false`)
 * o activo-sin-contenido (sin `cardIds` o sin `cardBase`) siempre caen a
 * `rwsCtx(base)` — no-regresión: mismas URLs que hoy. Solo con contenido real
 * arma el ctx custom.
 */
export function deckCtxFromManifest(
  manifest: DeckManifestLike | null | undefined,
  base: string,
): DeckAssetCtx {
  if (!manifest?.available || !manifest.active) return rwsCtx(base);
  const cardIds = manifest.cardIds ?? [];
  if (cardIds.length === 0 || !manifest.cardBase) return rwsCtx(base);
  return {
    base,
    activeDeck: "custom",
    customCardIds: new Set(cardIds),
    customBase: manifest.cardBase,
    customBack: manifest.backUrl ?? null,
  };
}
