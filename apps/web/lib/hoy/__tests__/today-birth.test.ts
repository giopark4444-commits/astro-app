import { describe, it, expect } from "vitest";
import { civilTodayInZone, isValidTz, parseBirth, todayCivilInZone } from "../today-birth";

describe("civilTodayInZone", () => {
  // 2026-07-21T04:00:00Z es 2026-07-20 23:00 en Bogotá (UTC-5): mismo instante,
  // día civil distinto según la zona — exactamente el bug que este fix corrige.
  const NOW_UTC = new Date("2026-07-21T04:00:00.000Z");

  it("resuelve el día civil en UTC (el del proceso server en Vercel)", () => {
    expect(civilTodayInZone("UTC", NOW_UTC)).toEqual({ year: 2026, month: 7, day: 21 });
  });

  it("resuelve el día civil en America/Bogota, un día antes que UTC a esa hora", () => {
    expect(civilTodayInZone("America/Bogota", NOW_UTC)).toEqual({ year: 2026, month: 7, day: 20 });
  });

  it("zona IANA inválida → null", () => {
    expect(civilTodayInZone("Not/AZone", NOW_UTC)).toBeNull();
  });

  it("zona con offset positivo también puede adelantar el día civil", () => {
    // 2026-07-20T22:00:00Z → 2026-07-21 08:00 en Tokyo (UTC+9).
    const nowUtc = new Date("2026-07-20T22:00:00.000Z");
    expect(civilTodayInZone("Asia/Tokyo", nowUtc)).toEqual({ year: 2026, month: 7, day: 21 });
    expect(civilTodayInZone("UTC", nowUtc)).toEqual({ year: 2026, month: 7, day: 20 });
  });
});

describe("todayCivilInZone", () => {
  const NOW_UTC = new Date("2026-07-21T04:00:00.000Z");

  it("usa la tz del perfil cuando es válida", () => {
    expect(todayCivilInZone("America/Bogota", NOW_UTC)).toEqual({ year: 2026, month: 7, day: 20 });
  });

  it("timeZone null → cae a la tz del servidor (todayCivil)", () => {
    // No podemos fijar "la tz del servidor" desde el test, pero sí verificar que
    // no usa la fecha civil de Bogotá (que sería un día antes) para este instante.
    const bogota = civilTodayInZone("America/Bogota", NOW_UTC)!;
    const fallback = todayCivilInZone(null, NOW_UTC);
    expect(fallback).not.toEqual(bogota);
  });

  it("timeZone inválida → cae al fallback (no revienta)", () => {
    expect(() => todayCivilInZone("Not/AZone", NOW_UTC)).not.toThrow();
  });
});

describe("isValidTz", () => {
  it("acepta una IANA válida", () => {
    expect(isValidTz("America/Bogota")).toBe(true);
  });

  it("rechaza una zona inexistente", () => {
    expect(isValidTz("No/Existe")).toBe(false);
  });

  it("rechaza vacío/no-string sin explotar", () => {
    expect(isValidTz("")).toBe(false);
  });
});

describe("parseBirth", () => {
  it("sigue parseando YYYY-MM-DD (sin cambios de comportamiento por este fix)", () => {
    expect(parseBirth("1990-05-14")).toEqual({ year: 1990, month: 5, day: 14 });
  });
});
