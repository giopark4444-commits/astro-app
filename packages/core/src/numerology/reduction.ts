import type { ReductionTrace } from "./types";

export const MASTER_NUMBERS: readonly number[] = [11, 22, 33];
export const KARMIC_DEBTS: readonly number[] = [13, 14, 16, 19];

export function isMaster(n: number): boolean {
  return MASTER_NUMBERS.includes(n);
}

export function digitsSum(n: number): number {
  return Math.abs(Math.trunc(n))
    .toString()
    .split("")
    .reduce((acc, d) => acc + Number(d), 0);
}

export interface ReduceOptions {
  preserveMasters?: boolean;
}

/** Reduce a 1..9 (o a un maestro 11/22/33 si preserveMasters). */
export function reduce(n: number, opts: ReduceOptions = {}): number {
  const preserve = opts.preserveMasters ?? true;
  let current = Math.abs(Math.trunc(n));
  while (current > 9) {
    if (preserve && MASTER_NUMBERS.includes(current)) return current;
    current = digitsSum(current);
  }
  return current;
}

/** Como `reduce` pero registrando los pasos y la deuda kármica del camino. */
export function reduceWithTrace(n: number, opts: ReduceOptions = {}): ReductionTrace {
  const preserve = opts.preserveMasters ?? true;
  let current = Math.abs(Math.trunc(n));
  const steps: number[] = [current];
  let karmicDebt: ReductionTrace["karmicDebt"];
  while (current > 9) {
    if (KARMIC_DEBTS.includes(current)) karmicDebt = current as ReductionTrace["karmicDebt"];
    if (preserve && MASTER_NUMBERS.includes(current)) break;
    current = digitsSum(current);
    steps.push(current);
  }
  return {
    steps,
    value: current,
    isMaster: isMaster(current),
    ...(karmicDebt ? { karmicDebt } : {}),
  };
}
