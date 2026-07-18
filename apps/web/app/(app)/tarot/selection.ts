// apps/web/app/(app)/tarot/selection.ts
// Estado unificado de selección del maestro-detalle de Tarot: TODO lo tocable
// (la carta del día, una lectura guardada del diario, una carta suelta dentro
// de una lectura) produce una TarotSelection; el panel derecho (desktop) o el
// bottom-sheet (móvil) la interpretan. Espejo del patrón de /carta, /pilares,
// /numeros y /horoscopo (serie lentes-detalle). Ver spec 2026-07-17.
//
// @aluna/core NO expone un tipo `CardId` dedicado: `TarotCard.id` está tipado
// como `string` plano (slug estable: "fool", "wands-03", "cups-queen"… — ver
// packages/core/src/tarot/types.ts). Se documenta acá en vez de importar un
// tipo inexistente.

// Subconjunto REAL de `TarotReadingRow`/`TarotReadingCard` (definidos en
// tarot-view.tsx) que consume el diario: `id`+`spread` para la etiqueta de la
// lista y el título del sheet (DIARY_SPREAD_KEY), `question` y `cards`
// (`cardId`/`reversed`/`position`/`jumper`) para reconstruir la prosa con
// `composeReadingProse` de `@aluna/core`, `createdAt` para la fecha en la
// lista. Deliberadamente SIN `user_id`/`profile_id`/`deck`/`notes` — el
// diario no los usa.
export type SavedReadingLite = {
  id: string;
  spread: string;
  question: string | null;
  cards: Array<{ cardId: string; reversed: boolean; position: string; jumper?: boolean }>;
  createdAt: string;
};

export type TarotSelection =
  | { kind: "daily" }
  | { kind: "saved"; reading: SavedReadingLite }
  | { kind: "card"; id: string; reversed: boolean; from?: TarotSelection | undefined };

export { isMobileViewport } from "@/lib/viewport";
