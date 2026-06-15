// packages/core/src/bazi/bazi.ts
// Motor de los Cuatro Pilares (八字 Ba Zi chino / 사주 Saju coreano) — MISMO sistema
// sexagenario, solo cambian las etiquetas (las da la capa de i18n). Puro y RN-safe:
// no toca efemérides ni node:. El servidor le pasa la longitud solar (términos
// solares) y el año solar ya resuelto; el pilar de día es aritmética del calendario.
//
// PRECISIÓN: los pilares de año/mes salen de la posición del Sol (términos solares a
// cada 15°/30°), exactos. El pilar de DÍA usa el ciclo continuo de 60 desde un ancla
// documentada; el ÚNICO valor que conviene validar contra una fuente autorizada (la
// carta Saju/BaZi conocida de alguien) es ese ancla — si estuviera corrido, es un
// desfase constante de un término (fix de una línea: ANCLA_* abajo).

/** 10 Troncos Celestes (天干): elemento + polaridad. Orden canónico 0=甲. */
export interface StemDef {
  key: string;
  hanzi: string;
  element: "wood" | "fire" | "earth" | "metal" | "water";
  yin: boolean;
}
export const HEAVENLY_STEMS: readonly StemDef[] = [
  { key: "jia", hanzi: "甲", element: "wood", yin: false },
  { key: "yi", hanzi: "乙", element: "wood", yin: true },
  { key: "bing", hanzi: "丙", element: "fire", yin: false },
  { key: "ding", hanzi: "丁", element: "fire", yin: true },
  { key: "wu", hanzi: "戊", element: "earth", yin: false },
  { key: "ji", hanzi: "己", element: "earth", yin: true },
  { key: "geng", hanzi: "庚", element: "metal", yin: false },
  { key: "xin", hanzi: "辛", element: "metal", yin: true },
  { key: "ren", hanzi: "壬", element: "water", yin: false },
  { key: "gui", hanzi: "癸", element: "water", yin: true },
] as const;

/** 12 Ramas Terrestres (地支): animal + elemento. Orden canónico 0=子 (rata). */
export interface BranchDef {
  key: string;
  hanzi: string;
  animal: string;
  element: "wood" | "fire" | "earth" | "metal" | "water";
  yin: boolean;
}
export const EARTHLY_BRANCHES: readonly BranchDef[] = [
  { key: "zi", hanzi: "子", animal: "rat", element: "water", yin: false },
  { key: "chou", hanzi: "丑", animal: "ox", element: "earth", yin: true },
  { key: "yin", hanzi: "寅", animal: "tiger", element: "wood", yin: false },
  { key: "mao", hanzi: "卯", animal: "rabbit", element: "wood", yin: true },
  { key: "chen", hanzi: "辰", animal: "dragon", element: "earth", yin: false },
  { key: "si", hanzi: "巳", animal: "snake", element: "fire", yin: true },
  { key: "wu", hanzi: "午", animal: "horse", element: "fire", yin: false },
  { key: "wei", hanzi: "未", animal: "goat", element: "earth", yin: true },
  { key: "shen", hanzi: "申", animal: "monkey", element: "metal", yin: false },
  { key: "you", hanzi: "酉", animal: "rooster", element: "metal", yin: true },
  { key: "xu", hanzi: "戌", animal: "dog", element: "earth", yin: false },
  { key: "hai", hanzi: "亥", animal: "pig", element: "water", yin: true },
] as const;

export interface Pillar {
  stem: number; // 0-9 índice en HEAVENLY_STEMS
  branch: number; // 0-11 índice en EARTHLY_BRANCHES
}

export interface BaZiInput {
  /** Fecha civil LOCAL de nacimiento (para el pilar de día, ciclo de calendario). */
  localYear: number;
  localMonth: number;
  localDay: number;
  /** Hora local 0-23 (la rama de hora cubre bloques de 2 h, 子 = 23–01). */
  hour: number;
  /**
   * Año solar Ba Zi ya resuelto = año del Lichun (立春) vigente. El servidor lo
   * determina con la posición solar (el año avanza al cruzar el Sol los 315°, ~4 feb),
   * no en Año Nuevo civil. De aquí sale el pilar de AÑO.
   */
  solarYear: number;
  /** Longitud eclíptica del Sol al nacer (0–360). Fija la rama de MES por término solar. */
  sunLongitude: number;
}

export interface BaZiResult {
  year: Pillar;
  month: Pillar;
  day: Pillar;
  hour: Pillar;
}

// --- Anclas calibrables (validar contra una carta autorizada) ---
// Pilar de día: stem/branch del ciclo de 60 a partir del Día Juliano. Fórmula
// ampliamente usada; si el día saliera corrido, ajustar SOLO estos dos offsets.
const DAY_STEM_ANCHOR = 9;
const DAY_BRANCH_ANCHOR = 1;

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

/** Día Juliano (entero, calendario gregoriano) — algoritmo de Fliegel–Van Flandern. */
export function gregorianToJDN(y: number, m: number, d: number): number {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return (
    d +
    Math.floor((153 * mm + 2) / 5) +
    365 * yy +
    Math.floor(yy / 4) -
    Math.floor(yy / 100) +
    Math.floor(yy / 400) -
    32045
  );
}

/** Pilar de AÑO: el año 4 d.C. fue 甲子, de ahí el offset. */
export function yearPillar(solarYear: number): Pillar {
  return { stem: mod(solarYear - 4, 10), branch: mod(solarYear - 4, 12) };
}

/**
 * Rama de MES por término solar: el mes 寅 (tigre, índice de rama 2) empieza en
 * Lichun (Sol = 315°); cada mes abarca 30° de longitud solar. El tronco del mes sale
 * del tronco de año por la regla de los Cinco Tigres (五虎遁).
 */
export function monthPillar(yearStem: number, sunLongitude: number): Pillar {
  const sector = Math.floor(mod(sunLongitude - 315, 360) / 30); // 0 = 寅 … 11 = 丑
  const branch = mod(sector + 2, 12); // 寅 es la rama índice 2
  // Cinco Tigres: tronco del mes 寅 = (yearStem mod 5)*2 + 2; luego +1 por mes.
  const firstMonthStem = mod((yearStem % 5) * 2 + 2, 10);
  const stem = mod(firstMonthStem + sector, 10);
  return { stem, branch };
}

/** Pilar de DÍA: ciclo continuo de 60 desde el Día Juliano (ver anclas arriba). */
export function dayPillar(localYear: number, localMonth: number, localDay: number): Pillar {
  const jdn = gregorianToJDN(localYear, localMonth, localDay);
  return { stem: mod(jdn + DAY_STEM_ANCHOR, 10), branch: mod(jdn + DAY_BRANCH_ANCHOR, 12) };
}

/**
 * Pilar de HORA: la rama cubre bloques de 2 h centrados (子 = 23–01, 丑 = 01–03, …).
 * El tronco de hora sale del tronco de DÍA por la regla de los Cinco Ratas (五鼠遁).
 */
export function hourPillar(dayStem: number, hour: number): Pillar {
  const branch = mod(Math.floor((hour + 1) / 2), 12); // 23→子, 0→子, 1→丑 …
  const firstHourStem = mod((dayStem % 5) * 2, 10); // tronco de la hora 子
  const stem = mod(firstHourStem + branch, 10);
  return { stem, branch };
}

/** Calcula los Cuatro Pilares. El servidor resuelve solarYear y sunLongitude con efemérides. */
export function computeBaZi(input: BaZiInput): BaZiResult {
  const year = yearPillar(input.solarYear);
  const month = monthPillar(year.stem, input.sunLongitude);
  const day = dayPillar(input.localYear, input.localMonth, input.localDay);
  const hour = hourPillar(day.stem, input.hour);
  return { year, month, day, hour };
}
