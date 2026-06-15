import type { GeocodeResult } from "./geocode";
import type { NumerologyInput } from "@aluna/core";

export type Gender = "feminine" | "masculine" | "neutral";

/** Perfil activo guardado localmente. Alimenta la numerología (nombre + fecha civil). */
export interface Profile {
  name: string;
  birthDate: string; // YYYY-MM-DD
  birthTime: string; // HH:MM ("" si desconocida)
  timeKnown: boolean;
  place: GeocodeResult | null;
  gender: Gender | null;
}

export const EMPTY_PROFILE: Profile = {
  name: "",
  birthDate: "",
  birthTime: "",
  timeKnown: true,
  place: null,
  gender: null,
};

/** Perfil → entrada de numerología (@aluna/core). Usa nombre + fecha civil. */
export function profileToNumerologyInput(p: Profile): NumerologyInput {
  const [y, m, d] = p.birthDate.split("-").map(Number);
  return { fullName: p.name, birthDate: { year: y!, month: m!, day: d! } };
}

export function isProfileComplete(p: Profile): boolean {
  return (
    p.name.trim().length > 0 &&
    /^\d{4}-\d{2}-\d{2}$/.test(p.birthDate) &&
    p.place !== null &&
    (p.gender === "feminine" || p.gender === "masculine" || p.gender === "neutral")
  );
}
