import { describe, it, expect } from "vitest";
import {
  DEFAULT_QUICK_QUESTIONS,
  parseQuickQuestions,
  normalizeForSave,
  localeKey,
  PAGES,
  PER_PAGE,
  MAX_LEN,
} from "../quick-questions";

describe("quick-questions defaults", () => {
  it("hay 2 páginas de 6 en ES y EN", () => {
    for (const loc of ["es", "en"] as const) {
      expect(DEFAULT_QUICK_QUESTIONS[loc]).toHaveLength(PAGES);
      for (const page of DEFAULT_QUICK_QUESTIONS[loc]) {
        expect(page).toHaveLength(PER_PAGE);
        for (const q of page) expect(q.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("localeKey mapea variantes de locale", () => {
    expect(localeKey("es")).toBe("es");
    expect(localeKey("es-CO")).toBe("es");
    expect(localeKey("en")).toBe("en");
    expect(localeKey("en-US")).toBe("en");
    expect(localeKey("xx")).toBe("es"); // fallback
  });
});

describe("parseQuickQuestions", () => {
  it("null/undefined → defaults del locale", () => {
    expect(parseQuickQuestions(null, "es")).toEqual(DEFAULT_QUICK_QUESTIONS.es);
    expect(parseQuickQuestions(undefined, "en")).toEqual(DEFAULT_QUICK_QUESTIONS.en);
  });

  it("basura (número, string) → defaults", () => {
    expect(parseQuickQuestions(42, "es")).toEqual(DEFAULT_QUICK_QUESTIONS.es);
    expect(parseQuickQuestions("hola", "es")).toEqual(DEFAULT_QUICK_QUESTIONS.es);
  });

  it("2×6 válido en {pages} se conserva (recortado)", () => {
    const custom = {
      pages: [
        ["a1", "a2", "a3", "a4", "a5", "a6"],
        ["b1", "b2", "b3", "b4", "b5", "b6"],
      ],
    };
    expect(parseQuickQuestions(custom, "es")).toEqual(custom.pages);
  });

  it("acepta también un array plano de páginas (sin envoltura {pages})", () => {
    const pages = [
      ["a1", "a2", "a3", "a4", "a5", "a6"],
      ["b1", "b2", "b3", "b4", "b5", "b6"],
    ];
    expect(parseQuickQuestions(pages, "es")).toEqual(pages);
  });

  it("huecos (vacío, no-string, faltante) se rellenan con el default de esa posición", () => {
    const raw = { pages: [["", 5, "c3"], ["d1"]] };
    const out = parseQuickQuestions(raw, "es");
    expect(out).toHaveLength(2);
    expect(out[0]).toHaveLength(6);
    expect(out[1]).toHaveLength(6);
    expect(out[0]![0]).toBe(DEFAULT_QUICK_QUESTIONS.es[0]![0]); // "" → default
    expect(out[0]![1]).toBe(DEFAULT_QUICK_QUESTIONS.es[0]![1]); // 5 → default
    expect(out[0]![2]).toBe("c3"); // se conserva
    expect(out[1]![0]).toBe("d1");
    expect(out[1]![1]).toBe(DEFAULT_QUICK_QUESTIONS.es[1]![1]); // faltante → default
  });

  it("recorta a MAX_LEN", () => {
    const long = "x".repeat(MAX_LEN + 50);
    const out = parseQuickQuestions({ pages: [[long]] }, "es");
    expect(out[0]![0]).toHaveLength(MAX_LEN);
  });
});

describe("normalizeForSave", () => {
  it("devuelve { pages } normalizado a 2×6", () => {
    const out = normalizeForSave([["solo-una"]], "es");
    expect(out.pages).toHaveLength(2);
    expect(out.pages[0]).toHaveLength(6);
    expect(out.pages[0]![0]).toBe("solo-una");
    expect(out.pages[0]![1]).toBe(DEFAULT_QUICK_QUESTIONS.es[0]![1]);
  });
});
