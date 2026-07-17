import { mulberry32, type Rng } from "@aluna/core";

/**
 * RNG de producción para gestos de tirada (revelar/mezclar en la UI):
 * mezcla entropía real (`crypto.getRandomValues`) con el instante exacto del
 * gesto (`releaseTimestampMs`) para sembrar `mulberry32`. El timestamp participa
 * de la semilla (spec §3.1) — dos gestos en el mismo instante con distinta
 * entropía de crypto dan secuencias distintas; mockeando crypto a un valor fijo
 * el mezclado es determinista (para tests).
 */
export function gestureRng(releaseTimestampMs: number): Rng {
  const cryptoWord = crypto.getRandomValues(new Uint32Array(1))[0]!;
  const seed = (cryptoWord ^ (releaseTimestampMs >>> 0)) >>> 0;
  return mulberry32(seed);
}
