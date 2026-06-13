import { describe, it, expect } from "vitest";
import { resolveLocale, DEFAULT_LOCALE } from "../locale";

describe("resolveLocale", () => {
  it("acepta locales soportados", () => {
    expect(resolveLocale("es")).toBe("es");
    expect(resolveLocale("en")).toBe("en");
  });
  it("cae al default con valor ausente o inválido", () => {
    expect(resolveLocale(undefined)).toBe(DEFAULT_LOCALE);
    expect(resolveLocale(null)).toBe(DEFAULT_LOCALE);
    expect(resolveLocale("fr")).toBe(DEFAULT_LOCALE);
    expect(resolveLocale("../etc")).toBe(DEFAULT_LOCALE);
  });
});
