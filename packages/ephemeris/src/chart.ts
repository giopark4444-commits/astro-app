// packages/ephemeris/src/chart.ts
import {
  signOfLongitude, houseOfLongitude, dignityOf, detectAspects,
  computeDistribution, detectPatterns,
} from "@aluna/core";
import type { ChartInput, ChartResult, BodyPosition, AspectPoint } from "@aluna/core";
import { localToJulianDay } from "./time";
import { computeBodies } from "./bodies";
import { computeHouses } from "./houses";

const DISTRIBUTION_BODIES = new Set([
  "sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto",
]);

export function computeChart(input: ChartInput): ChartResult {
  const system = input.houseSystem ?? "placidus";
  const zodiac = input.zodiac ?? "tropical";
  const sidereal = zodiac === "sidereal";

  const jd = localToJulianDay(input);
  const raw = computeBodies(jd.julianDayEt, {
    nodeType: input.nodeType ?? "true",
    lilithType: input.lilithType ?? "mean",
    sidereal,
  });
  const houses = computeHouses(jd.julianDayUt, input.latitude, input.longitude, system, sidereal);

  const bodies: BodyPosition[] = raw.map((b) => {
    const sp = signOfLongitude(b.longitude);
    return {
      body: b.body,
      longitude: b.longitude,
      sign: sp.sign,
      signDegree: sp.signDegree,
      degree: sp.degree,
      minute: sp.minute,
      second: sp.second,
      speed: b.speed,
      retrograde: b.retrograde,
      house: houseOfLongitude(b.longitude, houses.cusps),
      dignity: dignityOf(b.body, sp.sign),
    };
  });

  const aspectPoints: AspectPoint[] = [
    ...bodies.map((b) => ({ key: b.body, longitude: b.longitude, speed: b.speed })),
    { key: "ascendant", longitude: houses.ascendant },
    { key: "midheaven", longitude: houses.midheaven },
  ];
  const aspects = detectAspects(aspectPoints);

  const planetSubset = bodies
    .filter((b) => DISTRIBUTION_BODIES.has(b.body))
    .map((b) => ({ key: b.body, longitude: b.longitude }))
    .sort((a, b) => a.longitude - b.longitude);
  const distribution = computeDistribution(planetSubset);
  const patterns = detectPatterns(planetSubset);

  return {
    bodies,
    houses,
    aspects,
    distribution,
    patterns,
    meta: {
      julianDayUt: jd.julianDayUt,
      julianDayEt: jd.julianDayEt,
      utcHour: jd.utcHour,
      zodiac,
    },
  };
}
