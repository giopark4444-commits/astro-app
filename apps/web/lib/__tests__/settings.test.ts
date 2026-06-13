import { describe, it, expect } from "vitest";
import { settingsToThemeState } from "../settings";

describe("settingsToThemeState", () => {
  it("mapea una fila de settings a tema/modo/idioma con defaults", () => {
    expect(settingsToThemeState({ theme: "cosmic", light_mode: "light", language: "en" }))
      .toEqual({ theme: "cosmic", mode: "light", locale: "en" });
  });
  it("cae a defaults si faltan/invalidos", () => {
    expect(settingsToThemeState({ theme: "x", light_mode: undefined, language: null }))
      .toEqual({ theme: "observatory", mode: "auto", locale: "es" });
  });
});
