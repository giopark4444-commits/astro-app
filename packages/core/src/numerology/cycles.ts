import type { BirthDate, PersonalCycles, Pinnacle, Challenge } from "./types";
import { reduce, reduceWithTrace, isMaster } from "./reduction";
import { lifePath } from "./core-numbers";

const single = (n: number) => reduce(n, { preserveMasters: false });

/** Año/Mes/Día personal respecto a una fecha de referencia (asOf). */
export function personalCycles(birth: BirthDate, asOf: BirthDate): PersonalCycles {
  const m = single(birth.month);
  const d = single(birth.day);
  const yRef = single(asOf.year);
  const personalYear = m + d + yRef;
  const personalMonth = reduce(personalYear) + single(asOf.month);
  const personalDay = reduce(personalMonth) + single(asOf.day);
  return {
    personalYear: reduceWithTrace(personalYear),
    personalMonth: reduceWithTrace(personalMonth),
    personalDay: reduceWithTrace(personalDay),
  };
}

/** 4 pináculos con sus edades. */
export function pinnacles(birth: BirthDate): Pinnacle[] {
  const m = single(birth.month);
  const d = single(birth.day);
  const y = single(birth.year);
  const p1 = reduce(m + d);
  const p2 = reduce(d + y);
  const p3 = reduce(p1 + p2);
  const p4 = reduce(m + y);
  const firstEnd = 36 - single(lifePath(birth).value);
  const make = (value: number, startAge: number, endAge: number | null): Pinnacle => ({
    value,
    isMaster: isMaster(value),
    startAge,
    endAge,
  });
  return [
    make(p1, 0, firstEnd),
    make(p2, firstEnd + 1, firstEnd + 9),
    make(p3, firstEnd + 10, firstEnd + 18),
    make(p4, firstEnd + 19, null),
  ];
}

/** 4 desafíos (diferencias absolutas; sin maestros). */
export function challenges(birth: BirthDate): Challenge[] {
  const m = single(birth.month);
  const d = single(birth.day);
  const y = single(birth.year);
  const c1 = Math.abs(m - d);
  const c2 = Math.abs(d - y);
  const c3 = Math.abs(c1 - c2);
  const c4 = Math.abs(m - y);
  const firstEnd = 36 - single(lifePath(birth).value);
  return [
    { value: c1, startAge: 0, endAge: firstEnd },
    { value: c2, startAge: firstEnd + 1, endAge: firstEnd + 9 },
    { value: c3, startAge: firstEnd + 10, endAge: firstEnd + 18 },
    { value: c4, startAge: firstEnd + 19, endAge: null },
  ];
}
