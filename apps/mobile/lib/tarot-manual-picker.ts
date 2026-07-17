// Lógica PURA del selector manual (Tarot T3, espejo móvil de
// apps/web/app/(app)/tarot/manual-entry.tsx) — extraída para poder testearla
// en el entorno "node" de vitest, mismo criterio que
// lib/tarot-ceremony-machine.ts. La pantalla RN (components/tarot-manual-
// entry.tsx) es una cáscara de useState sobre estas funciones.
import { type TarotCard } from "@aluna/core";

export type ManualTemplate = "three" | "daily" | "free";

export interface PickedCard {
  cardId: string;
  reversed: boolean;
  position: string;
}

export const FREE_MIN = 1;
export const FREE_MAX = 10;
export const MAX_JUMPERS = 3;

export const SUIT_TABS = ["all", "major", "wands", "cups", "swords", "pentacles"] as const;
export type SuitTab = (typeof SUIT_TABS)[number];

/** Posiciones de la tirada principal, en orden de elección. */
export function positionsForTemplate(template: ManualTemplate, freeCount: number): string[] {
  if (template === "free") return Array.from({ length: freeCount }, (_, i) => `free-${i + 1}`);
  if (template === "daily") return ["day"];
  return ["past", "present", "future"];
}

export function cardMatchesSuit(card: TarotCard, suit: SuitTab): boolean {
  if (suit === "all") return true;
  if (suit === "major") return card.arcana === "major";
  return card.suit === suit;
}

/** IDs ya usados por la tirada principal Y los jumpers: sin duplicados cruzados. */
export function usedCardIds(main: PickedCard[], jumpers: PickedCard[]): Set<string> {
  return new Set([...main, ...jumpers].map((c) => c.cardId));
}

export function filterManualCandidates(
  deck: readonly TarotCard[],
  usedIds: Set<string>,
  suit: SuitTab,
  query: string,
  nameOf: (id: string) => string,
): TarotCard[] {
  const q = query.trim().toLowerCase();
  return deck.filter((card) => {
    if (usedIds.has(card.id)) return false;
    if (!cardMatchesSuit(card, suit)) return false;
    if (q === "") return true;
    return nameOf(card.id).toLowerCase().includes(q);
  });
}

export function addMainCard(main: PickedCard[], cardId: string, positions: string[]): PickedCard[] {
  if (main.length >= positions.length) return main;
  const position = positions[main.length]!;
  return [...main, { cardId, reversed: false, position }];
}

export function removeMainCard(main: PickedCard[], cardId: string, positions: string[]): PickedCard[] {
  const kept = main.filter((c) => c.cardId !== cardId);
  return kept.map((c, i) => ({ ...c, position: positions[i]! }));
}

export function toggleReversed(list: PickedCard[], cardId: string): PickedCard[] {
  return list.map((c) => (c.cardId === cardId ? { ...c, reversed: !c.reversed } : c));
}

export function addJumperCard(jumpers: PickedCard[], cardId: string): PickedCard[] {
  if (jumpers.length >= MAX_JUMPERS) return jumpers;
  return [...jumpers, { cardId, reversed: false, position: `jumper-${jumpers.length + 1}` }];
}

export function removeJumperCard(jumpers: PickedCard[], cardId: string): PickedCard[] {
  const kept = jumpers.filter((c) => c.cardId !== cardId);
  return kept.map((c, i) => ({ ...c, position: `jumper-${i + 1}` }));
}
