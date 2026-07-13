// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
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

// Ejecuta el STRING que se envía al navegador (no el helper resolveMode, que no
// corre en producción). Cierra la brecha de "falsa confianza": el path real que
// aplica el anti-FOUC queda cubierto, no solo string-matcheado.
describe("fouc-script: FOUC_SCRIPT ejecutado (jsdom)", () => {
  // FOUC_SCRIPT es una constante ESTÁTICA del repo (sin interpolación de input no
  // confiable) y jsdom no ejecuta <script> inline por defecto → new Function es la
  // vía estándar y segura de ejercer el string exacto que se envía al navegador.
  const run = () => new Function(FOUC_SCRIPT)();

  beforeEach(() => {
    // limpia cookies y datasets entre casos
    document.cookie.split("; ").forEach((c) => {
      const name = c.split("=")[0];
      if (name) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    });
    delete document.documentElement.dataset.theme;
    delete document.documentElement.dataset.mode;
    // por defecto: SO en claro (matchMedia determinista; jsdom no lo trae)
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;
  });

  it("aplica el tema y el modo explícito de la cookie", () => {
    document.cookie = "theme=cosmic";
    document.cookie = "light_mode=dark";
    run();
    expect(document.documentElement.dataset.theme).toBe("cosmic");
    expect(document.documentElement.dataset.mode).toBe("dark");
  });

  it("sin cookies + prefersDark -> observatory/dark (default + auto)", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
    run();
    expect(document.documentElement.dataset.theme).toBe("observatory");
    expect(document.documentElement.dataset.mode).toBe("dark");
  });

  it("light_mode=light gana aunque el SO esté en oscuro", () => {
    document.cookie = "light_mode=light";
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
    run();
    expect(document.documentElement.dataset.mode).toBe("light");
  });

  it("si matchMedia lanza, cae a los defaults sin romper", () => {
    window.matchMedia = (() => { throw new Error("no matchMedia"); }) as unknown as typeof window.matchMedia;
    expect(run).not.toThrow();
    expect(document.documentElement.dataset.theme).toBe("observatory");
    expect(document.documentElement.dataset.mode).toBe("light");
  });
});
