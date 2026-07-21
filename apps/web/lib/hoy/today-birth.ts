import { DateTime } from "luxon";
import type { BirthDate } from "@aluna/core";

/** Parsea "YYYY-MM-DD" (fecha civil de nacimiento) a BirthDate, o null si no cuadra. */
export function parseBirth(date: string): BirthDate | null {
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return null;
  return { year: y, month: m, day: d };
}

/**
 * Hoy como fecha civil de la timezone del PROCESO (server). En Vercel eso es UTC, no
 * la del usuario — solo sirve como fallback cuando no hay una zona de perfil válida.
 */
export function todayCivil(): BirthDate {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

/**
 * Fecha civil de "hoy" resuelta en una zona horaria IANA, a partir de un instante UTC
 * dado. Función pura (nowUtc inyectable) para poder testearla sin mockear el reloj
 * global. Devuelve null si `zone` no es una IANA válida para luxon.
 */
export function civilTodayInZone(zone: string, nowUtc: Date): BirthDate | null {
  const dt = DateTime.fromJSDate(nowUtc, { zone: "utc" }).setZone(zone);
  if (!dt.isValid) return null;
  return { year: dt.year, month: dt.month, day: dt.day };
}

/**
 * Hoy como fecha civil en la timezone del PERFIL (usuario), no la del proceso server
 * (que en Vercel/producción es siempre UTC). Sin esto, un usuario en UTC-5 ve el
 * pilar/número del día SIGUIENTE desde ~19:00 hasta medianoche hora local. Si
 * `timeZone` es null/undefined/inválida, cae a `todayCivil()` (tz del servidor) como
 * fallback documentado.
 */
export function todayCivilInZone(timeZone: string | null | undefined, nowUtc = new Date()): BirthDate {
  if (timeZone) {
    const civil = civilTodayInZone(timeZone, nowUtc);
    if (civil) return civil;
  }
  return todayCivil();
}
