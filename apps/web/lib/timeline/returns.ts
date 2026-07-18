// apps/web/lib/timeline/returns.ts
// "Camino de vida" — buscador de retornos astronómicos (Júpiter/Saturno/Urano).
// SERVER-only: usa @aluna/ephemeris (sweph nativo) vía exactAspectAt. La capa
// PURA de eventos (numerología/bazi/confluencias) vive en events.ts y no debe
// importar esto.
import path from "node:path";
import { DateTime } from "luxon";
import { exactAspectAt, setEphePath } from "@aluna/ephemeris";
import type { TimelineEvent } from "./types";

setEphePath(path.join(process.cwd(), "..", "..", "packages", "ephemeris", "ephe"));

/** Días por año trópico medio (misma constante que el resto del motor usa para años fraccionarios). */
const DAYS_PER_YEAR = 365.2425;

export interface ReturnSpec {
  /** Cuerpo en el catálogo de sweph (jupiter/saturn/uranus). */
  body: string;
  /** Periodo orbital medio, en años. */
  periodYears: number;
  /** Ventana de búsqueda inicial alrededor de la semilla, en días. */
  windowDays: number;
  /** Ángulo del aspecto sobre la longitud natal (0 = conjunción/retorno, 180 = oposición). */
  aspectAngle: number;
  /** Factor sobre periodYears para la primera semilla (1 = retorno completo, 0.5 = oposición a mitad de ciclo). */
  seedFactor: number;
  /** Tope de eventos a emitir (p. ej. Saturno v1 solo quiere el 1º y 2º retorno). undefined = sin tope. */
  maxOrdinal?: number;
}

export const RETURN_SPECS: Record<
  "jupiter" | "saturn" | "uranus-opposition" | "uranus-return",
  ReturnSpec
> = {
  jupiter: {
    body: "jupiter",
    periodYears: 11.862,
    windowDays: 45,
    aspectAngle: 0,
    seedFactor: 1,
  },
  saturn: {
    body: "saturn",
    periodYears: 29.457,
    windowDays: 120,
    aspectAngle: 0,
    seedFactor: 1,
    maxOrdinal: 2,
  },
  "uranus-opposition": {
    body: "uranus",
    periodYears: 84.02,
    windowDays: 240,
    aspectAngle: 180,
    seedFactor: 0.5,
    maxOrdinal: 1,
  },
  "uranus-return": {
    body: "uranus",
    periodYears: 84.02,
    windowDays: 240,
    aspectAngle: 0,
    seedFactor: 1,
    maxOrdinal: 1,
  },
};

export interface FoundReturn {
  dateIso: string;
  year: number;
  ordinal: number;
  approx: boolean;
}

/**
 * Encuentra las repeticiones de un aspecto (retorno/oposición) de `spec` sobre
 * `natalLongitude`, desde el nacimiento hasta `toIso`.
 *
 * Algoritmo (auto-correctivo): semilla₁ = nacimiento + seedFactor×periodo.
 * exactAspectAt busca la fecha EXACTA cerca de la semilla con la ventana de la
 * spec; si no encuentra nada (borde de la ventana o cruce fuera de rango),
 * reintenta con el doble de ventana; si SIGUE sin encontrar nada, jamás revienta
 * — emite un evento `approx: true` anclado a la semilla misma (mejor una fecha
 * aproximada que ningún evento). La siguiente semilla siempre se recalcula desde
 * la fecha ENCONTRADA (exacta o aproximada) + un periodo completo — así los
 * errores de la órbita media no se acumulan ciclo tras ciclo.
 */
export function findReturns(
  natalLongitude: number,
  birthIso: string,
  toIso: string,
  spec: ReturnSpec,
): FoundReturn[] {
  const birth = DateTime.fromISO(birthIso, { zone: "utc" });
  const horizon = DateTime.fromISO(toIso, { zone: "utc" });
  const results: FoundReturn[] = [];

  let seed = birth.plus({ days: spec.seedFactor * spec.periodYears * DAYS_PER_YEAR });
  let ordinal = 1;

  while (seed <= horizon) {
    if (spec.maxOrdinal !== undefined && ordinal > spec.maxOrdinal) break;

    const seedIso = seed.toUTC().toISO()!;
    let foundIso = exactAspectAt(spec.body, natalLongitude, spec.aspectAngle, seedIso, spec.windowDays);
    let approx = false;
    if (foundIso === null) {
      foundIso = exactAspectAt(spec.body, natalLongitude, spec.aspectAngle, seedIso, spec.windowDays * 2);
    }
    if (foundIso === null) {
      foundIso = seedIso;
      approx = true;
    }

    const found = DateTime.fromISO(foundIso, { zone: "utc" });
    // Nunca emitir eventos anteriores al nacimiento (borde teórico de spec.seedFactor<1).
    if (found >= birth && found <= horizon) {
      results.push({ dateIso: foundIso, year: found.year, ordinal, approx });
    }

    seed = found.plus({ days: spec.periodYears * DAYS_PER_YEAR });
    ordinal += 1;
  }

  return results;
}

interface NatalBody {
  /** ChartResult.bodies usa el campo `body` (no `key`) como clave del cuerpo. */
  body: string;
  longitude: number;
}

const KIND_BY_SPEC: Record<keyof typeof RETURN_SPECS, TimelineEvent["kind"]> = {
  jupiter: "jupiter-return",
  saturn: "saturn-return",
  "uranus-opposition": "uranus-opposition",
  "uranus-return": "uranus-return",
};

const WEIGHT_BY_SPEC: Record<keyof typeof RETURN_SPECS, 1 | 2 | 3> = {
  jupiter: 1,
  saturn: 3,
  "uranus-opposition": 3,
  "uranus-return": 2,
};

const BODY_KEY: Record<keyof typeof RETURN_SPECS, string> = {
  jupiter: "jupiter",
  saturn: "saturn",
  "uranus-opposition": "uranus",
  "uranus-return": "uranus",
};

/**
 * Mapea el catálogo completo de retornos (Júpiter/Saturno/oposición y retorno
 * de Urano) a TimelineEvent, a partir de las longitudes natales de la carta.
 */
export function astroTimelineEvents(
  natal: { bodies: NatalBody[] },
  birthIso: string,
  toIso: string,
): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  for (const key of Object.keys(RETURN_SPECS) as (keyof typeof RETURN_SPECS)[]) {
    const spec = RETURN_SPECS[key];
    const bodyKey = BODY_KEY[key];
    const natalBody = natal.bodies.find((b) => b.body === bodyKey);
    if (!natalBody) continue;

    const kind = KIND_BY_SPEC[key];
    const weight = WEIGHT_BY_SPEC[key];
    const found = findReturns(natalBody.longitude, birthIso, toIso, spec);

    for (const r of found) {
      events.push({
        id: `astro:${kind}:${r.year}:${r.ordinal}`,
        year: r.year,
        dateIso: r.dateIso,
        approx: r.approx,
        system: "astro",
        kind,
        weight,
        ordinal: r.ordinal,
      });
    }
  }

  return events;
}
