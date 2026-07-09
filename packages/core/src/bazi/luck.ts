// packages/core/src/bazi/luck.ts
// 大運 (Pilares de Suerte): décadas que avanzan (o retroceden) el ciclo sexagenario
// desde el pilar de MES. Dirección clásica 陽男陰女順行: (año yang × hombre) o
// (año yin × mujer) → adelante; los cruces → atrás. Género `neutral` → se devuelven
// AMBAS secuencias (decisión de producto, spec §2). Edad de inicio: regla clásica
// 3 días = 1 año sobre la distancia al término solar de mes (節) siguiente (adelante)
// o anterior (atrás) — el dato astronómico lo aporta el servidor (jieBoundaries).
// 流年: el pilar del año civil N es yearPillar(N); la ambigüedad ene–feb (Lichun)
// se anota en la UI, no se resuelve por persona (spec §3.6).
import { yearPillar, tenGod, type Pillar, type TenGod } from "./bazi";
import { sexagenaryIndex, nayin, type NayinDef } from "./nayin";
import {
  branchPairInteractions,
  type InteractionType,
  type PillarPos,
  type PillarSet,
} from "./interactions";

const mod = (n: number, m: number) => ((n % m) + m) % m;

export type LuckDirection = "forward" | "backward";

export function luckDirection(yearStem: number, gender: "masculine" | "feminine"): LuckDirection {
  const yang = mod(yearStem, 10) % 2 === 0;
  return (yang && gender === "masculine") || (!yang && gender === "feminine")
    ? "forward"
    : "backward";
}

export interface LuckPillarItem {
  pillar: Pillar;
  startAge: number; // años cumplidos al entrar (entero)
  startYear: number; // año civil aproximado de entrada
  tenGod: TenGod;
  nayin: NayinDef;
}
export interface LuckSequence {
  direction: LuckDirection;
  startAgeYears: number;
  startAgeMonths: number;
  pillars: LuckPillarItem[];
}
export interface LuckInput {
  pillars: PillarSet;
  gender: "feminine" | "masculine" | "neutral";
  birthYear: number;
  daysToPrevJie: number;
  daysToNextJie: number;
}

function pillarFromIndex(n: number): Pillar {
  const i = mod(n, 60);
  return { stem: i % 10, branch: i % 12 };
}

function buildSequence(input: LuckInput, direction: LuckDirection): LuckSequence {
  const days = direction === "forward" ? input.daysToNextJie : input.daysToPrevJie;
  const ageExact = days / 3; // 3 días = 1 año
  let years = Math.floor(ageExact);
  let months = Math.round((ageExact - years) * 12);
  if (months === 12) {
    years += 1;
    months = 0;
  }
  const dayMaster = input.pillars.day.stem;
  const monthIdx = sexagenaryIndex(input.pillars.month);
  const step = direction === "forward" ? 1 : -1;
  const pillars: LuckPillarItem[] = [];
  for (let i = 1; i <= 9; i++) {
    const pillar = pillarFromIndex(monthIdx + step * i);
    const startAge = years + 10 * (i - 1);
    pillars.push({
      pillar,
      startAge,
      startYear: input.birthYear + startAge,
      tenGod: tenGod(dayMaster, pillar.stem),
      nayin: nayin(pillar),
    });
  }
  return { direction, startAgeYears: years, startAgeMonths: months, pillars };
}

/** 1 secuencia (o 2 si gender=neutral: forward primero). */
export function luckPillars(input: LuckInput): LuckSequence[] {
  if (input.gender === "neutral") {
    return [buildSequence(input, "forward"), buildSequence(input, "backward")];
  }
  return [buildSequence(input, luckDirection(input.pillars.year.stem, input.gender))];
}

export interface AnnualPillarItem {
  year: number;
  pillar: Pillar;
  tenGod: TenGod;
  marks: { type: InteractionType; vs: PillarPos }[];
}

export function annualPillars(pillars: PillarSet, fromYear: number, count: number): AnnualPillarItem[] {
  const dayMaster = pillars.day.stem;
  const natal: { pos: PillarPos; branch: number }[] = [
    { pos: "year", branch: pillars.year.branch },
    { pos: "month", branch: pillars.month.branch },
    { pos: "day", branch: pillars.day.branch },
  ];
  if (pillars.hour) natal.push({ pos: "hour", branch: pillars.hour.branch });

  const out: AnnualPillarItem[] = [];
  for (let y = fromYear; y < fromYear + count; y++) {
    const pillar = yearPillar(y);
    const marks: { type: InteractionType; vs: PillarPos }[] = [];
    for (const n of natal) {
      for (const hit of branchPairInteractions(pillar.branch, n.branch)) {
        marks.push({ type: hit.type, vs: n.pos });
      }
    }
    out.push({ year: y, pillar, tenGod: tenGod(dayMaster, pillar.stem), marks });
  }
  return out;
}
