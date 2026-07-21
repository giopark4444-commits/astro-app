// apps/web/lib/hoy/scores.ts
// Ensamblador PURO de "Tu energía de hoy" por disciplina: toma datos YA computados
// (aspectos del día, ciclos personales, pilares natales, pilar del día) y arma los
// cuatro sets de puntajes por área que consume el dashboard. Sin motor nativo
// (@aluna/ephemeris) ni node:*, así que es testeable sin efemérides — la ruta server
// hace el cómputo pesado (carta/tránsitos/bazi) y le pasa el resultado aquí.
import {
  scoreLifeAreas,
  scoreLifeAreasNumerology,
  scoreLifeAreasBazi,
  combineLifeAreas,
  type Aspect,
  type PersonalCycles,
  type PillarSet,
  type Pillar,
  type LifeAreaScore,
} from "@aluna/core";

export interface HoyScoresInput {
  /** Aspectos tránsito→natal de HOY (una sola fecha) → energía de los astros del día. */
  aspects: Aspect[];
  /** Ciclos personales (año/mes/día) respecto a hoy → energía numerológica. */
  cycles: PersonalCycles;
  /** Cuatro Pilares natales (八字/사주) → base de la energía de pilares. */
  natal: PillarSet;
  /** Pilar del DÍA de hoy → mueve las áreas según su elemento. */
  dayPillar: Pillar;
}

/** Los cuatro sets de energía por área (cada uno, las 6 áreas de vida). */
export interface HoyScores {
  /** Promedio de las tres disciplinas del día (modo por defecto del panel). */
  general: LifeAreaScore[];
  astros: LifeAreaScore[];
  numeros: LifeAreaScore[];
  pilares: LifeAreaScore[];
}

/**
 * Arma los 4 sets de "hoy" desde datos ya computados. Todos DEL DÍA: `general` es el
 * promedio por área de las tres disciplinas (`combineLifeAreas`), así que no depende del
 * periodo — el selector de periodo lo aplica la ruta SOLO a los astros que devuelve.
 * Determinista y puro: mismos inputs → mismos puntajes.
 */
export function assembleHoyScores(input: HoyScoresInput): HoyScores {
  const astros = scoreLifeAreas(input.aspects);
  const numeros = scoreLifeAreasNumerology(input.cycles);
  const pilares = scoreLifeAreasBazi(input.natal, input.dayPillar);
  const general = combineLifeAreas([astros, numeros, pilares]);
  return { general, astros, numeros, pilares };
}
