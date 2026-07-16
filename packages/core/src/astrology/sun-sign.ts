// Signo solar APROXIMADO por tabla tropical de fechas (para feedback vivo en onboarding).
// En cúspide (±1 día) se marca cusp:true — la carta real (efemérides) decide después.
import { ZODIAC_SIGNS } from "../constants/astrology";

// [mes, día] en que ARRANCA cada signo, orden aries→pisces.
const STARTS: readonly [number, number][] = [
  [3, 21], [4, 20], [5, 21], [6, 21], [7, 23], [8, 23],
  [9, 23], [10, 23], [11, 22], [12, 22], [1, 20], [2, 19],
];

export function sunSignFromDate(
  isoDate: string,
): { key: string; glyph: string; index: number; cusp: boolean } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!m) return null;
  const month = Number(m[2]), day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const md = month * 100 + day;
  // buscamos el arranque cuyo rango [start, next) contiene la fecha; si el rango cruza fin de año
  // (p.ej. capricornio 22/12 → 20/1) usamos OR en vez de AND.
  let index = STARTS.findIndex(([sm, sd], i) => {
    const start = sm * 100 + sd;
    const next = STARTS[(i + 1) % 12]!;
    const end = next[0] * 100 + next[1];
    return start <= end ? md >= start && md < end : md >= start || md < end;
  });
  if (index === -1) index = 9; // inalcanzable con la tabla, guardia
  const sign = ZODIAC_SIGNS[index]!;
  const near = (sm: number, sd: number) => {
    const d = new Date(Date.UTC(2001, month - 1, day)); // año no bisiesto de referencia
    const s = new Date(Date.UTC(2001, sm - 1, sd));
    const diff = Math.abs(d.getTime() - s.getTime()) / 86400000;
    return Math.min(diff, 365 - diff) <= 1;
  };
  const cusp = STARTS.some(([sm, sd]) => near(sm, sd));
  return { key: sign.key, glyph: sign.glyph, index, cusp };
}
