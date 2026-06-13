// packages/ephemeris/src/init.ts
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import sweph from "sweph";

let initialized = false;

/** Resuelve la carpeta ./ephe del paquete y registra la ruta en Swiss Ephemeris (idempotente). */
export function initEphemeris(): void {
  if (initialized) return;
  const here = dirname(fileURLToPath(import.meta.url)); // .../packages/ephemeris/src
  const ephePath = join(here, "..", "ephe");
  sweph.set_ephe_path(ephePath);
  initialized = true;
}
