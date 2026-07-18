// apps/web/lib/timeline/types.ts
// "Camino de vida" — tipos puros de la capa de eventos. Sin imports: cero
// dependencia de @aluna/core o de efemérides nativas aquí, para que cualquier
// capa (server o cliente) pueda importar el shape sin arrastrar nada pesado.

export type TimelineSystem = "life" | "astro" | "numerology" | "bazi";

export type TimelineKind =
  | "birth"
  | "saturn-return"
  | "jupiter-return"
  | "uranus-opposition"
  | "uranus-return"
  | "personal-year-1"
  | "pinnacle-change"
  | "luck-pillar-change"
  | "annual-clash"
  | "confluence";

/**
 * Un evento en la línea de tiempo vital. `id` es estable y determinista:
 * `${system}:${kind}:${year}[:${ordinal}]` — el sufijo `:${ordinal}` solo
 * aparece cuando el evento lo trae (p. ej. varios pináculos o pilares de
 * suerte pueden compartir system+kind+year en casos límite).
 */
export interface TimelineEvent {
  id: string;
  year: number;
  dateIso?: string;
  approx?: boolean;
  system: TimelineSystem;
  kind: TimelineKind;
  weight: 1 | 2 | 3;
  ordinal?: number;
  meta?: Record<string, string | number | boolean>;
}

export interface TimelineResult {
  events: TimelineEvent[];
  fromYear: number;
  toYear: number;
  birthYear: number;
  todayIso: string;
}
