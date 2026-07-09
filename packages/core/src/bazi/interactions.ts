// packages/core/src/bazi/interactions.ts
// Interacciones clásicas entre PILARES NATALES: combinaciones de tronco 天干五合,
// combinaciones de rama 六合, trinos 三合 (completos y medios con pivote), choques
// 六沖, castigos 刑 (grupos, par 子卯 y auto-castigos) y daños 六害.
// La TRANSFORMACIÓN (化) de las combinaciones NO se evalúa (fuera de alcance, spec §10):
// solo se reporta la combinación y su elemento asociado.
import type { Pillar, StemDef } from "./bazi";

export type PillarPos = "year" | "month" | "day" | "hour";
export interface PillarSet {
  year: Pillar;
  month: Pillar;
  day: Pillar;
  hour?: Pillar | null;
}
export type InteractionType =
  | "stem_combo" | "six_combo" | "trine" | "half_trine"
  | "clash" | "punishment" | "self_punishment" | "harm";
export interface Interaction {
  type: InteractionType;
  positions: PillarPos[];
  element?: StemDef["element"];
}

type El = StemDef["element"];
const mod = (n: number, m: number) => ((n % m) + m) % m;

/** 天干五合: pares de troncos (a<b) → elemento de la combinación. */
const STEM_COMBOS: readonly { a: number; b: number; element: El }[] = [
  { a: 0, b: 5, element: "earth" }, // 甲己
  { a: 1, b: 6, element: "metal" }, // 乙庚
  { a: 2, b: 7, element: "water" }, // 丙辛
  { a: 3, b: 8, element: "wood" }, // 丁壬
  { a: 4, b: 9, element: "fire" }, // 戊癸
] as const;

/** 六合: pares de ramas → elemento. */
const SIX_COMBOS: readonly { a: number; b: number; element: El }[] = [
  { a: 0, b: 1, element: "earth" }, // 子丑
  { a: 2, b: 11, element: "wood" }, // 寅亥
  { a: 3, b: 10, element: "fire" }, // 卯戌
  { a: 4, b: 9, element: "metal" }, // 辰酉
  { a: 5, b: 8, element: "water" }, // 巳申
  { a: 6, b: 7, element: "earth" }, // 午未
] as const;

/** 三合: trinos [inicio, pivote, tumba] → elemento. El pivote (子午卯酉) define el medio trino. */
export const TRINES: readonly { branches: readonly [number, number, number]; element: El }[] = [
  { branches: [8, 0, 4], element: "water" }, // 申子辰
  { branches: [2, 6, 10], element: "fire" }, // 寅午戌
  { branches: [5, 9, 1], element: "metal" }, // 巳酉丑
  { branches: [11, 3, 7], element: "wood" }, // 亥卯未
] as const;

/** 六害: pares de ramas que se dañan. */
const HARMS: readonly (readonly [number, number])[] = [
  [0, 7], [1, 6], [2, 5], [3, 4], [8, 11], [9, 10],
] as const;

/** 刑 de grupo: 寅巳申 (ingratitud), 丑戌未 (abuso). El par 子卯 y los auto-castigos van aparte. */
const PUNISH_GROUPS: readonly (readonly [number, number, number])[] = [
  [2, 5, 8],
  [1, 10, 7],
] as const;
const SELF_PUNISH = new Set([4, 6, 9, 11]); // 辰午酉亥

const pairMatch = (a: number, b: number, x: number, y: number) =>
  (a === x && b === y) || (a === y && b === x);

/** Interacciones de UN PAR de ramas (para marcar 流年 contra las natales). */
export function branchPairInteractions(
  a: number,
  b: number,
): { type: InteractionType; element?: El }[] {
  const A = mod(a, 12);
  const B = mod(b, 12);
  const out: { type: InteractionType; element?: El }[] = [];
  const combo = SIX_COMBOS.find((c) => pairMatch(A, B, c.a, c.b));
  if (combo) out.push({ type: "six_combo", element: combo.element });
  if (mod(A + 6, 12) === B) out.push({ type: "clash" });
  if (HARMS.some(([x, y]) => pairMatch(A, B, x, y))) out.push({ type: "harm" });
  if (pairMatch(A, B, 0, 3)) out.push({ type: "punishment" }); // 子卯
  if (A === B && SELF_PUNISH.has(A)) out.push({ type: "self_punishment" });
  // Pares dentro de un grupo de castigo (寅巳, 巳申, 寅申, 丑戌, 戌未, 丑未) también son 刑.
  if (PUNISH_GROUPS.some((g) => g.includes(A) && g.includes(B) && A !== B)) {
    out.push({ type: "punishment" });
  }
  return out;
}

/** Todas las interacciones del set natal (3 o 4 pilares). Determinista y sin duplicados. */
export function detectInteractions(pillars: PillarSet): Interaction[] {
  const entries: { pos: PillarPos; pillar: Pillar }[] = [
    { pos: "year", pillar: pillars.year },
    { pos: "month", pillar: pillars.month },
    { pos: "day", pillar: pillars.day },
  ];
  if (pillars.hour) entries.push({ pos: "hour", pillar: pillars.hour });

  const out: Interaction[] = [];

  // Troncos: 五合 por pares.
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const sc = STEM_COMBOS.find((c) =>
        pairMatch(entries[i]!.pillar.stem, entries[j]!.pillar.stem, c.a, c.b),
      );
      if (sc) out.push({ type: "stem_combo", positions: [entries[i]!.pos, entries[j]!.pos], element: sc.element });
    }
  }

  // Trinos completos y grupos de castigo (tríos) — busca las 3 ramas presentes.
  const tri = (branches: readonly [number, number, number]): PillarPos[][] => {
    const found = branches.map((b) => entries.filter((e) => e.pillar.branch === b).map((e) => e.pos));
    if (found.some((f) => f.length === 0)) return [];
    // una sola instancia por trío (primera aparición de cada rama) — suficiente y sin explosión combinatoria
    return [[found[0]![0]!, found[1]![0]!, found[2]![0]!]];
  };
  for (const t of TRINES) {
    for (const positions of tri(t.branches)) out.push({ type: "trine", positions, element: t.element });
  }
  for (const g of PUNISH_GROUPS) {
    for (const positions of tri(g)) out.push({ type: "punishment", positions });
  }

  // Pares de ramas.
  const trinePositions = new Set(
    out.filter((i) => i.type === "trine").flatMap((i) => i.positions),
  );
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i]!;
      const b = entries[j]!;
      for (const hit of branchPairInteractions(a.pillar.branch, b.pillar.branch)) {
        // castigo de grupo por pares ya cubierto arriba cuando está el trío completo:
        if (hit.type === "punishment" && PUNISH_GROUPS.some((g) => g.includes(a.pillar.branch) && g.includes(b.pillar.branch))) {
          const full = out.some((x) => x.type === "punishment" && x.positions.length === 3 && x.positions.includes(a.pos) && x.positions.includes(b.pos));
          if (full) continue;
        }
        out.push({ type: hit.type, positions: [a.pos, b.pos], ...(hit.element ? { element: hit.element } : {}) });
      }
      // Medio trino: dos ramas de un mismo trino incluyendo el PIVOTE, sin el trío completo.
      const t = TRINES.find(
        (tr) =>
          tr.branches.includes(a.pillar.branch as never) &&
          tr.branches.includes(b.pillar.branch as never) &&
          a.pillar.branch !== b.pillar.branch &&
          (a.pillar.branch === tr.branches[1] || b.pillar.branch === tr.branches[1]),
      );
      if (t && !(trinePositions.has(a.pos) && trinePositions.has(b.pos))) {
        out.push({ type: "half_trine", positions: [a.pos, b.pos], element: t.element });
      }
    }
  }
  return out;
}
