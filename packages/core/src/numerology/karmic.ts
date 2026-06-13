import { nameLetters, letterValue } from "./name";

export function inclusionTable(fullName: string): Record<number, number> {
  const table: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
  for (const ch of nameLetters(fullName)) {
    const v = letterValue(ch);
    if (v >= 1 && v <= 9) table[v] = (table[v] ?? 0) + 1;
  }
  return table;
}

export function karmicLessons(fullName: string): number[] {
  const inc = inclusionTable(fullName);
  return Object.entries(inc)
    .filter(([, count]) => count === 0)
    .map(([digit]) => Number(digit));
}

export function hiddenPassion(fullName: string): number[] {
  const inc = inclusionTable(fullName);
  const max = Math.max(...Object.values(inc));
  if (max === 0) return [];
  return Object.entries(inc)
    .filter(([, count]) => count === max)
    .map(([digit]) => Number(digit));
}
