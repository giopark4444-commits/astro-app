// apps/web/app/(app)/tarot/__tests__/selection.test.ts
import { describe, it, expect } from "vitest";
import { isMobileViewport } from "../selection";
import type { TarotSelection, SavedReadingLite } from "../selection";

describe("TarotSelection", () => {
  it("tipa los 3 kinds (daily, saved, card con from) y expone el viewport compartido", () => {
    const reading: SavedReadingLite = {
      id: "r1",
      spread: "three",
      question: "¿Qué necesito ver?",
      cards: [
        { cardId: "fool", reversed: false, position: "past" },
        { cardId: "wands-03", reversed: true, position: "present", jumper: false },
      ],
      createdAt: "2026-07-17T12:00:00.000Z",
    };

    const sels: TarotSelection[] = [
      { kind: "daily" },
      { kind: "saved", reading },
      { kind: "card", id: "fool", reversed: false },
      { kind: "card", id: "wands-03", reversed: true, from: { kind: "saved", reading } },
    ];
    expect(sels).toHaveLength(4);

    const orig = window.matchMedia;
    window.matchMedia = ((q: string) => ({ matches: false, media: q })) as never;
    expect(isMobileViewport()).toBe(false);
    window.matchMedia = orig;
  });
});
