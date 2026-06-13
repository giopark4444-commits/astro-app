// packages/core/src/numerology/types.ts

/** Fecha de nacimiento desestructurada (sin zona horaria; la numerología usa la fecha civil). */
export interface BirthDate {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
}

/** Un paso de la reducción, para mostrar el cálculo (feature "reducción mostrada"). */
export interface ReductionTrace {
  steps: number[]; // p.ej. [29, 11] o [1984, 22, 4]
  value: number; // resultado final
  isMaster: boolean;
  karmicDebt?: 13 | 14 | 16 | 19; // si apareció en el camino
}

export interface CoreNumbers {
  lifePath: ReductionTrace;
  expression: ReductionTrace; // Destino
  soulUrge: ReductionTrace; // Alma
  personality: ReductionTrace;
  birthday: ReductionTrace; // Día
  maturity: ReductionTrace;
}

export interface Pinnacle {
  value: number;
  isMaster: boolean;
  startAge: number;
  endAge: number | null; // null = "en adelante"
}

export interface Challenge {
  value: number;
  startAge: number;
  endAge: number | null;
}

export interface PersonalCycles {
  personalYear: ReductionTrace;
  personalMonth: ReductionTrace;
  personalDay: ReductionTrace;
}

export interface KarmicProfile {
  /** lecciones kármicas: dígitos 1-9 ausentes en el nombre */
  lessons: number[];
  /** deudas kármicas detectadas (13/14/16/19) en los números núcleo */
  debts: Array<14 | 13 | 16 | 19>;
  /** tabla de inclusión: cuántas veces aparece cada dígito 1-9 en el nombre */
  inclusion: Record<number, number>;
  /** pasión oculta: el/los dígitos más frecuentes en el nombre */
  hiddenPassion: number[];
}

export interface NumerologyResult {
  core: CoreNumbers;
  cycles: PersonalCycles;
  pinnacles: Pinnacle[];
  challenges: Challenge[];
  karmic: KarmicProfile;
}

export interface NumerologyInput {
  fullName: string;
  birthDate: BirthDate;
  /** fecha de referencia para los ciclos personales (por defecto hoy) */
  asOf?: BirthDate;
}
