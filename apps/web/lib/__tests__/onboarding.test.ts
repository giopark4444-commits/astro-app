import { describe, it, expect } from "vitest";
import {
  answersToInsert,
  isStepComplete,
  buildSteps,
  draftToIntent,
  EMPTY_INTENT_DRAFT,
  type OnboardingAnswers,
  type IntentDraft,
} from "../onboarding";

const PLACE = { name: "Quito", country: "Ecuador", latitude: -0.23, longitude: -78.52, timeZone: "America/Guayaquil" };

const FULL: OnboardingAnswers = {
  name: "Gio", birthDate: "1984-02-05", birthTime: "09:00", timeKnown: true, place: PLACE, gender: "masculine",
};

describe("isStepComplete", () => {
  it("valida cada paso", () => {
    expect(isStepComplete("name", { name: "" })).toBe(false);
    expect(isStepComplete("name", { name: "Gio" })).toBe(true);
    expect(isStepComplete("date", { birthDate: "1984-02-05" })).toBe(true);
    expect(isStepComplete("date", { birthDate: "" })).toBe(false);
    expect(isStepComplete("time", { timeKnown: false })).toBe(true);
    expect(isStepComplete("time", { timeKnown: true, birthTime: "09:00" })).toBe(true);
    expect(isStepComplete("time", { timeKnown: true, birthTime: "" })).toBe(false);
    expect(isStepComplete("place", { place: PLACE })).toBe(true);
    expect(isStepComplete("place", {})).toBe(false);
    expect(isStepComplete("gender", { gender: "neutral" })).toBe(true);
  });
});

describe("answersToInsert", () => {
  it("mapea respuestas completas a la fila de birth_profiles", () => {
    const row = answersToInsert(FULL, "user-1");
    expect(row).toEqual({
      user_id: "user-1", name: "Gio", birth_date: "1984-02-05", birth_time: "09:00",
      time_known: true, place_name: "Quito, Ecuador", latitude: -0.23, longitude: -78.52,
      time_zone: "America/Guayaquil", gender: "masculine",
    });
  });
  it("hora desconocida -> birth_time null + time_known false", () => {
    const row = answersToInsert({ ...FULL, timeKnown: false, birthTime: "" }, "user-1");
    expect(row.birth_time).toBeNull();
    expect(row.time_known).toBe(false);
  });
});

describe("buildSteps", () => {
  it("sin goals no incluye affirm", () => {
    expect(buildSteps(EMPTY_INTENT_DRAFT)).toEqual([
      "goals", "focus", "relationship", "name", "date", "time", "place", "gender",
    ]);
  });

  it("con goals incluye affirm", () => {
    const d: IntentDraft = { ...EMPTY_INTENT_DRAFT, goals: ["self"] };
    expect(buildSteps(d)).toEqual([
      "goals", "affirm", "focus", "relationship", "name", "date", "time", "place", "gender",
    ]);
  });
});

describe("isStepComplete — pasos de intención", () => {
  it("los 4 pasos de intención siempre están completos", () => {
    expect(isStepComplete("goals", {})).toBe(true);
    expect(isStepComplete("affirm", {})).toBe(true);
    expect(isStepComplete("focus", {})).toBe(true);
    expect(isStepComplete("relationship", {})).toBe(true);
  });
});

describe("draftToIntent", () => {
  const NOW = "2026-07-16T00:00:00.000Z";

  it("null cuando todo quedó omitido", () => {
    expect(draftToIntent(EMPTY_INTENT_DRAFT, NOW)).toBeNull();
  });

  it("arma el UserIntent con useInAI true y answeredAt", () => {
    const d: IntentDraft = { goals: ["self"], goalNote: " x ", focus: ["love"], relationship: "single", heartNote: " y " };
    expect(draftToIntent(d, NOW)).toEqual({
      goals: ["self"], goalNote: "x", focus: ["love"], relationship: "single", heartNote: "y", useInAI: true, answeredAt: NOW,
    });
  });

  it("goalNote vacía no viaja", () => {
    const d: IntentDraft = { goals: ["self"], goalNote: "  ", focus: [], relationship: null, heartNote: "" };
    const i = draftToIntent(d, NOW);
    expect(i?.goalNote).toBeUndefined();
  });

  it("heartNote vacía no viaja", () => {
    const d: IntentDraft = { goals: ["self"], goalNote: "", focus: [], relationship: null, heartNote: "   " };
    const i = draftToIntent(d, NOW);
    expect(i?.heartNote).toBeUndefined();
  });

  it("heartNote se recorta y viaja", () => {
    const d: IntentDraft = { goals: [], goalNote: "", focus: [], relationship: null, heartNote: "  hola  " };
    expect(draftToIntent(d, NOW)?.heartNote).toBe("hola");
  });
});
