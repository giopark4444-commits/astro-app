import type { NumerologyInput, ReductionTrace } from "@aluna/core";

/** Perfil (campos mínimos) → entrada de numerología. Usa nombre + fecha civil. */
export function profileToNumerologyInput(p: { name: string; birth_date: string }): NumerologyInput {
  const [y, m, d] = p.birth_date.split("-").map(Number);
  return { fullName: p.name, birthDate: { year: y!, month: m!, day: d! } };
}

/** Muestra la reducción "paso → paso → valor" (feature "Tu cálculo"). */
export function formatReduction(t: Pick<ReductionTrace, "steps">): string {
  return t.steps.join(" → ");
}
