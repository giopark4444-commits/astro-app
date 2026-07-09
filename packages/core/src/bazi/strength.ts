// packages/core/src/bazi/strength.ts
// Fuerza del Maestro del Día (身強/身弱) como PUNTAJE TRANSPARENTE — método declarado:
//   1) Mando del mes 月令 (~40%): estado estacional 旺相休囚死 del elemento del DM
//      respecto a la estación de la rama de mes.
//   2) Raíces 通根: troncos ocultos que apoyan (par o recurso del DM), ponderados por
//      pilar (mes > día > año ≈ hora) y por rango (principal > residual).
//   3) Apoyos visibles: troncos de año/mes/hora que son par o recurso.
// Verdicto con banda honesta "equilibrado" (45–55). Escuelas 從格 fuera de alcance
// (spec §10). Umbrales y pesos = constantes exportadas (fuente única para UI/tests).
import { HEAVENLY_STEMS, EARTHLY_BRANCHES, hiddenStems, type StemDef } from "./bazi";
import type { PillarPos, PillarSet } from "./interactions";

type El = StemDef["element"];
const mod = (n: number, m: number) => ((n % m) + m) % m;

/** Ciclo generador: wood→fire→earth→metal→water→wood. */
const GEN: readonly El[] = ["wood", "fire", "earth", "metal", "water"] as const;
const genIdx = (e: El) => GEN.indexOf(e);
/** Elemento a `offset` pasos del elemento `e` en el ciclo generador. */
export function elementAt(e: El, offset: number): El {
  return GEN[mod(genIdx(e) + offset, 5)]!;
}

export type SeasonState = "wang" | "xiang" | "xiu" | "qiu" | "si";
export type StrengthVerdict = "strong" | "weak" | "balanced";

export interface StrengthDriver {
  key: "season" | "root_principal" | "root_residual" | "visible_support";
  points: number;
  pillar: PillarPos;
}
export interface DayMasterStrength {
  score: number;
  verdict: StrengthVerdict;
  seasonState: SeasonState;
  drivers: StrengthDriver[];
}

export const STRENGTH_THRESHOLDS = { weakBelow: 45, strongAbove: 55 } as const;
export const STRENGTH_WEIGHTS = {
  season: { wang: 40, xiang: 28, xiu: 14, qiu: 7, si: 0 } as Record<SeasonState, number>,
  rootPrincipal: { month: 12, day: 9, year: 7, hour: 7 } as Record<PillarPos, number>,
  rootResidual: 3,
  visibleSupport: 7,
} as const;

/** Estación (elemento de mando) por rama de mes: 寅卯=madera, 巳午=fuego, 申酉=metal, 亥子=agua, 辰未戌丑=tierra. */
function seasonElement(monthBranch: number): El {
  return EARTHLY_BRANCHES[mod(monthBranch, 12)]!.element;
}

/** 旺相休囚死: relación del elemento del DM con el elemento de la estación. */
export function seasonState(dmElement: El, monthBranch: number): SeasonState {
  const m = seasonElement(monthBranch);
  const d = mod(genIdx(dmElement) - genIdx(m), 5); // fase del DM respecto a la estación
  // d=0 mismo → 旺; d=1 la estación lo genera → 相; d=4 el DM genera la estación → 休;
  // d=3 el DM controla la estación → 囚; d=2 la estación controla al DM → 死.
  switch (d) {
    case 0: return "wang";
    case 1: return "xiang";
    case 4: return "xiu";
    case 3: return "qiu";
    default: return "si";
  }
}

const helps = (dm: El, other: El) => other === dm || elementAt(dm, -1) === other; // par o recurso

export function dayMasterStrength(pillars: PillarSet): DayMasterStrength {
  const dm = HEAVENLY_STEMS[mod(pillars.day.stem, 10)]!;
  const drivers: StrengthDriver[] = [];

  const state = seasonState(dm.element, pillars.month.branch);
  drivers.push({ key: "season", points: STRENGTH_WEIGHTS.season[state], pillar: "month" });

  const entries: { pos: PillarPos; stem: number; branch: number }[] = [
    { pos: "year", stem: pillars.year.stem, branch: pillars.year.branch },
    { pos: "month", stem: pillars.month.stem, branch: pillars.month.branch },
    { pos: "day", stem: pillars.day.stem, branch: pillars.day.branch },
  ];
  if (pillars.hour) entries.push({ pos: "hour", stem: pillars.hour.stem, branch: pillars.hour.branch });

  // Raíces en troncos ocultos:
  for (const e of entries) {
    const hs = hiddenStems(e.branch);
    hs.forEach((h, i) => {
      const el = HEAVENLY_STEMS[h]!.element;
      if (!helps(dm.element, el)) return;
      if (i === 0) {
        drivers.push({ key: "root_principal", points: STRENGTH_WEIGHTS.rootPrincipal[e.pos], pillar: e.pos });
      } else {
        drivers.push({ key: "root_residual", points: STRENGTH_WEIGHTS.rootResidual, pillar: e.pos });
      }
    });
  }

  // Apoyos visibles (troncos que no son el propio DM):
  for (const e of entries) {
    if (e.pos === "day") continue;
    const el = HEAVENLY_STEMS[mod(e.stem, 10)]!.element;
    if (helps(dm.element, el)) {
      drivers.push({ key: "visible_support", points: STRENGTH_WEIGHTS.visibleSupport, pillar: e.pos });
    }
  }

  const raw = drivers.reduce((a, d) => a + d.points, 0);
  const score = Math.min(100, raw);
  const verdict: StrengthVerdict =
    score > STRENGTH_THRESHOLDS.strongAbove ? "strong"
    : score < STRENGTH_THRESHOLDS.weakBelow ? "weak"
    : "balanced";
  return { score, verdict, seasonState: state, drivers };
}

/** 喜用神/忌神 por verdicto. Offsets desde el DM: par 0, drenaje +1, riqueza +2, control +3, recurso +4(=-1). */
export function favorableElements(
  verdict: StrengthVerdict,
  dayStem: number,
): { favor: El[]; avoid: El[] } {
  const dm = HEAVENLY_STEMS[mod(dayStem, 10)]!.element;
  if (verdict === "weak") {
    return { favor: [elementAt(dm, -1), dm], avoid: [elementAt(dm, 1), elementAt(dm, 2), elementAt(dm, 3)] };
  }
  if (verdict === "strong") {
    return { favor: [elementAt(dm, 1), elementAt(dm, 2), elementAt(dm, 3)], avoid: [elementAt(dm, -1), dm] };
  }
  return { favor: [], avoid: [] };
}
