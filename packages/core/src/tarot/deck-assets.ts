/**
 * Resolver central de URLs de imagen de carta/mazo. Puro, sin I/O.
 *
 * `rwsCtx(base)` reproduce byte a byte las URLs hardcodeadas históricas:
 *   web:    base=""       -> "/tarot/rws/{id}.webp"
 *   móvil:  base=apiUrl() -> "{apiUrl()}/tarot/rws/{id}.webp"
 *
 * Mazos preset (Tarot T5): además de "rws", el usuario puede elegir cualquiera
 * de PRESET_DECKS — mismos 78 ids de carta, distinta carpeta bajo
 * `public/tarot/{deck}/`. `presetCtx(base, deck)` arma el ctx correspondiente.
 *
 * El mazo custom (Tarot T4) sigue teniendo la precedencia más alta: si el
 * usuario subió una carta propia, esa carta gana. Para las cartas NO
 * cubiertas por el custom (o cuando no hay custom activo), el orden de
 * resolución es custom -> preset elegido -> rws. `presetDeck` es el canal
 * para comunicar ese preset de "segunda capa" cuando `activeDeck === "custom"`
 * (cuando `activeDeck` ya ES un preset, no hace falta duplicarlo ahí).
 */
export const PRESET_DECKS = ["rws", "aluna-noche", "marseille", "visconti"] as const;
export type PresetDeckId = (typeof PRESET_DECKS)[number];

export interface DeckAssetCtx {
  /** web: ""; móvil: apiUrl(). Prefijo para las URLs de assets estáticos. */
  base: string;
  activeDeck: "rws" | "custom" | PresetDeckId;
  /** ids de carta cubiertos por el mazo custom del usuario. */
  customCardIds?: ReadonlySet<string>;
  /** URL base (hasta la carpeta del usuario en Storage) para las cartas custom. */
  customBase?: string;
  /** URL del dorso custom, o null/undefined para usar el dorso rws. */
  customBack?: string | null;
  /**
   * Preset elegido como fallback bajo el mazo custom (solo relevante cuando
   * `activeDeck === "custom"`): las cartas/dorso que el custom no cubre caen
   * acá antes de caer a rws. Ausente u "rws" => fallback directo a rws (sin
   * diferencia observable, así que se omite para no ensuciar el ctx).
   */
  presetDeck?: PresetDeckId;
}

/** Preset "de segunda capa" bajo un ctx: el propio activeDeck si ya es un
 * preset, o `presetDeck` cuando activeDeck === "custom". */
function fallbackPreset(ctx: DeckAssetCtx): PresetDeckId | undefined {
  if (ctx.activeDeck === "custom") return ctx.presetDeck;
  if (ctx.activeDeck === "rws") return undefined;
  return ctx.activeDeck;
}

export function cardImageUrl(cardId: string, ctx: DeckAssetCtx): string {
  if (ctx.activeDeck === "custom" && ctx.customCardIds?.has(cardId) && ctx.customBase) {
    return `${ctx.customBase}/${cardId}.webp`;
  }
  const preset = fallbackPreset(ctx);
  if (preset) {
    return `${ctx.base}/tarot/${preset}/${cardId}.webp`;
  }
  return `${ctx.base}/tarot/rws/${cardId}.webp`;
}

export function cardBackUrl(ctx: DeckAssetCtx): string {
  if (ctx.activeDeck === "custom" && ctx.customBack) {
    return ctx.customBack;
  }
  const preset = fallbackPreset(ctx);
  if (preset) {
    return `${ctx.base}/tarot/${preset}/back.webp`;
  }
  return `${ctx.base}/tarot/rws/back.webp`;
}

export function rwsCtx(base: string): DeckAssetCtx {
  return { base, activeDeck: "rws" };
}

/** Ctx puro para un mazo preset (sin custom). `presetCtx(base, "rws")` es
 * equivalente en forma y comportamiento a `rwsCtx(base)`. */
export function presetCtx(base: string, deck: PresetDeckId): DeckAssetCtx {
  return { base, activeDeck: deck };
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
 * o activo-sin-NADA (ni cartas custom ni reverso) caen a `rwsCtx(base)` — o,
 * si se pasó `presetDeck` (Tarot T5, mazo preset elegido en Ajustes), a
 * `presetCtx(base, presetDeck)`. Sin 3er argumento, comportamiento 100%
 * idéntico al de antes de T5 (no-regresión).
 *
 * El mazo custom es PARCIAL: basta ≥1 carta subida O un reverso propio (spec §2,
 * y ambas UIs activan con `cardIds || back`). Un mazo "solo reverso" arma un ctx
 * custom con `customCardIds` vacío → cada carta cae al preset (o RWS) por el
 * resolver, pero el dorso propio SÍ se usa.
 */
export function deckCtxFromManifest(
  manifest: DeckManifestLike | null | undefined,
  base: string,
  presetDeck?: PresetDeckId,
): DeckAssetCtx {
  const fallback = () => (presetDeck && presetDeck !== "rws" ? presetCtx(base, presetDeck) : rwsCtx(base));
  if (!manifest?.available || !manifest.active) return fallback();
  const cardIds = manifest.cardIds ?? [];
  const back = manifest.backUrl ?? null;
  const hasCards = cardIds.length > 0 && !!manifest.cardBase;
  if (!hasCards && !back) return fallback();
  return {
    base,
    activeDeck: "custom",
    customCardIds: new Set(hasCards ? cardIds : []),
    ...(hasCards ? { customBase: manifest.cardBase as string } : {}),
    customBack: back,
    ...(presetDeck && presetDeck !== "rws" ? { presetDeck } : {}),
  };
}
