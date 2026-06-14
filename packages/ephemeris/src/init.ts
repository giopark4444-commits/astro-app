// packages/ephemeris/src/init.ts
import { join } from "node:path";
import sweph from "sweph";

let initialized = false;
let configuredPath: string | null = null;

/** Fija explícitamente la carpeta de archivos .se1. Necesario bajo bundlers
 *  (p.ej. Next/webpack), donde import.meta.url no resuelve a una ruta de archivo:
 *  el consumidor calcula la ruta en Node puro (process.cwd) y la inyecta aquí. */
export function setEphePath(p: string): void {
  configuredPath = p;
  initialized = false;
}

/** Registra la ruta de Swiss Ephemeris (idempotente). Prioridad: setter explícito
 *  → ALUNA_EPHE_PATH → ./ephe relativo al cwd (los tests corren desde el paquete). */
export function initEphemeris(): void {
  if (initialized) return;
  const ephePath = configuredPath ?? process.env.ALUNA_EPHE_PATH ?? join(process.cwd(), "ephe");
  sweph.set_ephe_path(ephePath);
  initialized = true;
}
