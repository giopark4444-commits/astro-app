import { describe, it, expect } from "vitest";
import { THEME_COOKIE, MODE_COOKIE, FOUC_SCRIPT, resolveMode } from "../fouc-script";

describe("fouc-script: resolveMode", () => {
  it("auto (o ausente) + prefersDark -> dark", () => {
    expect(resolveMode("auto", true)).toBe("dark");
    expect(resolveMode(undefined, true)).toBe("dark");
  });

  it("auto (o ausente) + !prefersDark -> light", () => {
    expect(resolveMode("auto", false)).toBe("light");
    expect(resolveMode(undefined, false)).toBe("light");
  });

  it('"light" -> light (independiente de prefersDark)', () => {
    expect(resolveMode("light", true)).toBe("light");
    expect(resolveMode("light", false)).toBe("light");
  });

  it('"dark" -> dark (independiente de prefersDark)', () => {
    expect(resolveMode("dark", true)).toBe("dark");
    expect(resolveMode("dark", false)).toBe("dark");
  });

  it("valor inválido cae a auto", () => {
    expect(resolveMode("bogus", true)).toBe("dark");
    expect(resolveMode("bogus", false)).toBe("light");
  });
});

describe("fouc-script: constantes + script", () => {
  it("los nombres de cookie coinciden con las columnas de settings", () => {
    expect(THEME_COOKIE).toBe("theme");
    expect(MODE_COOKIE).toBe("light_mode");
  });

  it("FOUC_SCRIPT es un IIFE que referencia las cookies y document.documentElement", () => {
    expect(FOUC_SCRIPT).toContain("document.cookie");
    expect(FOUC_SCRIPT).toContain("document.documentElement");
    expect(FOUC_SCRIPT).toContain(THEME_COOKIE);
    expect(FOUC_SCRIPT).toContain(MODE_COOKIE);
    expect(FOUC_SCRIPT).toContain("prefers-color-scheme: dark");
    // defensivo: no debe reventar si algo falla
    expect(FOUC_SCRIPT).toContain("try");
    expect(FOUC_SCRIPT).toContain("catch");
  });
});
