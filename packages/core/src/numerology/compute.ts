import type { NumerologyInput, NumerologyResult } from "./types";
import { lifePath, expression, soulUrge, personality, birthday, maturity } from "./core-numbers";
import { personalCycles, pinnacles, challenges } from "./cycles";
import { inclusionTable, karmicLessons, hiddenPassion } from "./karmic";

export function computeNumerology(input: NumerologyInput): NumerologyResult {
  const { fullName, birthDate } = input;
  const asOf = input.asOf ?? todayCivil();

  const core = {
    lifePath: lifePath(birthDate),
    expression: expression(fullName),
    soulUrge: soulUrge(fullName),
    personality: personality(fullName),
    birthday: birthday(birthDate),
    maturity: maturity(birthDate, fullName),
  };

  const debts = Object.values(core)
    .map((t) => t.karmicDebt)
    .filter((d): d is NonNullable<typeof d> => d !== undefined);

  return {
    core,
    cycles: personalCycles(birthDate, asOf),
    pinnacles: pinnacles(birthDate),
    challenges: challenges(birthDate),
    karmic: {
      lessons: karmicLessons(fullName),
      debts: [...new Set(debts)],
      inclusion: inclusionTable(fullName),
      hiddenPassion: hiddenPassion(fullName),
    },
  };
}

function todayCivil() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}
