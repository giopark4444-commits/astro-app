// RNG del gesto de barajar — DUPLICADO consciente de apps/web/lib/tarot/rng.ts
// (apps/mobile no puede importar de apps/web; mismo criterio que tarot-api.ts).
//
// DIFERENCIA con la web (documentada a pedido del plan, Task 4): la web usa
// `crypto.getRandomValues` a secas porque el navegador siempre lo tiene. En
// React Native la fuente depende del runtime: Hermes moderno (el de Expo 56)
// SÍ expone `global.crypto.getRandomValues`, pero no está garantizado en todo
// runtime JS de RN — así que se detecta y, si falta, se cae a
// `Math.random() * 2**32` como palabra de entropía. En ambos caminos el
// timestamp exacto del gesto (soltar el mazo) participa vía XOR (spec §3.1):
// la semilla nace del instante humano, la entropía solo la condimenta. Con el
// fallback la entropía es más débil (Math.random no es criptográfico), pero
// para un rito de tarot la calidad de la semilla es simbólica, no de seguridad.
import { mulberry32, type Rng } from "@aluna/core";

type MaybeCrypto = { getRandomValues?: (arr: Uint32Array) => Uint32Array } | undefined;

/** Una palabra de 32 bits de entropía: crypto de Hermes si existe, Math.random si no. */
function entropyWord(): number {
  const c = (globalThis as { crypto?: MaybeCrypto }).crypto;
  if (c && typeof c.getRandomValues === "function") {
    return c.getRandomValues(new Uint32Array(1))[0]!;
  }
  return (Math.random() * 2 ** 32) >>> 0;
}

/**
 * Siembra mulberry32 mezclando entropía con el instante exacto del gesto
 * (`releaseTimestampMs`). Dos gestos en el mismo instante con distinta
 * entropía dan secuencias distintas; con crypto mockeado a un valor fijo el
 * mezclado es determinista (para tests).
 */
export function gestureRng(releaseTimestampMs: number): Rng {
  const seed = (entropyWord() ^ (releaseTimestampMs >>> 0)) >>> 0;
  return mulberry32(seed);
}
