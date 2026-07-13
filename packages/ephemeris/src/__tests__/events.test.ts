import { describe, expect, it } from "vitest";
import { DateTime } from "luxon";
import { normalizeAngle, angularSeparation } from "@aluna/core";
import { computeBodies } from "../bodies";
import { localToJulianDay } from "../time";
import { lunations, stations, ingresses, exactAspectAt } from "../events";

function elongationAt(iso: string): number {
  const d = DateTime.fromISO(iso, { zone: "utc" });
  const { julianDayEt } = localToJulianDay({
    year: d.year, month: d.month, day: d.day, hour: d.hour, minute: d.minute, timeZone: "utc",
  });
  const bodies = computeBodies(julianDayEt);
  const sun = bodies.find((b) => b.body === "sun")!.longitude;
  const moon = bodies.find((b) => b.body === "moon")!.longitude;
  return normalizeAngle(moon - sun);
}

describe("lunations", () => {
  const all2026 = lunations("2026-01-01T00:00:00Z", "2026-12-31T23:59:59Z");

  it("encuentra 12-13 nuevas y 12-13 llenas en 2026, alternadas y exactas", () => {
    const news = all2026.filter((e) => e.kind === "lunation" && e.phase === "new");
    const fulls = all2026.filter((e) => e.kind === "lunation" && e.phase === "full");
    expect(news.length).toBeGreaterThanOrEqual(12);
    expect(news.length).toBeLessThanOrEqual(13);
    expect(fulls.length).toBeGreaterThanOrEqual(12);
    expect(fulls.length).toBeLessThanOrEqual(13);
    // exactitud interna: elongación ≈ 0/180 en el instante hallado
    for (const e of all2026) {
      if (e.kind !== "lunation") continue;
      const el = elongationAt(e.atIso);
      const target = e.phase === "new" ? 0 : 180;
      const diff = Math.abs(((el - target + 540) % 360) - 180);
      expect(diff).toBeLessThan(0.01);
    }
  });

  it("bandera de eclipse: exactamente los 4 eclipses de 2026 (17-feb solar, 3-mar lunar, 12-ago solar, 28-ago lunar)", () => {
    const flagged = all2026
      .filter((e): e is Extract<typeof e, { kind: "lunation" }> => e.kind === "lunation" && e.eclipse !== null)
      .map((e) => ({ date: e.atIso.slice(0, 10), eclipse: e.eclipse }));
    expect(flagged).toHaveLength(4);
    const dates = flagged.map((f) => f.date);
    // ±1 día de tolerancia por zona horaria del máximo
    const near = (target: string) => dates.some((d) => Math.abs(DateTime.fromISO(d).diff(DateTime.fromISO(target), "days").days) <= 1);
    expect(near("2026-02-17")).toBe(true);
    expect(near("2026-03-03")).toBe(true);
    expect(near("2026-08-12")).toBe(true);
    expect(near("2026-08-28")).toBe(true);
    expect(flagged.filter((f) => f.eclipse === "solar")).toHaveLength(2);
    expect(flagged.filter((f) => f.eclipse === "lunar")).toHaveLength(2);
  });

  it("rango de un mes contiene al menos una nueva o llena, ordenadas por fecha", () => {
    const july = lunations("2026-07-01T00:00:00Z", "2026-07-31T23:59:59Z");
    expect(july.length).toBeGreaterThanOrEqual(1);
    const times = july.map((e) => DateTime.fromISO(e.atIso).toMillis());
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });
});

describe("stations", () => {
  const st2026 = stations("2026-01-01T00:00:00Z", "2026-12-31T23:59:59Z");
  it("Mercurio tiene 6 estaciones en 2026 (3 ℞ + 3 D), alternadas, con velocidad ≈ 0", () => {
    const merc = st2026.filter((e) => e.kind === "station" && e.body === "mercury");
    expect(merc).toHaveLength(6);
    const dirs = merc.map((e) => (e.kind === "station" ? e.direction : ""));
    expect(dirs.filter((d) => d === "retrograde")).toHaveLength(3);
    expect(dirs.filter((d) => d === "direct")).toHaveLength(3);
    for (let i = 1; i < dirs.length; i++) expect(dirs[i]).not.toBe(dirs[i - 1]);
    for (const e of merc) {
      const d = DateTime.fromISO(e.atIso, { zone: "utc" });
      const { julianDayEt } = localToJulianDay({ year: d.year, month: d.month, day: d.day, hour: d.hour, minute: d.minute, timeZone: "utc" });
      const speed = computeBodies(julianDayEt).find((b) => b.body === "mercury")!.speed;
      expect(Math.abs(speed)).toBeLessThan(0.005);
    }
  });
  it("el Sol y la Luna nunca estacionan", () => {
    expect(st2026.some((e) => e.kind === "station" && (e.body === "sun" || e.body === "moon"))).toBe(false);
  });
});

describe("ingresses", () => {
  it("el Sol ingresa 12 veces en 2026 y el equinoccio de Aries cae ~20-mar", () => {
    const sun = ingresses("2026-01-01T00:00:00Z", "2026-12-31T23:59:59Z")
      .filter((e) => e.kind === "ingress" && e.body === "sun");
    expect(sun).toHaveLength(12);
    const aries = sun.find((e) => e.kind === "ingress" && e.toSign === "aries")!;
    expect(["2026-03-19", "2026-03-20", "2026-03-21"]).toContain(aries.atIso.slice(0, 10));
  });
  it("la Luna solo aparece con includeMoon y da ~13 ingresos en julio", () => {
    const without = ingresses("2026-07-01T00:00:00Z", "2026-07-31T23:59:59Z");
    expect(without.some((e) => e.kind === "ingress" && e.body === "moon")).toBe(false);
    const withMoon = ingresses("2026-07-01T00:00:00Z", "2026-07-31T23:59:59Z", { includeMoon: true })
      .filter((e) => e.kind === "ingress" && e.body === "moon");
    expect(withMoon.length).toBeGreaterThanOrEqual(12);
    expect(withMoon.length).toBeLessThanOrEqual(15);
  });
});

describe("exactAspectAt", () => {
  it("encuentra el instante en que un tránsito perfecciona un aspecto a un punto fijo", () => {
    // Punto fijo artificial: la longitud del Sol el 1-jul-2026 + 90° → el Sol lo
    // cuadra (~0°) cerca de esa fecha y lo perfecciona al avanzar.
    const d = DateTime.fromISO("2026-07-01T12:00:00Z", { zone: "utc" });
    const { julianDayEt } = localToJulianDay({ year: 2026, month: 7, day: 1, hour: 12, minute: 0, timeZone: "utc" });
    const sunLon = computeBodies(julianDayEt).find((b) => b.body === "sun")!.longitude;
    const fixed = (sunLon + 93 + 360) % 360; // el Sol llegará a 90° de él en ~3 días
    const iso = exactAspectAt("sun", fixed, 90, "2026-07-01T12:00:00Z", 10);
    expect(iso).not.toBeNull();
    const dt = DateTime.fromISO(iso!, { zone: "utc" });
    expect(Math.abs(dt.diff(d, "days").days)).toBeLessThan(6);
    const jd = localToJulianDay({ year: dt.year, month: dt.month, day: dt.day, hour: dt.hour, minute: dt.minute, timeZone: "utc" }).julianDayEt;
    const lon = computeBodies(jd).find((b) => b.body === "sun")!.longitude;
    expect(Math.abs(angularSeparation(lon, fixed) - 90)).toBeLessThan(0.01);
  });
  it("devuelve null si no perfecciona dentro de la ventana", () => {
    // Saturno se mueve ~0.03-0.12°/día: en ±1 día no puede cruzar un aspecto
    // salvo que YA esté a milésimas — con punto fijo 0° y su posición real de
    // jul-2026 (Aries ~29-30°, separación ~30°) no hay cruce de 90° posible.
    expect(exactAspectAt("saturn", 0, 90, "2026-07-01T12:00:00Z", 1)).toBeNull();
  });
});
