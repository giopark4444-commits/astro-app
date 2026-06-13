const HARD_VOWELS = new Set(["A", "E", "I", "O", "U"]);

/** Valor pitagórico 1-9 de una letra A-Z. */
export function letterValue(letter: string): number {
  const code = letter.toUpperCase().charCodeAt(0);
  if (code < 65 || code > 90) return 0;
  return ((code - 65) % 9) + 1;
}

/** Mayúsculas, quita acentos (Ñ->N), conserva solo A-Z. */
export function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
}

export function nameLetters(name: string): string[] {
  return normalizeName(name).split("");
}

/** Y es vocal si las letras adyacentes NO son vocales duras (o son borde). */
function isYVowel(letters: string[], i: number): boolean {
  const prev = letters[i - 1];
  const next = letters[i + 1];
  const prevVowel = prev ? HARD_VOWELS.has(prev) : false;
  const nextVowel = next ? HARD_VOWELS.has(next) : false;
  return !prevVowel && !nextVowel;
}

export function splitVowelsConsonants(name: string): { vowels: string[]; consonants: string[] } {
  const letters = nameLetters(name);
  const vowels: string[] = [];
  const consonants: string[] = [];
  letters.forEach((ch, i) => {
    const isVowel = HARD_VOWELS.has(ch) || (ch === "Y" && isYVowel(letters, i));
    (isVowel ? vowels : consonants).push(ch);
  });
  return { vowels, consonants };
}

export function sumLetters(letters: string[]): number {
  return letters.reduce((acc, ch) => acc + letterValue(ch), 0);
}
