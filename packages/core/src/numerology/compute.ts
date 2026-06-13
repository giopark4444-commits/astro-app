import type { NumerologyInput, NumerologyResult } from "./types";
import { lifePath, expression, soulUrge, personality, birthday, maturity } from "./core-numbers";
import { personalCycles, pinnacles, challenges } from "./cycles";
import { inclusionTable, karmicLessons, hiddenPassion } from "./karmic";
import { nameLetters } from "./name";

function assertValidInput(input: NumerologyInput): void {
  const { year, month, day } = input.birthDate;
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new RangeError(`Mes inválido: ${month} (debe ser 1-12)`);
  }
  if (!Number.isInteger(day) || day < 1 || day > 31) {
    throw new RangeError(`Día inválido: ${day} (debe ser 1-31)`);
  }
  if (!Number.isInteger(year) || year < 1) {
    throw new RangeError(`Año inválido: ${year}`);
  }
  if (nameLetters(input.fullName).length === 0) {
    throw new Error("El nombre debe contener al menos una letra.");
  }
}

export function computeNumerology(input: NumerologyInput): NumerologyResult {
  assertValidInput(input);
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
