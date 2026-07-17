import type { GeocodeResult } from "./geocode";
import type { TablesInsert } from "@aluna/supabase";
import type { IntentGoal, LifeArea, RelationshipStatus, UserIntent } from "@aluna/core";

export type Gender = "feminine" | "masculine" | "neutral";

// Pasos de nacimiento (los 5 originales del onboarding web).
export type BirthStep = "name" | "date" | "time" | "place" | "gender";
export const STEPS: BirthStep[] = ["name", "date", "time", "place", "gender"];

// Pasos del cuestionario de intención — misma semántica que el móvil
// (apps/mobile/lib/intent.ts): "affirm" solo aparece si el usuario eligió
// al menos una meta, no tiene sentido afirmar un camino sobre metas vacías.
export type IntentStep = "goals" | "affirm" | "focus" | "relationship";

export type OnboardingStep = IntentStep | BirthStep;

// Draft local del cuestionario de intención mientras el usuario responde.
// Duplicación consciente de apps/mobile/lib/intent.ts (~15 líneas): web y
// móvil no comparten libs de app; lo compartible ya vive en core (parseIntent).
export interface IntentDraft {
  goals: IntentGoal[];
  goalNote: string;
  focus: LifeArea[];
  relationship: RelationshipStatus | null;
}

export const EMPTY_INTENT_DRAFT: IntentDraft = {
  goals: [],
  goalNote: "",
  focus: [],
  relationship: null,
};

/** Draft local → UserIntent puro. null si TODO quedó omitido (no persistir nada). */
export function draftToIntent(d: IntentDraft, now: string): UserIntent | null {
  const goalNote = d.goalNote.trim();
  if (d.goals.length === 0 && d.focus.length === 0 && !d.relationship && !goalNote) return null;
  return {
    goals: d.goals,
    focus: d.focus,
    ...(goalNote ? { goalNote } : {}),
    ...(d.relationship ? { relationship: d.relationship } : {}),
    useInAI: true,
    answeredAt: now,
  };
}

/** Pasos de intención + pasos de nacimiento, en orden. */
export function buildSteps(d: IntentDraft): OnboardingStep[] {
  const intentSteps: IntentStep[] = ["goals"];
  if (d.goals.length > 0) intentSteps.push("affirm");
  intentSteps.push("focus", "relationship");
  return [...intentSteps, ...STEPS];
}

export interface OnboardingAnswers {
  name: string;
  birthDate: string;      // YYYY-MM-DD
  birthTime: string;      // HH:MM ("" si desconocida)
  timeKnown: boolean;
  place: GeocodeResult | null;
  gender: Gender | null;
}

export const EMPTY_ANSWERS: OnboardingAnswers = {
  name: "", birthDate: "", birthTime: "", timeKnown: true, place: null, gender: null,
};

/** ¿El paso tiene lo necesario para avanzar? */
export function isStepComplete(step: OnboardingStep, a: Partial<OnboardingAnswers>): boolean {
  switch (step) {
    case "goals":
    case "affirm":
    case "focus":
    case "relationship":
      return true;
    case "name": return !!a.name && a.name.trim().length > 0;
    case "date": return !!a.birthDate && /^\d{4}-\d{2}-\d{2}$/.test(a.birthDate);
    case "time": return a.timeKnown === false || (!!a.birthTime && /^\d{2}:\d{2}$/.test(a.birthTime));
    case "place": return !!a.place;
    case "gender": return a.gender === "feminine" || a.gender === "masculine" || a.gender === "neutral";
  }
}

/** Mapea respuestas completas a una fila insertable de birth_profiles. */
export function answersToInsert(a: OnboardingAnswers, userId: string): TablesInsert<"birth_profiles"> {
  if (!a.place || !a.gender) throw new Error("Respuestas incompletas");
  const placeName = [a.place.name, a.place.country].filter(Boolean).join(", ");
  return {
    user_id: userId,
    name: a.name.trim(),
    birth_date: a.birthDate,
    birth_time: a.timeKnown && a.birthTime ? a.birthTime : null,
    time_known: a.timeKnown,
    place_name: placeName,
    latitude: a.place.latitude,
    longitude: a.place.longitude,
    time_zone: a.place.timeZone,
    gender: a.gender,
  };
}
