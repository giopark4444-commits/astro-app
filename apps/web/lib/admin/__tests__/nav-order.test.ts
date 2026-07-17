import { describe, it, expect } from "vitest";
import { DEFAULT_NAV_ORDER, NAV_KEYS, sanitizeNavOrder } from "../nav-order";

describe("nav-order", () => {
  it("NAV_KEYS/DEFAULT_NAV_ORDER coinciden con el orden actual de TopNav (menos perfil)", () => {
    expect(NAV_KEYS).toEqual(["hoy", "carta", "horoscopo", "numeros", "pilares", "tarot"]);
    expect(DEFAULT_NAV_ORDER).toEqual(NAV_KEYS);
  });

  it("conserva una permutación válida completa tal cual", () => {
    const perm = ["tarot", "hoy", "pilares", "carta", "numeros", "horoscopo"];
    expect(sanitizeNavOrder(perm)).toEqual(perm);
  });

  it("filtra claves basura, deduplica, y completa las faltantes en orden default", () => {
    const input = ["carta", "no-existe", "carta", "numeros", 42, null, {}];
    expect(sanitizeNavOrder(input)).toEqual(["carta", "numeros", "hoy", "horoscopo", "pilares", "tarot"]);
  });

  it("un array de solo basura devuelve el default completo", () => {
    expect(sanitizeNavOrder(["a", "b", 1, {}, null])).toEqual([...DEFAULT_NAV_ORDER]);
  });

  it("valores no-array (null, undefined, objeto, string, número) devuelven el default", () => {
    expect(sanitizeNavOrder(null)).toEqual([...DEFAULT_NAV_ORDER]);
    expect(sanitizeNavOrder(undefined)).toEqual([...DEFAULT_NAV_ORDER]);
    expect(sanitizeNavOrder({ hoy: 0 })).toEqual([...DEFAULT_NAV_ORDER]);
    expect(sanitizeNavOrder("hoy,carta")).toEqual([...DEFAULT_NAV_ORDER]);
    expect(sanitizeNavOrder(42)).toEqual([...DEFAULT_NAV_ORDER]);
  });

  it("un array vacío devuelve el default completo", () => {
    expect(sanitizeNavOrder([])).toEqual([...DEFAULT_NAV_ORDER]);
  });
});
