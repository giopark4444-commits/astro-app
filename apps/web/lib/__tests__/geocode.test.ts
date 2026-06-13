import { describe, it, expect } from "vitest";
import { parseOpenMeteo } from "../geocode";

const SAMPLE = {
  results: [
    { id: 1, name: "Quito", latitude: -0.22985, longitude: -78.52495, timezone: "America/Guayaquil", country: "Ecuador", admin1: "Pichincha" },
    { id: 2, name: "Quito Loma", latitude: 1.0, longitude: 2.0, timezone: "America/Bogota", country: "Colombia" },
  ],
};

describe("parseOpenMeteo", () => {
  it("mapea resultados a GeocodeResult con tz IANA", () => {
    const r = parseOpenMeteo(SAMPLE);
    expect(r).toHaveLength(2);
    expect(r[0]).toEqual({
      name: "Quito", admin1: "Pichincha", country: "Ecuador",
      latitude: -0.22985, longitude: -78.52495, timeZone: "America/Guayaquil",
    });
    expect(r[1]!.admin1).toBeUndefined();
  });
  it("devuelve [] si no hay resultados o falta tz", () => {
    expect(parseOpenMeteo({})).toEqual([]);
    expect(parseOpenMeteo({ results: [{ name: "X", latitude: 1, longitude: 2 }] })).toEqual([]);
    expect(parseOpenMeteo({ results: [{ name: 42, latitude: 1, longitude: 2, timezone: "UTC" }] })).toEqual([]);
  });
});
