import { describe, it, expect } from "vitest";
import { letterValue, normalizeName, nameLetters, splitVowelsConsonants } from "../name";

describe("letterValue", () => {
  it("mapea letras al sistema pitagórico 1-9", () => {
    expect(letterValue("A")).toBe(1);
    expect(letterValue("I")).toBe(9);
    expect(letterValue("J")).toBe(1);
    expect(letterValue("R")).toBe(9);
    expect(letterValue("Z")).toBe(8);
  });
});

describe("normalizeName", () => {
  it("mayúsculas, sin acentos, solo A-Z; Ñ->N", () => {
    expect(normalizeName("José Muñoz")).toBe("JOSEMUNOZ");
    expect(nameLetters("José Muñoz")).toEqual(["J","O","S","E","M","U","N","O","Z"]);
  });
});

describe("splitVowelsConsonants", () => {
  it("separa vocales y consonantes", () => {
    const { vowels, consonants } = splitVowelsConsonants("JOHN");
    expect(vowels).toEqual(["O"]);
    expect(consonants).toEqual(["J", "H", "N"]);
  });
  it("trata Y como vocal cuando está rodeada de consonantes", () => {
    const { vowels } = splitVowelsConsonants("GARY");
    expect(vowels).toEqual(["A", "Y"]);
  });
  it("trata Y como consonante cuando está junto a una vocal", () => {
    const { vowels, consonants } = splitVowelsConsonants("YARA");
    expect(consonants).toContain("Y");
    expect(vowels).toEqual(["A", "A"]);
  });
});
