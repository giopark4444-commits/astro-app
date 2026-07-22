import { describe, it, expect } from "vitest";
import { THEMES, MODES, DEFAULT_THEME, DEFAULT_MODE, resolveMode, nextTheme } from "../themes";

describe("themes", () => {
  it("expone los 6 temas y los 3 modos", () => {
    expect(THEMES).toEqual(["observatory", "aurora", "cosmic", "selva", "alba", "eclipse"]);
    expect(MODES).toEqual(["light", "dark", "auto"]);
    expect(DEFAULT_THEME).toBe("observatory");
    expect(DEFAULT_MODE).toBe("auto");
  });

  it("resolveMode: light/dark se devuelven tal cual", () => {
    expect(resolveMode("light", true)).toBe("light");
    expect(resolveMode("dark", false)).toBe("dark");
  });

  it("resolveMode: auto sigue la preferencia del sistema", () => {
    expect(resolveMode("auto", true)).toBe("dark");
    expect(resolveMode("auto", false)).toBe("light");
  });

  it("nextTheme cicla por los 6 y vuelve al inicio", () => {
    expect(nextTheme("observatory")).toBe("aurora");
    expect(nextTheme("aurora")).toBe("cosmic");
    expect(nextTheme("cosmic")).toBe("selva");
    expect(nextTheme("selva")).toBe("alba");
    expect(nextTheme("alba")).toBe("eclipse");
    expect(nextTheme("eclipse")).toBe("observatory");
  });
});
