import type { GeocodeResult } from "./geocode";
import type { TablesInsert } from "@aluna/supabase";

export type Gender = "feminine" | "masculine" | "neutral";
export type OnboardingStep = "name" | "date" | "time" | "place" | "gender";
export const STEPS: OnboardingStep[] = ["name", "date", "time", "place", "gender"];

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
