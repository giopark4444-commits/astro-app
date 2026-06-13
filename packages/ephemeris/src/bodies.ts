// packages/ephemeris/src/bodies.ts
import sweph from "sweph";
import { initEphemeris } from "./init";
import { normalizeAngle } from "@aluna/core";

export interface BodiesOptions {
  nodeType?: "true" | "mean"; // por defecto true
  lilithType?: "mean" | "oscu"; // por defecto mean
  sidereal?: boolean; // por defecto false (tropical)
}

export interface RawBody {
  body: string;
  longitude: number;
  speed: number; // °/día
  retrograde: boolean;
}

const BASE_PLANETS: Array<[string, number]> = [
  ["sun", 0], ["moon", 1], ["mercury", 2], ["venus", 3], ["mars", 4],
  ["jupiter", 5], ["saturn", 6], ["uranus", 7], ["neptune", 8], ["pluto", 9],
  ["chiron", 15],
];

/** Posiciones eclípticas de los 14 puntos para un Día Juliano (ET). */
export function computeBodies(julianDayEt: number, opts: BodiesOptions = {}): RawBody[] {
  initEphemeris();
  const sidereal = opts.sidereal ?? false;
  if (sidereal) {
    sweph.set_sid_mode(sweph.constants.SE_SIDM_LAHIRI, 0, 0);
  }
  let flags = sweph.constants.SEFLG_SWIEPH | sweph.constants.SEFLG_SPEED;
  if (sidereal) flags |= sweph.constants.SEFLG_SIDEREAL;

  const out: RawBody[] = [];

  for (const [name, id] of BASE_PLANETS) {
    out.push(calcBody(name, id, julianDayEt, flags));
  }

  // Nodo Norte (verdadero o medio)
  const nodeId = (opts.nodeType ?? "true") === "true"
    ? sweph.constants.SE_TRUE_NODE
    : sweph.constants.SE_MEAN_NODE;
  const north = calcBody("north_node", nodeId, julianDayEt, flags);
  out.push(north);
  // Nodo Sur = Norte + 180°
  out.push({
    body: "south_node",
    longitude: normalizeAngle(north.longitude + 180),
    speed: north.speed,
    retrograde: north.retrograde,
  });

  // Lilith (media u osculatriz)
  const lilithId = (opts.lilithType ?? "mean") === "mean"
    ? sweph.constants.SE_MEAN_APOG
    : sweph.constants.SE_OSCU_APOG;
  out.push(calcBody("lilith", lilithId, julianDayEt, flags));

  return out;
}

function calcBody(name: string, id: number, jd: number, flags: number): RawBody {
  const r = sweph.calc(jd, id, flags);
  if (r.flag < 0) {
    throw new Error(`calc(${name}) falló: ${r.error}`);
  }
  const longitude = normalizeAngle(r.data[0]);
  const speed = r.data[3];
  return { body: name, longitude, speed, retrograde: speed < 0 };
}
