import type { ChartInput, HouseSystem, Zodiac, NodeType, LilithType } from "@aluna/core";

// Mapeo perfil de nacimiento → entrada del motor de carta. Solo tipos de
// @aluna/core (isomórfico), así que este archivo es seguro en cliente; el
// cómputo nativo (@aluna/ephemeris) vive solo en la ruta server.

export interface ChartProfileFields {
  birth_date: string; // YYYY-MM-DD
  birth_time: string | null; // HH:MM
  time_known: boolean;
  latitude: number;
  longitude: number;
  time_zone: string;
}

export interface ChartInputOptions {
  houseSystem?: HouseSystem;
  zodiac?: Zodiac;
  ayanamsha?: string;
  nodeType?: NodeType;
  lilithType?: LilithType;
}

/** ¿La carta es solar (sin hora fiable)? Entonces se computa a mediodía local. */
export function isSolarChart(p: Pick<ChartProfileFields, "time_known" | "birth_time">): boolean {
  return !p.time_known || !p.birth_time;
}

/** Perfil → ChartInput. Hora desconocida → mediodía local (carta solar). */
export function profileToChartInput(p: ChartProfileFields, opts: ChartInputOptions = {}): ChartInput {
  const [y, m, d] = p.birth_date.split("-").map(Number);
  let hour = 12;
  let minute = 0;
  if (!isSolarChart(p) && p.birth_time) {
    const [h, min] = p.birth_time.split(":").map(Number);
    hour = h ?? 12;
    minute = min ?? 0;
  }
  return {
    year: y!,
    month: m!,
    day: d!,
    hour,
    minute,
    timeZone: p.time_zone,
    latitude: p.latitude,
    longitude: p.longitude,
    ...(opts.houseSystem ? { houseSystem: opts.houseSystem } : {}),
    ...(opts.zodiac ? { zodiac: opts.zodiac } : {}),
    ...(opts.ayanamsha ? { ayanamsha: opts.ayanamsha } : {}),
    ...(opts.nodeType ? { nodeType: opts.nodeType } : {}),
    ...(opts.lilithType ? { lilithType: opts.lilithType } : {}),
  };
}
