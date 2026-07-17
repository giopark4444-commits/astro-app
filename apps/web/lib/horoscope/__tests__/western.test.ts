import path from "node:path";
import { describe, expect, it } from "vitest";
import { setEphePath } from "@aluna/ephemeris";
import {
  resolvePeriodRange, computeWesternHoroscope, cachedWesternHoroscope, isValidTz,
} from "../western";

// Los tests corren con cwd apps/web → la carpeta .se1 vive dos niveles arriba.
setEphePath(path.join(process.cwd(), "..", "..", "packages", "ephemeris", "ephe"));

const NOW = "2026-07-13T21:00:00Z"; // lunes 13-jul-2026, 16:00 en Bogotá

describe("resolvePeriodRange", () => {
  it("semana = lunes a domingo del calendario local", () => {
    const r = resolvePeriodRange("week", "America/Bogota", NOW);
    expect(r.fromIso.slice(0, 10)).toBe("2026-07-13"); // lunes
    // domingo 23:59:59.999 en Bogotá (UTC-5) cae en 2026-07-20 madrugada UTC;
    // fromIso/toIso se normalizan a UTC ("Z") para ser comparables con
    // SkyEvent.atIso (también UTC), así que el slice de fecha refleja UTC.
    expect(r.toIso.slice(0, 10)).toBe("2026-07-20");   // domingo (en UTC)
    expect(r.sampleIsos).toHaveLength(7);
  });
  it("muestras deterministas a mediodía local (mismo día → misma clave)", () => {
    const a = resolvePeriodRange("today", "America/Bogota", "2026-07-13T14:00:00Z");
    const b = resolvePeriodRange("today", "America/Bogota", "2026-07-13T23:00:00Z");
    expect(a.sampleIsos).toEqual(b.sampleIsos);
    expect(a.localDate).toBe("2026-07-13");
  });
  it("mes = 6 muestras, año = 12", () => {
    expect(resolvePeriodRange("month", "utc", NOW).sampleIsos).toHaveLength(6);
    expect(resolvePeriodRange("year", "utc", NOW).sampleIsos).toHaveLength(12);
  });
  it("tz inválida cae a utc", () => {
    expect(isValidTz("America/Bogota")).toBe(true);
    expect(isValidTz("No/Existe")).toBe(false);
    const r = resolvePeriodRange("today", "No/Existe", NOW);
    expect(r.offsetMinutes).toBe(0);
  });
  it("ayer/mañana = today corrido -1/+1 día, con localDate del día corrido (clave de caché aparte)", () => {
    const y = resolvePeriodRange("yesterday", "America/Bogota", NOW);
    const t = resolvePeriodRange("today", "America/Bogota", NOW);
    const m = resolvePeriodRange("tomorrow", "America/Bogota", NOW);
    expect(t.localDate).toBe("2026-07-13");
    expect(y.localDate).toBe("2026-07-12");
    expect(m.localDate).toBe("2026-07-14");
    // Un solo sample a mediodía local, igual que "today".
    expect(y.sampleIsos).toHaveLength(1);
    expect(m.sampleIsos).toHaveLength(1);
    // El rango entero (from→to) es el día completo corrido, no solo el sample.
    expect(y.fromIso.slice(0, 10)).toBe("2026-07-12");
    expect(m.fromIso.slice(0, 10)).toBe("2026-07-14");
    // Las tres claves son distintas entre sí (ninguna colisiona con "today").
    expect(y.localDate).not.toBe(t.localDate);
    expect(m.localDate).not.toBe(t.localDate);
  });
});

describe("computeWesternHoroscope", () => {
  it("payload completo y coherente para Acuario/hoy", () => {
    const p = computeWesternHoroscope("aquarius", "today", "America/Bogota", NOW);
    expect(p.sign).toBe("aquarius");
    expect(p.houses.length).toBeGreaterThanOrEqual(10);
    for (const h of p.houses) {
      expect(h.house).toBeGreaterThanOrEqual(1);
      expect(h.house).toBeLessThanOrEqual(12);
    }
    // el Sol en jul-2026 está en Cáncer → casa solar 6 para Acuario
    const sun = p.houses.find((h) => h.body === "sun")!;
    expect(sun.sign).toBe("cancer");
    expect(sun.house).toBe(6);
    expect(p.areas).toHaveLength(6);
    expect(p.events.every((e) => e.atIso >= p.range.fromIso && e.atIso <= p.range.toIso)).toBe(true);
  });
  it("la vista año excluye ingresos de Luna; hoy/semana los incluye", () => {
    const year = computeWesternHoroscope("leo", "year", "utc", NOW);
    expect(year.events.some((e) => e.kind === "ingress" && e.body === "moon")).toBe(false);
    const week = computeWesternHoroscope("leo", "week", "utc", NOW);
    // una semana casi siempre tiene 1-2 ingresos lunares; al menos el tipo está permitido
    expect(week.events.filter((e) => e.kind === "ingress" && e.body === "moon").length).toBeGreaterThanOrEqual(1);
  });
  it("signo inválido lanza", () => {
    expect(() => computeWesternHoroscope("dragon", "today", "utc", NOW)).toThrow();
  });
  it("los drivers de las barras SIEMPRE coinciden con la casa que muestra la tabla Pro (anti-funa: nunca contradice)", () => {
    const p = computeWesternHoroscope("aquarius", "year", "America/Bogota", NOW);
    const houseByBody = new Map(p.houses.map((h) => [h.body, h.house]));
    for (const area of p.areas) {
      for (const d of area.drivers) {
        expect(houseByBody.get(d.body)).toBe(d.house);
      }
    }
  });
});

describe("cachedWesternHoroscope", () => {
  it("misma clave devuelve el MISMO objeto (hit)", () => {
    const a = cachedWesternHoroscope("virgo", "today", "America/Bogota", NOW);
    const b = cachedWesternHoroscope("virgo", "today", "America/Bogota", "2026-07-13T23:59:00Z");
    expect(b).toBe(a); // misma fecha local → hit
  });
});
