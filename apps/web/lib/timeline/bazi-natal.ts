// apps/web/lib/timeline/bazi-natal.ts
// SERVER-only: receta de ensamblaje de los pilares natales (八字/사주), extraída de
// /api/bazi/route.ts para que /api/timeline (T3) pueda reutilizarla sin duplicar
// lógica. Usa @aluna/ephemeris (sweph nativo) solo para la LONGITUD SOLAR del
// nacimiento — de ahí salen el año solar (límite de Lichun) y la rama de mes.
// El resto es el sistema sexagenario puro de @aluna/core.
import path from "node:path";
import { computeChart, jieBoundaries, setEphePath } from "@aluna/ephemeris";
import { yearPillar, monthPillar, dayPillar, hourPillar, type Pillar } from "@aluna/core";
import { isSolarChart, profileToChartInput, type ChartProfileFields } from "@/lib/chart";

setEphePath(path.join(process.cwd(), "..", "..", "packages", "ephemeris", "ephe"));

export interface BaziNatalProfile extends ChartProfileFields {
  gender?: unknown;
}

export interface BaziNatalResult {
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

/**
 * Ensambla los Cuatro Pilares natales + los datos que necesita `luckPillars`
 * (birthYear, daysToPrevJie/NextJie, gender) a partir de un perfil de nacimiento.
 * Lanza si el cómputo de la carta (sol) falla — el llamador decide cómo mapear
 * eso a una respuesta HTTP.
 */
export function computeBaziNatal(profile: BaziNatalProfile): BaziNatalResult {
  // input lleva la fecha civil LOCAL (year/month/day) y la hora real cuando se
  // conoce (mediodía si es carta solar). Derivamos todo de aquí + isSolarChart,
  // sin acceder campos del profile directo (igual que /api/chart).
  const input = profileToChartInput(profile, {});
  const sun = computeChart(input).bodies.find((b) => b.body === "sun");
  if (!sun) throw new Error("compute");
  const sunLongitude = sun.longitude;

  const cy = input.year;
  const cm = input.month;

  // Año solar Ba Zi: avanza en Lichun (Sol = 315°, ~4 feb), no en Año Nuevo civil.
  // Con la longitud solar exacta el límite es preciso; ene/feb son los únicos ambiguos.
  let solarYear = cy;
  if (cm === 1 || (cm === 2 && sunLongitude < 315)) solarYear -= 1;

  const year = yearPillar(solarYear);
  const month = monthPillar(year.stem, sunLongitude);
  const day = dayPillar(cy, cm, input.day);

  // Pilar de HORA solo si se conoce la hora (input.hour es la hora real entonces).
  const timeKnown = !isSolarChart(profile);
  const hour: Pillar | null = timeKnown ? hourPillar(day.stem, input.hour) : null;

  // Términos solares (jie) que delimitan el pilar de mes actual — para mostrar
  // "cuánto falta/pasó" en el Modo Pro. Género del perfil, normalizado a los tres
  // valores que entiende la UI (dato del usuario, no calculado).
  const { daysToPrevJie, daysToNextJie } = jieBoundaries(input);
  const rawGender = String(profile.gender ?? "");
  const gender =
    rawGender === "feminine" || rawGender === "masculine" ? rawGender : "neutral";

  return {
    year, month, day, hour, solarYear, timeKnown,
    gender, birthYear: cy, daysToPrevJie, daysToNextJie,
  };
}
