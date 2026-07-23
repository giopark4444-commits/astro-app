import { describe, it, expect, beforeEach } from "vitest";
import { getPreferredVoiceURI, setPreferredVoiceURI, listVoices } from "../preference";

describe("voice preference (por dispositivo, localStorage)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("getPreferredVoiceURI devuelve null cuando no hay preferencia guardada", () => {
    expect(getPreferredVoiceURI("es")).toBeNull();
    expect(getPreferredVoiceURI("en")).toBeNull();
  });

  it("set/get hacen round-trip por locale, sin cruzarse entre es/en", () => {
    setPreferredVoiceURI("es", "voice-uri-monica");
    setPreferredVoiceURI("en", "voice-uri-alex");
    expect(getPreferredVoiceURI("es")).toBe("voice-uri-monica");
    expect(getPreferredVoiceURI("en")).toBe("voice-uri-alex");
  });

  it("set con null borra la preferencia (vuelve al auto-match)", () => {
    setPreferredVoiceURI("es", "voice-uri-monica");
    expect(getPreferredVoiceURI("es")).toBe("voice-uri-monica");
    setPreferredVoiceURI("es", null);
    expect(getPreferredVoiceURI("es")).toBeNull();
    expect(window.localStorage.getItem("aluna:voice:es")).toBeNull();
  });

  it("SSR-safe: sin window, getPreferredVoiceURI no lanza y devuelve null", () => {
    const original = globalThis.window;
    // @ts-expect-error — simula entorno de servidor (sin window global)
    delete globalThis.window;
    try {
      expect(getPreferredVoiceURI("es")).toBeNull();
    } finally {
      globalThis.window = original;
    }
  });

  it("SSR-safe: sin window, setPreferredVoiceURI no lanza", () => {
    const original = globalThis.window;
    // @ts-expect-error — simula entorno de servidor (sin window global)
    delete globalThis.window;
    try {
      expect(() => setPreferredVoiceURI("es", "x")).not.toThrow();
    } finally {
      globalThis.window = original;
    }
  });

  it("SSR-safe: sin window, listVoices devuelve [] sin lanzar", () => {
    const original = globalThis.window;
    // @ts-expect-error — simula entorno de servidor (sin window global)
    delete globalThis.window;
    try {
      expect(listVoices("es")).toEqual([]);
    } finally {
      globalThis.window = original;
    }
  });

  it("listVoices filtra por locale (prefijo de lang, case-insensitive)", () => {
    (window as unknown as { speechSynthesis: unknown }).speechSynthesis = {
      getVoices: () => [
        { lang: "es-ES", name: "Mónica" },
        { lang: "es-MX", name: "Paulina" },
        { lang: "en-US", name: "Alex" },
        { lang: "EN-GB", name: "Daniel" },
      ],
    };
    const es = listVoices("es");
    expect(es.map((v) => v.name)).toEqual(["Mónica", "Paulina"]);
    const en = listVoices("en");
    expect(en.map((v) => v.name)).toEqual(["Alex", "Daniel"]);
  });

  it("listVoices devuelve [] si el navegador no trae speechSynthesis", () => {
    delete (window as unknown as { speechSynthesis?: unknown }).speechSynthesis;
    expect(listVoices("es")).toEqual([]);
  });
});
