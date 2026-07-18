// apps/web/lib/timeline/events.ts
// "Camino de vida" — capa PURA de derivación de eventos. Importa ÚNICAMENTE de
// @aluna/core: cero sweph, cero efemérides nativas. El buscador de retornos
// astronómicos (jupiter/saturn/uranus) vive aparte en returns.ts (server).
import {
  personalCycles,
  pinnacles,
  type BirthDate,
  type LuckSequence,
  type AnnualPillarItem,
} from "@aluna/core";
import type { TimelineEvent } from "./types";

/** `personal-year-1`: inicio de cada ciclo de 9 años (peso 2). */
export function numerologyEvents(
  birth: BirthDate,
  fromYear: number,
  toYear: number,
): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  for (let y = fromYear; y <= toYear; y++) {
    // personalYear depende solo de mes/día de nacimiento + el AÑO de asOf (ver
    // packages/core/src/numerology/cycles.ts) — cualquier mes/día de asOf sirve.
    const { personalYear } = personalCycles(birth, { year: y, month: 1, day: 1 });
    if (personalYear.value === 1) {
      events.push({
        id: `numerology:personal-year-1:${y}`,
        year: y,
        system: "numerology",
        kind: "personal-year-1",
        weight: 2,
      });
    }
  }

  // pinnacle-change: las 3 fronteras reales (entrada al 2º, 3º y 4º pináculo).
  // El array de pinnacles() tiene 4 elementos; el índice 0 es el pináculo de
  // nacimiento (sin "cambio" — arranca en edad 0), así que las fronteras son
  // los índices 1..3. ordinal = número humano del pináculo que empieza (2,3,4).
  const all = pinnacles(birth);
  for (let i = 1; i < all.length; i++) {
    const p = all[i]!;
    const year = birth.year + p.startAge;
    const ordinal = i + 1;
    events.push({
      id: `numerology:pinnacle-change:${year}:${ordinal}`,
      year,
      system: "numerology",
      kind: "pinnacle-change",
      weight: 2,
      ordinal,
      meta: { pinnacleValue: p.value },
    });
  }

  return events;
}

/** `luck-pillar-change` (大運) + `annual-clash` (冲 anual vs la rama del DÍA natal). */
export function baziEvents(
  luck: LuckSequence,
  annual: AnnualPillarItem[],
  birthMonth: number,
  assumedDirection?: boolean,
): TimelineEvent[] {
  const lichunAmbiguous = birthMonth === 1 || birthMonth === 2;
  const events: TimelineEvent[] = [];

  luck.pillars.forEach((item, i) => {
    const ordinal = i + 1;
    events.push({
      id: `bazi:luck-pillar-change:${item.startYear}:${ordinal}`,
      year: item.startYear,
      system: "bazi",
      kind: "luck-pillar-change",
      weight: 2,
      ordinal,
      meta: {
        tenGod: item.tenGod,
        nayin: item.nayin.key,
        startAge: item.startAge,
        ...(lichunAmbiguous ? { lichunAmbiguous: true as const } : {}),
        ...(assumedDirection ? { luckDirectionAssumed: true as const } : {}),
      },
    });
  });

  for (const a of annual) {
    const clashesDay = a.marks.some((m) => m.type === "clash" && m.vs === "day");
    if (!clashesDay) continue;
    events.push({
      id: `bazi:annual-clash:${a.year}`,
      year: a.year,
      system: "bazi",
      kind: "annual-clash",
      weight: 1,
      meta: {
        ...(lichunAmbiguous ? { lichunAmbiguous: true as const } : {}),
      },
    });
  }

  return events;
}

const CONFLUENCE_KINDS: readonly TimelineEvent["kind"][] = [
  "jupiter-return",
  "personal-year-1",
  "luck-pillar-change",
];
const MAX_CONFLUENCE_EVENTS = 3;

/**
 * Años futuros (currentYear..horizonYear) donde coinciden ≥2 de los kinds
 * "de ritmo" ({@link CONFLUENCE_KINDS}). Máx {@link MAX_CONFLUENCE_EVENTS},
 * antes primero. Descriptivo, nunca promesa (se resuelve en el contenido/UI).
 */
export function confluenceEvents(
  events: TimelineEvent[],
  currentYear: number,
  horizonYear: number,
): TimelineEvent[] {
  const kindsByYear = new Map<number, Set<TimelineEvent["kind"]>>();
  for (const e of events) {
    if (e.year < currentYear || e.year > horizonYear) continue;
    if (!CONFLUENCE_KINDS.includes(e.kind)) continue;
    if (!kindsByYear.has(e.year)) kindsByYear.set(e.year, new Set());
    kindsByYear.get(e.year)!.add(e.kind);
  }

  const years = [...kindsByYear.keys()]
    .filter((y) => kindsByYear.get(y)!.size >= 2)
    .sort((a, b) => a - b)
    .slice(0, MAX_CONFLUENCE_EVENTS);

  return years.map((year) => {
    const kinds = [...kindsByYear.get(year)!].sort();
    return {
      id: `life:confluence:${year}`,
      year,
      system: "life",
      kind: "confluence",
      weight: 2,
      meta: { signals: kinds.join("+") },
    } satisfies TimelineEvent;
  });
}

/** Aplana, deduplica por id (gana la primera aparición) y ordena
 * año asc → peso desc → id asc. */
export function mergeTimeline(parts: TimelineEvent[][]): TimelineEvent[] {
  const byId = new Map<string, TimelineEvent>();
  for (const part of parts) {
    for (const e of part) {
      if (!byId.has(e.id)) byId.set(e.id, e);
    }
  }
  return [...byId.values()].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    if (a.weight !== b.weight) return b.weight - a.weight;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}
