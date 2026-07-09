// packages/core/src/bazi/stages.ts
// 十二長生: la "vida" del Maestro del Día a través de las 12 ramas. Cada tronco
// tiene su rama de nacimiento (長生); los troncos YANG avanzan por las ramas y los
// YIN retroceden (陽順陰逆). 戊/己 (tierra) siguen al fuego (escuela estándar).
const mod = (n: number, m: number) => ((n % m) + m) % m;

export type StageKey =
  | "birth" | "bath" | "cap" | "office" | "peak" | "decline"
  | "sickness" | "death" | "tomb" | "cut" | "womb" | "nurture";

export interface StageDef {
  key: StageKey;
  hanzi: string;
  hangul: string;
}

export const TWELVE_STAGES: readonly StageDef[] = [
  { key: "birth", hanzi: "長生", hangul: "장생" },
  { key: "bath", hanzi: "沐浴", hangul: "목욕" },
  { key: "cap", hanzi: "冠帶", hangul: "관대" },
  { key: "office", hanzi: "臨官", hangul: "건록" },
  { key: "peak", hanzi: "帝旺", hangul: "제왕" },
  { key: "decline", hanzi: "衰", hangul: "쇠" },
  { key: "sickness", hanzi: "病", hangul: "병" },
  { key: "death", hanzi: "死", hangul: "사" },
  { key: "tomb", hanzi: "墓", hangul: "묘" },
  { key: "cut", hanzi: "絕", hangul: "절" },
  { key: "womb", hanzi: "胎", hangul: "태" },
  { key: "nurture", hanzi: "養", hangul: "양" },
] as const;

/** Rama de 長生 por tronco (índices en EARTHLY_BRANCHES): 甲亥 乙午 丙寅 丁酉 戊寅 己酉 庚巳 辛子 壬申 癸卯. */
const BIRTH_BRANCH: readonly number[] = [11, 6, 2, 9, 2, 9, 5, 0, 8, 3] as const;

export function lifeStage(dayStem: number, branch: number): StageKey {
  const s = mod(dayStem, 10);
  const start = BIRTH_BRANCH[s]!;
  const yang = s % 2 === 0;
  const idx = yang ? mod(branch - start, 12) : mod(start - branch, 12);
  return TWELVE_STAGES[idx]!.key;
}
