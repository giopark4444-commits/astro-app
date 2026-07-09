// apps/web/app/(app)/pilares/types.ts
// Forma de la respuesta de /api/bazi (server, efemérides), compartida entre la vista
// (que la pide) y la lámina Pro (que la lee) — antes duplicada en ambos archivos.
import type { Pillar } from "@aluna/core";

export interface BaZiData {
  year: Pillar;
  month: Pillar;
  day: Pillar;
  hour: Pillar | null;
  solarYear: number;
  timeKnown: boolean;
  gender: "feminine" | "masculine" | "neutral";
  birthYear: number;
  daysToPrevJie: number;
  daysToNextJie: number;
}
