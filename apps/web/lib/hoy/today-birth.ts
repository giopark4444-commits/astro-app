import type { BirthDate } from "@aluna/core";

/** Parsea "YYYY-MM-DD" (fecha civil de nacimiento) a BirthDate, o null si no cuadra. */
export function parseBirth(date: string): BirthDate | null {
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return null;
  return { year: y, month: m, day: d };
}

/** Hoy como fecha civil local (la numerología usa la fecha del calendario, sin TZ). */
export function todayCivil(): BirthDate {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}
