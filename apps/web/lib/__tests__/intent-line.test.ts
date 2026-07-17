import { describe, expect, it } from "vitest";
import type { UserIntent } from "@aluna/core";
import { buildIntentLine } from "../intent-line";

function intent(overrides: Partial<UserIntent> = {}): UserIntent {
  return {
    goals: [],
    focus: [],
    useInAI: true,
    answeredAt: "2026-07-16T00:00:00.000Z",
    ...overrides,
  };
}

describe("buildIntentLine", () => {
  it("returns null when there is no intent", () => {
    expect(buildIntentLine(null, "es")).toBeNull();
  });

  it("returns null when useInAI is false", () => {
    const i = intent({ goals: ["self"], focus: ["love"], useInAI: false });
    expect(buildIntentLine(i, "es")).toBeNull();
  });

  it("returns null when the intent has no content (goals/focus/relationship all empty)", () => {
    const i = intent({ goals: [], focus: [] });
    expect(buildIntentLine(i, "es")).toBeNull();
  });

  it("builds the complete ES line with goals + focus + relationship", () => {
    const i = intent({
      goals: ["self", "bonds"],
      focus: ["love", "money"],
      relationship: "partnered",
    });
    expect(buildIntentLine(i, "es")).toBe(
      "INTENCIÓN DE LA PERSONA (contexto, no lo cites literal): busca Conocerme en profundidad, Mis vínculos; foco actual: Amor, Dinero; corazón: En pareja.",
    );
  });

  it("builds the complete EN line with goals + focus + relationship", () => {
    const i = intent({
      goals: ["self", "bonds"],
      focus: ["love", "money"],
      relationship: "partnered",
    });
    expect(buildIntentLine(i, "en")).toBe(
      "THE PERSON'S INTENTION (context, don't quote it literally): seeking Know myself deeply, My bonds; current focus: Love, Money; heart: In a relationship.",
    );
  });

  it("omits goals and relationship parts when only focus is present", () => {
    const i = intent({ goals: [], focus: ["work"] });
    expect(buildIntentLine(i, "es")).toBe(
      "INTENCIÓN DE LA PERSONA (contexto, no lo cites literal): foco actual: Trabajo.",
    );
  });

  it("renders a new relationship status (situationship) in ES", () => {
    const i = intent({ goals: [], focus: [], relationship: "situationship" });
    expect(buildIntentLine(i, "es")).toBe(
      "INTENCIÓN DE LA PERSONA (contexto, no lo cites literal): corazón: Sin etiquetas.",
    );
  });

  it("renders a new relationship status (situationship) in EN", () => {
    const i = intent({ goals: [], focus: [], relationship: "situationship" });
    expect(buildIntentLine(i, "en")).toBe(
      "THE PERSON'S INTENTION (context, don't quote it literally): heart: Situationship.",
    );
  });
});
