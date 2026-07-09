// packages/core/src/bazi/stars.ts
// 神煞 núcleo (set consensuado) + 空亡. Tablas clásicas:
// - 天乙貴人 por tronco de DÍA (甲戊庚牛羊 / 乙己鼠猴鄉 / 丙丁豬雞位 / 六辛逢馬虎 / 壬癸兔蛇藏)
// - 文昌 y 羊刃 por tronco de DÍA (羊刃 solo troncos yang — escuela estándar)
// - 桃花/驛馬/華蓋 por TRINO de la rama de día Y de año (ambas bases, deduplicado)
// - 空亡: par de ramas ausentes de la decena (旬) del pilar de DÍA
import type { Pillar } from "./bazi";
import { sexagenaryIndex } from "./nayin";
import type { PillarPos, PillarSet } from "./interactions";

const mod = (n: number, m: number) => ((n % m) + m) % m;

export type StarKey =
  | "nobleman" | "peach_blossom" | "sky_horse" | "academic" | "canopy" | "goat_blade" | "void";

export interface StarDef {
  key: StarKey;
  hanzi: string;
  hangul: string;
}
export const STARS: readonly StarDef[] = [
  { key: "nobleman", hanzi: "天乙貴人", hangul: "천을귀인" },
  { key: "peach_blossom", hanzi: "桃花", hangul: "도화" },
  { key: "sky_horse", hanzi: "驛馬", hangul: "역마" },
  { key: "academic", hanzi: "文昌", hangul: "문창" },
  { key: "canopy", hanzi: "華蓋", hangul: "화개" },
  { key: "goat_blade", hanzi: "羊刃", hangul: "양인" },
  { key: "void", hanzi: "空亡", hangul: "공망" },
] as const;

export interface StarHit {
  star: StarKey;
  pillar: PillarPos;
}

/** 天乙貴人 por tronco de día → ramas nobles. */
const NOBLEMAN: readonly (readonly number[])[] = [
  [1, 7], // 甲 → 丑未
  [0, 8], // 乙 → 子申
  [11, 9], // 丙 → 亥酉
  [11, 9], // 丁 → 亥酉
  [1, 7], // 戊 → 丑未
  [0, 8], // 己 → 子申
  [1, 7], // 庚 → 丑未
  [6, 2], // 辛 → 午寅
  [3, 5], // 壬 → 卯巳
  [3, 5], // 癸 → 卯巳
] as const;

/** 文昌 por tronco de día → rama. */
const ACADEMIC: readonly number[] = [5, 6, 8, 9, 8, 9, 11, 0, 2, 3] as const;

/** 羊刃 por tronco de día (solo yang; -1 = no aplica). */
const GOAT_BLADE: readonly number[] = [3, -1, 6, -1, 6, -1, 9, -1, 0, -1] as const;

/** Por grupo de trino (índice del grupo en TRINES-orden agua/fuego/metal/madera). */
const TRINE_GROUPS: readonly (readonly [number, number, number])[] = [
  [8, 0, 4], [2, 6, 10], [5, 9, 1], [11, 3, 7],
] as const;
const PEACH: readonly number[] = [9, 3, 6, 0] as const; // 酉 卯 午 子
const HORSE: readonly number[] = [2, 8, 11, 5] as const; // 寅 申 亥 巳
const CANOPY: readonly number[] = [4, 10, 1, 7] as const; // 辰 戌 丑 未

function trineGroupOf(branch: number): number {
  return TRINE_GROUPS.findIndex((g) => g.includes(mod(branch, 12)));
}

/** 空亡: las 2 ramas ausentes de la decena (旬) a la que pertenece el pilar de día. */
export function voidBranches(day: Pillar): [number, number] {
  const n = sexagenaryIndex(day);
  const decadeStart = n - (n % 10);
  return [mod(decadeStart + 10, 12), mod(decadeStart + 11, 12)];
}

export function symbolicStars(pillars: PillarSet): StarHit[] {
  const entries: { pos: PillarPos; pillar: Pillar }[] = [
    { pos: "year", pillar: pillars.year },
    { pos: "month", pillar: pillars.month },
    { pos: "day", pillar: pillars.day },
  ];
  if (pillars.hour) entries.push({ pos: "hour", pillar: pillars.hour });

  const out: StarHit[] = [];
  const push = (star: StarKey, pillar: PillarPos) => {
    if (!out.some((h) => h.star === star && h.pillar === pillar)) out.push({ star, pillar });
  };

  const dayStem = mod(pillars.day.stem, 10);

  // Por tronco de día:
  const noble = NOBLEMAN[dayStem]!;
  const academic = ACADEMIC[dayStem]!;
  const blade = GOAT_BLADE[dayStem]!;
  for (const e of entries) {
    if (noble.includes(e.pillar.branch)) push("nobleman", e.pos);
    if (e.pillar.branch === academic) push("academic", e.pos);
    if (blade >= 0 && e.pillar.branch === blade) push("goat_blade", e.pos);
  }

  // Por trino, con base en rama de DÍA y de AÑO:
  for (const base of [pillars.day.branch, pillars.year.branch]) {
    const g = trineGroupOf(base);
    if (g < 0) continue;
    for (const e of entries) {
      if (e.pillar.branch === PEACH[g]) push("peach_blossom", e.pos);
      if (e.pillar.branch === HORSE[g]) push("sky_horse", e.pos);
      if (e.pillar.branch === CANOPY[g]) push("canopy", e.pos);
    }
  }

  // 空亡:
  const [v1, v2] = voidBranches(pillars.day);
  for (const e of entries) {
    if (e.pos !== "day" && (e.pillar.branch === v1 || e.pillar.branch === v2)) push("void", e.pos);
  }

  return out;
}
