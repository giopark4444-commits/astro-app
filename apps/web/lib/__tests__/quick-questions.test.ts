import { describe, it, expect } from "vitest";
import {
  DEFAULT_QUICK_QUESTIONS,
  parseQuickQuestions,
  normalizeForSave,
  localeKey,
  PAGES,
  PER_PAGE,
  MAX_PAGES,
  MAX_LEN,
  parseQuickQuestionsEnabled,
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

  it("recorta espacios de una string válida", () => {
    const out = parseQuickQuestions({ pages: [["  hola  "]] }, "es");
    expect(out[0]![0]).toBe("hola");
  });

  it("conserva una página extra (3+) con lo que el usuario escribió, padded a PER_PAGE", () => {
    const out = parseQuickQuestions({ pages: [[], [], ["extra 1", "extra 2"]] }, "es");
    expect(out).toHaveLength(3);
    expect(out[2]).toHaveLength(PER_PAGE);
    expect(out[2]![0]).toBe("extra 1");
    expect(out[2]![1]).toBe("extra 2");
    expect(out[2]![2]).toBe(""); // resto vacío, sin default
    // las 2 base siguen con sus defaults
    expect(out[0]).toEqual(DEFAULT_QUICK_QUESTIONS.es[0]);
  });

  it("descarta una página extra totalmente vacía", () => {
    const out = parseQuickQuestions({ pages: [[], [], ["", "", ""]] }, "es");
    expect(out).toHaveLength(2);
  });

  it("no pasa de MAX_PAGES páginas", () => {
    const one = ["q"];
    const out = parseQuickQuestions({ pages: [[], [], one, one, one, one, one, one] }, "es");
    expect(out).toHaveLength(MAX_PAGES);
  });
});

describe("normalizeForSave", () => {
  it("devuelve { pages } normalizado a 2×6", () => {
    const out = normalizeForSave([["solo-una"]], "es");
    expect(out.pages).toHaveLength(2);
    expect(out.pages[0]).toHaveLength(6);
    expect(out.pages[0]![0]).toBe("solo-una");
  });

  it("un slot faltante se guarda como '' (centinela de default), no como el texto default", () => {
    const out = normalizeForSave([["solo-una"]], "es");
    expect(out.pages[0]![1]).toBe("");
  });

  it("un slot idéntico al default del locale se guarda como '' (centinela)", () => {
    const withDefault = [[DEFAULT_QUICK_QUESTIONS.es[0]![0]!, "custom"]];
    const out = normalizeForSave(withDefault, "es");
    expect(out.pages[0]![0]).toBe("");
    expect(out.pages[0]![1]).toBe("custom");
  });

  it("conserva una página extra con contenido y descarta las extra vacías", () => {
    const out = normalizeForSave([[], [], ["mi extra"], ["", ""]], "es");
    expect(out.pages).toHaveLength(3); // 2 base + la extra con contenido; la vacía se descarta
    expect(out.pages[2]).toHaveLength(PER_PAGE);
    expect(out.pages[2]![0]).toBe("mi extra");
    expect(out.pages[2]![1]).toBe("");
  });

  it("no guarda más de MAX_PAGES páginas", () => {
    const one = ["q"];
    const out = normalizeForSave([[], [], one, one, one, one, one, one], "es");
    expect(out.pages).toHaveLength(MAX_PAGES);
  });
});

describe("parseQuickQuestionsEnabled", () => {
  it("por defecto true: null, array pelado, o { pages } sin la clave", () => {
    expect(parseQuickQuestionsEnabled(null)).toBe(true);
    expect(parseQuickQuestionsEnabled([["a"]])).toBe(true);
    expect(parseQuickQuestionsEnabled({ pages: [] })).toBe(true);
  });
  it("enabled:false explícito → false", () => {
    expect(parseQuickQuestionsEnabled({ enabled: false, pages: [] })).toBe(false);
  });
  it("enabled:true explícito → true", () => {
    expect(parseQuickQuestionsEnabled({ enabled: true, pages: [] })).toBe(true);
  });
});
