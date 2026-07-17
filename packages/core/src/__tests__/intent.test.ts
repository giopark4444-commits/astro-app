// packages/core/src/__tests__/intent.test.ts
import { describe, it, expect } from "vitest";
import { parseIntent, orderAreasByFocus, INTENT_GOALS } from "../intent";

describe("parseIntent", () => {
  it("acepta un intent válido y descarta basura", () => {
    const raw = {
      goals: ["self", "nope", "bonds"], goalNote: "  algo  ",
      focus: ["love", "invalid"], relationship: "single", heartNote: "  el corazón  ",
      useInAI: true, answeredAt: "2026-07-16T00:00:00Z", extra: 1,
    };
    expect(parseIntent(raw)).toEqual({
      goals: ["self", "bonds"], goalNote: "algo", focus: ["love"],
      relationship: "single", heartNote: "el corazón", useInAI: true, answeredAt: "2026-07-16T00:00:00Z",
    });
  });
  it("null si no hay señal (todo omitido o basura)", () => {
    expect(parseIntent(null)).toBeNull();
    expect(parseIntent({ goals: [], focus: [] })).toBeNull();
    expect(parseIntent("x")).toBeNull();
  });
  it("heartNote sola cuenta como señal (no null) y se recorta", () => {
    const p = parseIntent({ goals: [], focus: [], heartNote: "  hola  " });
    expect(p).not.toBeNull();
    expect(p?.heartNote).toBe("hola");
  });
  it("heartNote vacía/basura se omite", () => {
    const p1 = parseIntent({ goals: ["self"], focus: [], heartNote: "   " });
    expect(p1 && "heartNote" in p1).toBe(false);
    const p2 = parseIntent({ goals: ["self"], focus: [], heartNote: 42 });
    expect(p2 && "heartNote" in p2).toBe(false);
  });
  it("useInAI default true si falta, answeredAt default ''", () => {
    const p = parseIntent({ goals: ["self"], focus: [] });
    expect(p?.useInAI).toBe(true);
  });
});

describe("orderAreasByFocus", () => {
  const items = (["love", "money", "work", "health", "mood", "luck"] as const)
    .map((area) => ({ area, score: 50 }));
  it("pone el foco primero, estable, sin duplicar", () => {
    const out = orderAreasByFocus(items, ["work", "love"]);
    expect(out.map((i) => i.area)).toEqual(["work", "love", "money", "health", "mood", "luck"]);
  });
  it("foco vacío = orden original intacto", () => {
    expect(orderAreasByFocus(items, [])).toEqual(items);
  });
  it("ignora áreas de foco que no están en items", () => {
    const out = orderAreasByFocus(items.slice(0, 2), ["luck", "money"]);
    expect(out.map((i) => i.area)).toEqual(["money", "love"]);
  });
});

describe("INTENT_GOALS", () => {
  it("las 7 metas del spec", () => {
    expect(INTENT_GOALS).toEqual(["self", "bonds", "purpose", "future", "spirituality", "others", "decisions"]);
  });
});
