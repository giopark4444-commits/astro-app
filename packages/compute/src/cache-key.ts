// packages/compute/src/cache-key.ts
import { createHash } from "node:crypto";
import type { ChartInput } from "@aluna/core";

/** Redondea a 6 decimales (~0.1 m) para evitar ruido de coma flotante en la clave. */
function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

/**
 * Clave de caché determinista para una carta. Codifica los datos de nacimiento +
 * todas las opciones que afectan el resultado, de forma que:
 *  - misma entrada -> misma clave (idempotente),
 *  - cualquier cambio (incluido editar el perfil en sitio) -> clave distinta
 *    (provoca cache-miss y recálculo, nunca sirve una carta obsoleta).
 * En tropical la ayanamsha se ignora (no fragmenta la clave); en sidereal usa
 * "lahiri" por defecto. El orden de los campos es fijo (no depende del orden de
 * claves de un objeto).
 */
export function cacheKey(input: ChartInput, kind = "natal"): string {
  const zodiac = input.zodiac ?? "tropical";
  const canonical: Array<[string, string | number]> = [
    ["kind", kind],
    ["year", input.year],
    ["month", input.month],
    ["day", input.day],
    ["hour", input.hour],
    ["minute", input.minute],
    ["tz", input.timeZone],
    ["lat", round6(input.latitude)],
    ["lon", round6(input.longitude)],
    ["house", input.houseSystem ?? "placidus"],
    ["zodiac", zodiac],
    ["ayanamsha", zodiac === "sidereal" ? (input.ayanamsha ?? "lahiri") : ""],
    ["node", input.nodeType ?? "true"],
    ["lilith", input.lilithType ?? "mean"],
  ];
  const payload = canonical.map(([k, v]) => `${k}=${v}`).join("|");
  return createHash("sha256").update(payload).digest("hex");
}
