import { describe, expect, it } from "vitest";
import { computeChart } from "@aluna/ephemeris";
import { findReturns, astroTimelineEvents, RETURN_SPECS, type ReturnSpec } from "../returns";

// Nacido 1990-03-15 12:00 UTC, lugar arbitrario (Madrid) — solo nos importan
// las longitudes natales de Júpiter/Saturno/Urano, no la carta completa.
const BIRTH_ISO = "1990-03-15T12:00:00.000Z";
const natal = computeChart({
  year: 1990, month: 3, day: 15, hour: 12, minute: 0,
  timeZone: "utc", latitude: 40.4168, longitude: -3.7038,
});

const HORIZON_ISO = "2035-01-01T00:00:00.000Z";

function natalLongitude(body: string): number {
  return natal.bodies.find((b) => b.body === body)!.longitude;
}

describe("findReturns — Saturn return", () => {
  it("lands the first return in 2019 or 2020, ordinal 1, exact", () => {
    const found = findReturns(natalLongitude("saturn"), BIRTH_ISO, HORIZON_ISO, RETURN_SPECS.saturn);
    expect(found.length).toBeGreaterThan(0);
    const first = found[0]!;
    expect(first.ordinal).toBe(1);
    expect(first.approx).toBe(false);
    expect([2019, 2020]).toContain(first.year);
  });
});

describe("findReturns — Jupiter returns", () => {
  it("returns consecutive events spaced 11-13 years apart with sequential ordinals", () => {
    const found = findReturns(natalLongitude("jupiter"), BIRTH_ISO, HORIZON_ISO, RETURN_SPECS.jupiter);
    expect(found.length).toBeGreaterThanOrEqual(3);
    expect([2001, 2002]).toContain(found[0]!.year);
    for (let i = 0; i < found.length; i++) {
      expect(found[i]!.ordinal).toBe(i + 1);
    }
    for (let i = 1; i < found.length; i++) {
      const gap = found[i]!.year - found[i - 1]!.year;
      expect(gap).toBeGreaterThanOrEqual(11);
      expect(gap).toBeLessThanOrEqual(13);
    }
  });
});

describe("findReturns — Uranus opposition", () => {
  it("produces a single event landing 2031-2033", () => {
    const found = findReturns(
      natalLongitude("uranus"), BIRTH_ISO, HORIZON_ISO, RETURN_SPECS["uranus-opposition"],
    );
    expect(found.length).toBe(1);
    expect(found[0]!.ordinal).toBe(1);
    expect(found[0]!.year).toBeGreaterThanOrEqual(2031);
    expect(found[0]!.year).toBeLessThanOrEqual(2033);
  });
});

describe("findReturns — horizon clamp", () => {
  it("emits no events past toIso", () => {
    const closeHorizon = "2005-01-01T00:00:00.000Z";
    const found = findReturns(natalLongitude("jupiter"), BIRTH_ISO, closeHorizon, RETURN_SPECS.jupiter);
    for (const r of found) {
      expect(r.dateIso <= closeHorizon).toBe(true);
    }
    // dentro de 1990-2005 solo cabe el primer retorno (~2001-2002)
    expect(found.length).toBe(1);
  });
});

describe("findReturns — approx fallback", () => {
  it("emits approx:true anchored at the seed when the window can never bracket a root", () => {
    // Ventana absurdamente pequeña (0 días): exactAspectAt centra la ventana en la
    // semilla misma y no puede bracketear ningún cruce -> siempre null, incluso
    // tras duplicar la ventana (0*2 = 0) -> cae al camino approx.
    const zeroWindowSpec: ReturnSpec = { ...RETURN_SPECS.jupiter, windowDays: 0 };
    const found = findReturns(natalLongitude("jupiter"), BIRTH_ISO, HORIZON_ISO, zeroWindowSpec);
    expect(found.length).toBeGreaterThan(0);
    for (const r of found) {
      expect(r.approx).toBe(true);
    }
  });
});

describe("astroTimelineEvents", () => {
  it("maps the full catalog to TimelineEvent with the right systems/kinds/weights", () => {
    const events = astroTimelineEvents(natal, BIRTH_ISO, HORIZON_ISO);
    expect(events.length).toBeGreaterThan(0);
    for (const e of events) {
      expect(e.system).toBe("astro");
      expect(["saturn-return", "jupiter-return", "uranus-opposition", "uranus-return"]).toContain(e.kind);
    }
    const saturnEvents = events.filter((e) => e.kind === "saturn-return");
    expect(saturnEvents.length).toBeGreaterThan(0);
    expect(saturnEvents.length).toBeLessThanOrEqual(2); // maxOrdinal 2
    for (const e of saturnEvents) expect(e.weight).toBe(3);

    const jupiterEvents = events.filter((e) => e.kind === "jupiter-return");
    for (const e of jupiterEvents) expect(e.weight).toBe(1);

    const uranusOpp = events.filter((e) => e.kind === "uranus-opposition");
    expect(uranusOpp.length).toBe(1);
    expect(uranusOpp[0]!.weight).toBe(3);

    // ids son estables/deterministas
    for (const e of events) {
      expect(e.id).toBe(`astro:${e.kind}:${e.year}:${e.ordinal}`);
    }
  });
});
