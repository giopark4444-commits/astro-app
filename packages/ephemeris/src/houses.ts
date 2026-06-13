// packages/ephemeris/src/houses.ts
import sweph from "sweph";
import { initEphemeris } from "./init";
import { normalizeAngle } from "@aluna/core";
import type { HouseSystem, HousesResult } from "@aluna/core";
import { applySiderealMode } from "./sidereal";

const HSYS: Record<HouseSystem, string> = {
  placidus: "P",
  koch: "K",
  equal: "E",
  whole: "W",
  regiomontanus: "R",
  porphyry: "O",
};

/** Cúspides + Ascendente + Medio Cielo para un Día Juliano (UT). */
export function computeHouses(
  julianDayUt: number,
  latitude: number,
  longitude: number,
  system: HouseSystem,
  sidereal: boolean,
  ayanamsha?: string,
): HousesResult {
  initEphemeris();
  if (sidereal) {
    applySiderealMode(ayanamsha);
  }
  const flags = sidereal ? sweph.constants.SEFLG_SIDEREAL : 0;
  const res = sweph.houses_ex2(julianDayUt, flags, latitude, longitude, HSYS[system]);
  if (res.flag !== sweph.constants.OK) {
    throw new Error(`houses_ex2 falló: ${res.error ?? "error desconocido"}`);
  }
  const cusps = res.data.houses.slice(0, 12).map((c: number) => normalizeAngle(c));
  const ascendant = normalizeAngle(res.data.points[0]); // points[0] = Ascendente
  const midheaven = normalizeAngle(res.data.points[1]); // points[1] = Medio Cielo
  return { system, cusps, ascendant, midheaven };
}
