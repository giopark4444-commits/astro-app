import { describe, expect, it } from "vitest";
import { TAROT_DECK } from "../deck";
import { mulberry32, shuffleDeck, drawCards } from "../shuffle";

describe("shuffle", () => {
  it("misma semilla → mismo orden; semillas distintas → órdenes distintos", () => {
    const a = shuffleDeck(mulberry32(42)).map((c) => c.id);
    const b = shuffleDeck(mulberry32(42)).map((c) => c.id);
    const c = shuffleDeck(mulberry32(43)).map((c) => c.id);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });
  it("permutación completa: 78 cartas, ninguna perdida, TAROT_DECK intacto", () => {
    const before = TAROT_DECK.map((c) => c.id).join(",");
    const s = shuffleDeck(mulberry32(7));
    expect(new Set(s.map((c) => c.id)).size).toBe(78);
    expect(TAROT_DECK.map((c) => c.id).join(",")).toBe(before);
  });
  it("drawCards: count cartas sin repetir, invertidas deterministas por semilla", () => {
    const d = drawCards(10, mulberry32(11));
    expect(d).toHaveLength(10);
    expect(new Set(d.map((x) => x.card.id)).size).toBe(10);
    expect(d.map((x) => x.reversed)).toEqual(drawCards(10, mulberry32(11)).map((x) => x.reversed));
  });
  it("reversals:false → todas derechas; con reversals, ~50% en muestra grande", () => {
    expect(drawCards(78, mulberry32(3), { reversals: false }).every((x) => !x.reversed)).toBe(true);
    const n = drawCards(78, mulberry32(5)).filter((x) => x.reversed).length;
    expect(n).toBeGreaterThan(20); expect(n).toBeLessThan(58);
  });
});
