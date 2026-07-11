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

/** Elemento de un tronco/rama del sistema Wu Xing (五行) — clave de WU_XING_COLORS. */
export type WuXingElement = StemDef["element"];

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

// ───────────────────────── Modo Pro: 藏干 + 十神 ─────────────────────────

/**
 * Troncos ocultos (藏干, "hidden stems"): cada rama terrestre esconde de 1 a 3 troncos
 * celestes (su elemento principal + residual + tumbal), índices en HEAVENLY_STEMS.
 * Tabla estándar; el primero es siempre el tronco principal (本气). Por índice de rama:
 *   子[壬·癸? no]… (ver constante). Validar contra fuente Ba Zi autorizada.
 */
const HIDDEN_STEMS: readonly (readonly number[])[] = [
  [9], // 子 zi  → 癸
  [5, 9, 7], // 丑 chou → 己 癸 辛
  [0, 2, 4], // 寅 yin  → 甲 丙 戊
  [1], // 卯 mao  → 乙
  [4, 1, 9], // 辰 chen → 戊 乙 癸
  [2, 4, 6], // 巳 si   → 丙 戊 庚
  [3, 5], // 午 wu   → 丁 己
  [5, 3, 1], // 未 wei  → 己 丁 乙
  [6, 8, 4], // 申 shen → 庚 壬 戊
  [7], // 酉 you  → 辛
  [4, 7, 3], // 戌 xu   → 戊 辛 丁
  [8, 0], // 亥 hai  → 壬 甲
] as const;

/** Troncos ocultos de una rama (índices en HEAVENLY_STEMS); el primero es el principal. */
export function hiddenStems(branch: number): number[] {
  return [...(HIDDEN_STEMS[mod(branch, 12)] ?? [])];
}

/** Las 10 relaciones del sistema de los Diez Dioses (十神), relativas al Maestro del Día. */
export type TenGod =
  | "peer" // 比肩 bǐ jiān — mismo elemento, misma polaridad
  | "rob" // 劫財 jié cái — mismo elemento, distinta polaridad
  | "eating" // 食神 shí shén — el DM lo genera, misma polaridad
  | "hurting" // 傷官 shāng guān — el DM lo genera, distinta polaridad
  | "wealth_indirect" // 偏財 piān cái — el DM lo controla, misma polaridad
  | "wealth_direct" // 正財 zhèng cái — el DM lo controla, distinta polaridad
  | "power_indirect" // 七殺 qī shā — lo controla al DM, misma polaridad
  | "power_direct" // 正官 zhèng guān — lo controla al DM, distinta polaridad
  | "resource_indirect" // 偏印 piān yìn — lo genera al DM, misma polaridad
  | "resource_direct"; // 正印 zhèng yìn — lo genera al DM, distinta polaridad

export interface TenGodDef {
  key: TenGod;
  hanzi: string;
}
/** Los Diez Dioses con su hanzi canónico, en orden por pares (par/impar de la regla). */
export const TEN_GODS: readonly TenGodDef[] = [
  { key: "peer", hanzi: "比肩" },
  { key: "rob", hanzi: "劫財" },
  { key: "eating", hanzi: "食神" },
  { key: "hurting", hanzi: "傷官" },
  { key: "wealth_indirect", hanzi: "偏財" },
  { key: "wealth_direct", hanzi: "正財" },
  { key: "power_indirect", hanzi: "七殺" },
  { key: "power_direct", hanzi: "正官" },
  { key: "resource_indirect", hanzi: "偏印" },
  { key: "resource_direct", hanzi: "正印" },
] as const;

/** Índice del elemento en el ciclo generador (生): 0 madera → 1 fuego → 2 tierra → 3 metal → 4 agua → madera. */
const GEN_ORDER: Record<StemDef["element"], number> = {
  wood: 0,
  fire: 1,
  earth: 2,
  metal: 3,
  water: 4,
};

/**
 * Diez Dioses (十神): relación de un tronco `other` respecto al Maestro del Día `dayMaster`
 * (ambos índices en HEAVENLY_STEMS). Combina la fase Wu Xing (en el ciclo generador:
 * generar = +1, controlar = +2, ser generado = +4, ser controlado = +3) con la polaridad
 * (yin/yang) de cada tronco — igual o distinta.
 */
export function tenGod(dayMaster: number, other: number): TenGod {
  const dm = HEAVENLY_STEMS[mod(dayMaster, 10)]!;
  const s = HEAVENLY_STEMS[mod(other, 10)]!;
  const phase = mod(GEN_ORDER[s.element] - GEN_ORDER[dm.element], 5); // 0=mismo,1=DM genera,2=DM controla,3=controla al DM,4=genera al DM
  const same = dm.yin === s.yin;
  switch (phase) {
    case 0:
      return same ? "peer" : "rob";
    case 1:
      return same ? "eating" : "hurting";
    case 2:
      return same ? "wealth_indirect" : "wealth_direct";
    case 3:
      return same ? "power_indirect" : "power_direct";
    default: // 4
      return same ? "resource_indirect" : "resource_direct";
  }
}
