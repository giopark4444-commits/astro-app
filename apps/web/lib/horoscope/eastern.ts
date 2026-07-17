// Motor Tong Shu (horóscopo oriental) UNIVERSAL por animal: no depende del
// usuario, solo de (animal, periodo, fecha local). Server-only (importa
// @aluna/ephemeris). Espejo estructural de western.ts.
//
// Sistema: pilares del periodo (año/mes/día del calendario sexagenario) y las
// interacciones clásicas de la rama del animal contra cada rama del periodo
// (六合 armonía, 冲 choque, 害 daño, 刑 castigo, 自刑 auto-castigo, 破 ruptura).
// El año oriental corre de Lichun a Lichun (立春, Sol = 315°) — NO de enero a
// enero (anti-funa, spec §5). Decisión H2: interacciones PAR A PAR; los trinos
// 三合 de 3 puntos (p. ej. 寅午戌) quedan fuera — mejora futura documentada.
//
// La capa personal (natalPillars → natalHits) es opcional e informativa: NO
// entra a la puntuación ni a la caché (la caché es solo del payload universal).
import { DateTime } from "luxon";
import {
  EARTHLY_BRANCHES, HEAVENLY_STEMS, yearPillar, monthPillar, dayPillar,
  branchPairInteractions, scoreTone,
  type InteractionType, type Pillar, type PillarSet, type PillarPos,
  type ScoreTone, type WuXingElement,
} from "@aluna/core";
import { computeBodies, localToJulianDay, jieDatesInRange } from "@aluna/ephemeris";
import { resolvePeriodRange, isValidTz, type HoroscopePeriod } from "./western";

export type { HoroscopePeriod };

// ── Animales y áreas ────────────────────────────────────────────────────────

export type EasternAnimal =
  | "rat" | "ox" | "tiger" | "rabbit" | "dragon" | "snake"
  | "horse" | "goat" | "monkey" | "rooster" | "dog" | "pig";

/** Los 12 animales en orden de rama (índice = índice de rama 子…亥). */
export const EASTERN_ANIMALS: readonly EasternAnimal[] =
  EARTHLY_BRANCHES.map((b) => b.animal as EasternAnimal);

export function isEasternAnimal(a: string): a is EasternAnimal {
  return (EASTERN_ANIMALS as readonly string[]).includes(a);
}

/** Las 5 categorías clásicas del Tong Shu (sin mood — spec §5). */
export type EasternArea = "work" | "money" | "love" | "health" | "luck";
export const EASTERN_AREAS: readonly EasternArea[] = ["work", "money", "love", "health", "luck"];

// ── Tipos del payload ───────────────────────────────────────────────────────

export type EasternPillarKey = "year" | "month" | "day";

/** 破 no existe en branchPairInteractions de @aluna/core; se calcula aquí. */
export type EasternInteractionType = InteractionType | "po";

export interface EasternPillar {
  stem: number;   // 0-9 índice en HEAVENLY_STEMS
  branch: number; // 0-11 índice en EARTHLY_BRANCHES
  stemHanzi: string;
  branchHanzi: string;
  animal: EasternAnimal;
}

/**
 * Pilares presentes según el periodo (spec §6: "día solo en period=today"):
 *   today → year + month + day; week/month → year + month (el mes = pilar
 *   vigente en el PUNTO MEDIO del rango, que en semana puede cruzar un 節);
 *   year → SOLO year (Lichun→Lichun; el Tai Sui ya captura lo anual).
 * month es null solo en la vista año; day es null fuera de today.
 */
export interface EasternPeriodPillars {
  year: EasternPillar;
  month: EasternPillar | null;
  day: EasternPillar | null;
}

export interface EasternInteractionHit {
  pillar: EasternPillarKey;        // pilar del periodo que interactúa
  type: EasternInteractionType;
  withBranch: number;              // rama de ese pilar del periodo
  withAnimal: EasternAnimal;       // animal de esa rama
  favorable: boolean;              // 六合 = true; 冲/刑/自刑/害/破 = false
  element?: WuXingElement;         // elemento de la combinación 六合
}

export interface EasternDriver extends EasternInteractionHit {
  delta: number; // aporte firmado al score del área (ya ponderado por pilar)
}

export interface EasternAreaScore {
  area: EasternArea;
  score: number; // 0-100
  tone: ScoreTone;
  drivers: EasternDriver[];
}

export type TaiSuiKind = "zhi" | "chong" | "hai" | "zixing" | "po";
export interface TaiSuiHit { kind: TaiSuiKind }

export interface EasternNatalHit {
  natalPillar: PillarPos;
  periodPillar: EasternPillarKey;
  type: EasternInteractionType;
  withBranch: number; // rama del pilar del periodo
  favorable: boolean;
}

export type WuXingRelation = "same" | "generates" | "controls" | "controlled_by" | "generated_by";
export interface EasternWuXing {
  periodElement: WuXingElement; // elemento del tronco del pilar focal del periodo
  animalElement: WuXingElement; // elemento de la rama del animal
  relation: WuXingRelation;     // acción del periodo SOBRE el animal (生/克)
}

export interface EasternPeriodRange {
  fromIso: string;
  toIso: string;
  localDate: string; // YYYY-MM-DD en la tz pedida (clave de caché)
  offsetMinutes: number;
}

export interface EasternPayload {
  animal: EasternAnimal;
  period: HoroscopePeriod;
  tz: string;
  range: { fromIso: string; toIso: string }; // year = Lichun → Lichun
  solarYear: number; // año del Lichun vigente (乙巳=2025, 丙午=2026…)
  pillars: EasternPeriodPillars; // solo los pilares del periodo (ver tipo)
  jieDates: Array<{ atIso: string; solarLongitude: number }>;
  interactions: EasternInteractionHit[]; // tabla Pro: la fuente de verdad
  clash: { withAnimal: EasternAnimal } | null; // primer 冲 (día > mes > año)
  harmonies: EasternAnimal[]; // animales en 六合 con el consultante
  taiSui: TaiSuiHit[] | null; // solo en vista año
  monthChange: { atIso: string } | null; // primer 節 dentro del rango
  wuXing: EasternWuXing;
  toneBalance: "favorable" | "tense" | "mixed";
  areas: EasternAreaScore[];
  natalHits?: EasternNatalHit[];
}

// ── Tablas tradicionales locales ────────────────────────────────────────────

/**
 * Pares de ruptura 破 (Tong Shu / Ba Zi clásico; p. ej. 三命通會): 子酉, 卯午,
 * 辰丑, 戌未, 寅亥, 巳申. branchPairInteractions de @aluna/core NO expone este
 * tipo (cubre 六合/冲/害/刑/自刑), así que se calcula aquí con la tabla canónica.
 */
const PO_PAIRS: readonly (readonly [number, number])[] = [
  [0, 9],  // 子酉
  [3, 6],  // 卯午
  [4, 1],  // 辰丑
  [10, 7], // 戌未
  [2, 11], // 寅亥
  [5, 8],  // 巳申
] as const;

/** 自刑: solo 辰午酉亥 se auto-castigan (misma tabla que interactions.ts). */
const SELF_PUNISH = new Set([4, 6, 9, 11]);

const isPoPair = (a: number, b: number) =>
  PO_PAIRS.some(([x, y]) => (a === x && b === y) || (a === y && b === x));

// ── Puntuación (spec §5) ────────────────────────────────────────────────────
//
// Determinística desde las interacciones, baseline neutro 58 y clamp 0-100.
// Ponderación por pilar (día > mes > año): día ×3, mes ×2, año ×1. Solo los
// pilares PRESENTES en el periodo aportan (ver EasternPeriodPillars): today usa
// los tres; week/month usan mes+año; year usa solo el año. Sin el pilar del
// día, week/month/year quedan más cerca del baseline — correcto: menos
// interacciones activas = clima más neutro.
// Mapeo interacción → áreas (decisión H2, explícita y explicable por drivers):
//   六合 (armonía)      → love +8, luck +6, money +3  (vínculo, fortuna, acuerdos)
//   冲   (choque)       → work −7, health −5          (mueve/inestabiliza planes y cuerpo)
//   害   (daño)         → money −6, love −3           (cautela en tratos y confianzas)
//   刑   (castigo)      → work −4, love −5            (fricción-lección en deberes y vínculos)
//   自刑 (auto-castigo) → health −6, luck −4          (desgaste propio)
//   破   (ruptura)      → money −4, work −3           (planes/recursos que se agrietan)
// El Wu Xing del periodo es informativo: NO altera scores (los drivers siempre
// explican el 100% del movimiento — regla anti-funa "la barra nunca contradice
// la tabla Pro").
const SCORE_BASE = 58;
const PILLAR_WEIGHT: Record<EasternPillarKey, number> = { day: 3, month: 2, year: 1 };
const EFFECTS: Record<EasternInteractionType, Partial<Record<EasternArea, number>>> = {
  six_combo: { love: 8, luck: 6, money: 3 },
  clash: { work: -7, health: -5 },
  harm: { money: -6, love: -3 },
  punishment: { work: -4, love: -5 },
  self_punishment: { health: -6, luck: -4 },
  po: { money: -4, work: -3 },
  // tipos de set completo que branchPairInteractions nunca emite par a par:
  stem_combo: {}, trine: {}, half_trine: {},
};

// ── Efemérides mínimas ──────────────────────────────────────────────────────

/** Longitud eclíptica del Sol en el instante UTC del iso dado. */
function sunLongitudeAt(iso: string): number {
  const d = DateTime.fromISO(iso, { zone: "utc" });
  const { julianDayEt } = localToJulianDay({
    year: d.year, month: d.month, day: d.day, hour: d.hour, minute: d.minute, timeZone: "utc",
  });
  return computeBodies(julianDayEt).find((b) => b.body === "sun")!.longitude;
}

/**
 * Año solar Ba Zi: avanza en Lichun (Sol = 315°, ~4 feb), no en Año Nuevo
 * civil — misma regla que /api/bazi (ene/feb son los únicos meses ambiguos).
 */
function resolveSolarYear(localYear: number, localMonth: number, sunLon: number): number {
  if (localMonth === 1 || (localMonth === 2 && sunLon < 315)) return localYear - 1;
  return localYear;
}

/** Lichun (Sol = 315°) del año civil dado, memoizado (es una búsqueda cara). */
const lichunMemo = new Map<number, string>();
function lichunIso(year: number): string {
  const hit = lichunMemo.get(year);
  if (hit) return hit;
  const list = jieDatesInRange(`${year}-01-25T00:00:00.000Z`, `${year}-02-15T00:00:00.000Z`);
  const lichun = list.find((e) => {
    const off = (((e.solarLongitude - 315) % 360) + 360) % 360;
    return off < 1 || off > 359;
  });
  if (!lichun) throw new Error(`Lichun no encontrado para ${year}`);
  lichunMemo.set(year, lichun.atIso);
  return lichun.atIso;
}

/** Memo FIFO de jieDatesInRange (rango → 節): el año repite el mismo rango 12×. */
const jieMemo = new Map<string, Array<{ atIso: string; solarLongitude: number }>>();
function jieDatesMemo(fromIso: string, toIso: string) {
  const key = `${fromIso}|${toIso}`;
  const hit = jieMemo.get(key);
  if (hit) return hit;
  const value = jieDatesInRange(fromIso, toIso);
  if (jieMemo.size >= 64) {
    const oldest = jieMemo.keys().next().value;
    if (oldest !== undefined) jieMemo.delete(oldest);
  }
  jieMemo.set(key, value);
  return value;
}

// ── Rango del periodo ───────────────────────────────────────────────────────

/** Mediodía local de la fecha local vigente: instante de referencia determinista
 *  (mismo enfoque que las muestras de western: misma fecha local → misma clave). */
function localNoon(tz: string, nowIso?: string): DateTime {
  const zone = isValidTz(tz) ? tz : "utc";
  const now = (nowIso ? DateTime.fromISO(nowIso, { zone: "utc" }) : DateTime.utc()).setZone(zone);
  return now.set({ hour: 12, minute: 0, second: 0, millisecond: 0 });
}

/**
 * today/week/month = mismas anclas de calendario que western.
 * year = Lichun → Lichun (el año oriental NO es el año calendario — anti-funa).
 */
export function resolveEasternPeriodRange(
  period: HoroscopePeriod, tz: string, nowIso?: string,
): EasternPeriodRange {
  if (period !== "year") {
    const r = resolvePeriodRange(period, tz, nowIso);
    return { fromIso: r.fromIso, toIso: r.toIso, localDate: r.localDate, offsetMinutes: r.offsetMinutes };
  }
  const noon = localNoon(tz, nowIso);
  const sunLon = sunLongitudeAt(noon.toUTC().toISO()!);
  const solarYear = resolveSolarYear(noon.year, noon.month, sunLon);
  return {
    fromIso: lichunIso(solarYear),
    toIso: lichunIso(solarYear + 1),
    localDate: noon.toISODate()!,
    offsetMinutes: noon.offset,
  };
}

// ── Motor ───────────────────────────────────────────────────────────────────

function toEasternPillar(p: Pillar): EasternPillar {
  const stem = HEAVENLY_STEMS[p.stem]!;
  const branch = EARTHLY_BRANCHES[p.branch]!;
  return {
    stem: p.stem, branch: p.branch,
    stemHanzi: stem.hanzi, branchHanzi: branch.hanzi,
    animal: branch.animal as EasternAnimal,
  };
}

/** Interacciones par a par (incluye 破 local) de la rama del animal vs una rama. */
function pairHits(animalBranch: number, other: number): Array<{ type: EasternInteractionType; element?: WuXingElement }> {
  const out: Array<{ type: EasternInteractionType; element?: WuXingElement }> =
    branchPairInteractions(animalBranch, other);
  if (isPoPair(animalBranch, other)) out.push({ type: "po" });
  return out;
}

/**
 * Fila Tai Sui del animal frente a la rama del año (solo vista año):
 * 值 misma rama, 自刑 si además la rama se auto-castiga, 冲 opuesta, 害 par de
 * daño, 破 par de ruptura. Los 刑 de par/grupo (p. ej. 子卯) quedan fuera de la
 * fila Tai Sui porque el contrato de prosa solo contempla estos 5 kinds; siguen
 * visibles como interacción normal en la tabla.
 */
function taiSuiHits(animalBranch: number, yearBranch: number): TaiSuiHit[] {
  const out: TaiSuiHit[] = [];
  if (animalBranch === yearBranch) {
    out.push({ kind: "zhi" });
    if (SELF_PUNISH.has(animalBranch)) out.push({ kind: "zixing" });
  }
  if ((animalBranch + 6) % 12 === yearBranch) out.push({ kind: "chong" });
  if (branchPairInteractions(animalBranch, yearBranch).some((h) => h.type === "harm")) {
    out.push({ kind: "hai" });
  }
  if (isPoPair(animalBranch, yearBranch)) out.push({ kind: "po" });
  return out;
}

const GEN_CYCLE: readonly WuXingElement[] = ["wood", "fire", "earth", "metal", "water"];
/** Relación Wu Xing del elemento del periodo HACIA el del animal (生/克). */
function wuXingRelation(periodEl: WuXingElement, animalEl: WuXingElement): WuXingRelation {
  const d = (GEN_CYCLE.indexOf(animalEl) - GEN_CYCLE.indexOf(periodEl) + 5) % 5;
  return (["same", "generates", "controls", "controlled_by", "generated_by"] as const)[d]!;
}

export function computeEasternHoroscope(
  animal: string, period: HoroscopePeriod, tz: string, nowIso?: string, natalPillars?: PillarSet,
): EasternPayload {
  if (!isEasternAnimal(animal)) throw new Error(`Animal desconocido: ${animal}`);
  const animalBranch = EASTERN_ANIMALS.indexOf(animal);
  const range = resolveEasternPeriodRange(period, tz, nowIso);

  // Instante de referencia de los pilares por periodo:
  //   today/year → mediodía local de la fecha vigente (determinismo western);
  //   week/month → PUNTO MEDIO del rango (el mes vigente en el centro del
  //   periodo; en semana puede cruzar un 節 y difiere del mes de "hoy").
  const zone = isValidTz(tz) ? tz : "utc";
  const ref = period === "week" || period === "month"
    ? DateTime.fromMillis(
        (DateTime.fromISO(range.fromIso).toMillis() + DateTime.fromISO(range.toIso).toMillis()) / 2,
        { zone: "utc" },
      ).setZone(zone)
    : localNoon(tz, nowIso);
  const sunLon = sunLongitudeAt(ref.toUTC().toISO()!);
  const solarYear = resolveSolarYear(ref.year, ref.month, sunLon);
  const yp = yearPillar(solarYear);
  // Pilares presentes según el periodo (spec §6: día solo en today; la vista
  // año lee SOLO el pilar del año — el Tai Sui captura las aflicciones anuales).
  const pillars: EasternPeriodPillars = {
    year: toEasternPillar(yp),
    month: period === "year" ? null : toEasternPillar(monthPillar(yp.stem, sunLon)),
    day: period === "today" ? toEasternPillar(dayPillar(ref.year, ref.month, ref.day)) : null,
  };

  // Tabla de interacciones (fuente de verdad de barras y prosa), día → mes → año.
  const interactions: EasternInteractionHit[] = [];
  for (const key of ["day", "month", "year"] as const) {
    const pillar = pillars[key];
    if (!pillar) continue;
    const b = pillar.branch;
    for (const h of pairHits(animalBranch, b)) {
      interactions.push({
        pillar: key, type: h.type, withBranch: b,
        withAnimal: EASTERN_ANIMALS[b]!, favorable: h.type === "six_combo",
        ...(h.element ? { element: h.element } : {}),
      });
    }
  }

  // Puntuación: ver bloque EFFECTS arriba. Drivers = exactamente los hits que
  // movieron cada área (con su delta ya ponderado) — nunca otra cosa.
  const scores: Record<EasternArea, number> = { work: SCORE_BASE, money: SCORE_BASE, love: SCORE_BASE, health: SCORE_BASE, luck: SCORE_BASE };
  const driversByArea: Record<EasternArea, EasternDriver[]> = { work: [], money: [], love: [], health: [], luck: [] };
  for (const hit of interactions) {
    const weight = PILLAR_WEIGHT[hit.pillar];
    for (const area of EASTERN_AREAS) {
      const base = EFFECTS[hit.type][area];
      if (!base) continue;
      const delta = base * weight;
      scores[area] += delta;
      driversByArea[area].push({ ...hit, delta });
    }
  }
  const areas: EasternAreaScore[] = EASTERN_AREAS.map((area) => {
    const score = Math.max(0, Math.min(100, Math.round(scores[area])));
    return { area, score, tone: scoreTone(score), drivers: driversByArea[area] };
  });

  // Derivados para la prosa (EasternProsePayload en content/horoscope-es.ts).
  const clashHit = interactions.find((h) => h.type === "clash") ?? null;
  const harmonies = [...new Set(
    interactions.filter((h) => h.type === "six_combo").map((h) => h.withAnimal),
  )];
  const taiSui = period === "year" ? taiSuiHits(animalBranch, pillars.year.branch) : null;
  const jieDates = jieDatesMemo(range.fromIso, range.toIso);
  const favorable = interactions.filter((h) => h.favorable).length;
  const tense = interactions.filter((h) => !h.favorable).length;
  const toneBalance: EasternPayload["toneBalance"] =
    favorable > 0 && tense === 0 ? "favorable" : tense > 0 && favorable === 0 ? "tense" : "mixed";

  // Wu Xing del periodo: elemento del TRONCO del pilar focal (hoy → día,
  // semana/mes → mes, año → año) frente al elemento de la rama del animal.
  // El focal SIEMPRE existe para su periodo (ver EasternPeriodPillars).
  const focal = (period === "today" ? pillars.day : period === "year" ? pillars.year : pillars.month)!;
  const periodElement = HEAVENLY_STEMS[focal.stem]!.element;
  const animalElement = EARTHLY_BRANCHES[animalBranch]!.element;
  const wuXing: EasternWuXing = {
    periodElement, animalElement, relation: wuXingRelation(periodElement, animalElement),
  };

  // Capa personal opcional: pilares natales vs pilares del periodo, par a par.
  let natalHits: EasternNatalHit[] | undefined;
  if (natalPillars) {
    natalHits = [];
    const natalEntries: Array<{ pos: PillarPos; pillar: Pillar }> = [
      { pos: "year", pillar: natalPillars.year },
      { pos: "month", pillar: natalPillars.month },
      { pos: "day", pillar: natalPillars.day },
      ...(natalPillars.hour ? [{ pos: "hour" as const, pillar: natalPillars.hour }] : []),
    ];
    for (const { pos, pillar } of natalEntries) {
      for (const key of ["day", "month", "year"] as const) {
        const periodPillar = pillars[key];
        if (!periodPillar) continue;
        const b = periodPillar.branch;
        for (const h of pairHits(pillar.branch, b)) {
          natalHits.push({
            natalPillar: pos, periodPillar: key, type: h.type,
            withBranch: b, favorable: h.type === "six_combo",
          });
        }
      }
    }
  }

  return {
    animal, period, tz: isValidTz(tz) ? tz : "utc",
    range: { fromIso: range.fromIso, toIso: range.toIso },
    solarYear, pillars, jieDates, interactions,
    clash: clashHit ? { withAnimal: clashHit.withAnimal } : null,
    harmonies, taiSui,
    monthChange: jieDates.length ? { atIso: jieDates[0]!.atIso } : null,
    wuXing, toneBalance, areas,
    ...(natalHits ? { natalHits } : {}),
  };
}

// Caché FIFO acotada (patrón exacto de western.ts) — SOLO el payload universal,
// sin natalPillars (la capa personal jamás debe compartirse entre usuarios).
const CACHE_MAX = 512;
const cache = new Map<string, EasternPayload>();

export function cachedEasternHoroscope(
  animal: string, period: HoroscopePeriod, tz: string, nowIso?: string,
): EasternPayload {
  const r = resolveEasternPeriodRange(period, tz, nowIso);
  // Clave por el ARRANQUE del rango (instante UTC), no por la fecha local:
  // fromIso ya encierra fecha local + offset (es la medianoche/lunes/día-1/
  // Lichun local llevado a UTC), y TODO el payload se deriva del rango + su
  // punto de referencia. Así cada periodo expira cuando le toca — today gira
  // a diario, week por semana, month por mes y year SOLO al cruzar Lichun
  // (antes giraba a diario sin motivo y el año cambiaba de contenido cada día).
  const key = `${animal}:${period}:${r.fromIso}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const payload = computeEasternHoroscope(animal, period, tz, nowIso);
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, payload);
  return payload;
}
