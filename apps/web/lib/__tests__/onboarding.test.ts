import { describe, it, expect } from "vitest";
import { answersToInsert, isStepComplete, type OnboardingAnswers } from "../onboarding";

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
