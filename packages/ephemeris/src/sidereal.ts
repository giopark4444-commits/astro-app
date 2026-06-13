// packages/ephemeris/src/sidereal.ts
import sweph from "sweph";

/** Mapea un nombre de ayanamsha al modo sideral de Swiss Ephemeris (por defecto Lahiri). */
export function ayanamshaId(name?: string): number {
  switch ((name ?? "lahiri").toLowerCase()) {
    case "fagan_bradley":
      return sweph.constants.SE_SIDM_FAGAN_BRADLEY;
    case "raman":
      return sweph.constants.SE_SIDM_RAMAN;
    case "krishnamurti":
      return sweph.constants.SE_SIDM_KRISHNAMURTI;
    case "lahiri":
    default:
      return sweph.constants.SE_SIDM_LAHIRI;
  }
}

/** Activa el modo sideral con el ayanamsha pedido (idempotente por llamada). */
export function applySiderealMode(ayanamsha?: string): void {
  sweph.set_sid_mode(ayanamshaId(ayanamsha), 0, 0);
}
