// packages/compute/src/get-or-compute.ts
import { computeChart } from "@aluna/ephemeris";
import type { ChartInput, ChartResult, ChartKind } from "@aluna/core";
import { cacheKey } from "./cache-key";
import type { ChartStore } from "./chart-store";

export interface GetOrComputeArgs {
  store: ChartStore;
  userId: string;
  birthProfileId: string;
  input: ChartInput;
  /** tipo de carta; por defecto "natal" (Fase 1). */
  kind?: ChartKind;
}

export interface GetOrComputeResult {
  chart: ChartResult;
  cacheKey: string;
  /** true si vino de caché; false si se calculó ahora. */
  cached: boolean;
}

/**
 * Devuelve la carta de un perfil. Si está cacheada (mismo cache_key) la lee de
 * `charts`; si no, la calcula con Swiss Ephemeris, la guarda y la devuelve.
 * `computeChart` inicializa el motor nativo de forma transitiva (no hay setup aparte).
 */
export async function getOrComputeChart(args: GetOrComputeArgs): Promise<GetOrComputeResult> {
  const { store, userId, birthProfileId, input } = args;
  const kind = args.kind ?? "natal";
  const key = cacheKey(input, kind);

  const hit = await store.findByKey(birthProfileId, key);
  if (hit) return { chart: hit, cacheKey: key, cached: true };

  const chart = computeChart(input);
  // Dos misses concurrentes calculan el mismo resultado (computeChart es determinista);
  // el save es idempotente (ignoreDuplicates en el adaptador), así que la carrera es benigna.
  await store.save({
    birthProfileId,
    userId,
    cacheKey: key,
    kind,
    houseSystem: input.houseSystem ?? "placidus",
    zodiac: input.zodiac ?? "tropical",
    result: chart,
  });
  return { chart, cacheKey: key, cached: false };
}
