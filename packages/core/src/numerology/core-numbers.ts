import type { BirthDate, ReductionTrace } from "./types";
import { reduce, reduceWithTrace } from "./reduction";
import { splitVowelsConsonants, nameLetters, sumLetters } from "./name";

/** Camino de Vida: reduce cada componente (sin maestros), suma, reduce total (con maestros).
 *  La traza muestra los componentes y luego la cadena de reducción del total. */
export function lifePath(date: BirthDate): ReductionTrace {
  const m = reduce(date.month, { preserveMasters: false });
  const d = reduce(date.day, { preserveMasters: false });
  const y = reduce(date.year, { preserveMasters: false });
  const base = reduceWithTrace(m + d + y);
  return { ...base, steps: [m, d, y, ...base.steps] };
}

/** Expresión / Destino: todas las letras del nombre completo. */
export function expression(fullName: string): ReductionTrace {
  return reduceWithTrace(sumLetters(nameLetters(fullName)));
}

/** Alma / Anhelo: solo vocales. */
export function soulUrge(fullName: string): ReductionTrace {
  return reduceWithTrace(sumLetters(splitVowelsConsonants(fullName).vowels));
}

/** Personalidad: solo consonantes. */
export function personality(fullName: string): ReductionTrace {
  return reduceWithTrace(sumLetters(splitVowelsConsonants(fullName).consonants));
}

/** Día de nacimiento (preserva maestro). */
export function birthday(date: BirthDate): ReductionTrace {
  return reduceWithTrace(date.day);
}

/** Madurez: Camino de Vida + Expresión, reducido. */
export function maturity(date: BirthDate, fullName: string): ReductionTrace {
  return reduceWithTrace(lifePath(date).value + expression(fullName).value);
}
