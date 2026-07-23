import { describe, expect, it } from "vitest";
import { applyVoiceMode, parseVoiceMode, VOICE_MODES } from "@/lib/reading/voices";

// Los 3 modos de voz: íntima (default, no toca el SYSTEM), estudio y pro
// (bloques de anulación apendeados — última instrucción gana). Las reglas de
// datos/seguridad/formato de cada superficie viven en su SYSTEM base y el
// bloque ordena conservarlas.

describe("parseVoiceMode", () => {
  it("acepta los 3 modos válidos", () => {
    for (const m of VOICE_MODES) expect(parseVoiceMode(m)).toBe(m);
  });

  it("cualquier cosa rara cae a íntima (default seguro)", () => {
    expect(parseVoiceMode(undefined)).toBe("intima");
    expect(parseVoiceMode(null)).toBe("intima");
    expect(parseVoiceMode("PRO")).toBe("intima");
    expect(parseVoiceMode(42)).toBe("intima");
    expect(parseVoiceMode({ mode: "pro" })).toBe("intima");
  });
});

describe("applyVoiceMode", () => {
  const BASE = "Eres Aluna: base con reglas de datos y formato.";

  it("íntima devuelve el SYSTEM base intacto (el base YA es la voz íntima)", () => {
    expect(applyVoiceMode(BASE, "intima", "es")).toBe(BASE);
    expect(applyVoiceMode(BASE, "intima", "en")).toBe(BASE);
  });

  it("estudio apendea su bloque de anulación al final, preservando el base", () => {
    const s = applyVoiceMode(BASE, "estudio", "es");
    expect(s.startsWith(BASE)).toBe(true);
    expect(s).toContain("MODO ESTUDIO");
    expect(s).toContain("anula las instrucciones de VOZ");
    expect(s).toContain("conserva intactas TODAS las reglas");
  });

  it("pro apendea su bloque técnico, en ambos idiomas", () => {
    const es = applyVoiceMode(BASE, "pro", "es");
    expect(es).toContain("MODO PROFESIONAL");
    expect(es).toContain("no disponible");
    const en = applyVoiceMode(BASE, "pro", "en");
    expect(en.startsWith(BASE)).toBe(true);
    expect(en).toContain("PROFESSIONAL MODE");
    expect(en).toContain("not available");
  });

  it("los bloques jamás piden inventar datos: exigen contexto provisto", () => {
    for (const mode of ["estudio", "pro"] as const) {
      const s = applyVoiceMode(BASE, mode, "es");
      expect(/inventes|inventar/.test(s)).toBe(true);
    }
  });
});
