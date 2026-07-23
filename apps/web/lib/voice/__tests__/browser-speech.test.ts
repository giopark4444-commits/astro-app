import { describe, it, expect, vi, beforeEach } from "vitest";
import { browserSpeech } from "../browser-speech";

describe("browserSpeech", () => {
  beforeEach(() => {
    window.localStorage.clear();
    const utterances: Array<Record<string, unknown>> = [];
    // jsdom no trae Web Speech API → la simulamos.
    (globalThis as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = class {
      text: string;
      lang = "";
      rate = 1;
      voice: unknown = null;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(t: string) {
        this.text = t;
      }
    };
    (window as unknown as { speechSynthesis: unknown }).speechSynthesis = {
      cancel: vi.fn(),
      speak: vi.fn((u: Record<string, unknown>) => utterances.push(u)),
      getVoices: () => [
        { lang: "es-ES", name: "Mónica", voiceURI: "com.test.monica" },
        { lang: "en-US", name: "Alex", voiceURI: "com.test.alex" },
      ],
      _utterances: utterances,
    };
  });

  function synth() {
    return window.speechSynthesis as unknown as {
      cancel: ReturnType<typeof vi.fn>;
      speak: ReturnType<typeof vi.fn>;
      _utterances: Array<Record<string, unknown>>;
    };
  }

  it("supported() es true cuando existe speechSynthesis", () => {
    expect(browserSpeech.supported()).toBe(true);
  });

  it("lee en español, elige la voz es, y stop() cancela", () => {
    const h = browserSpeech.speak("Hola, soy Aluna.", { locale: "es" });
    expect(synth().speak).toHaveBeenCalledTimes(1);
    const u = synth()._utterances[0]!;
    expect(u.text).toBe("Hola, soy Aluna.");
    expect(u.lang).toBe("es-ES");
    expect((u.voice as { name: string }).name).toBe("Mónica");
    h.stop();
    expect(synth().cancel).toHaveBeenCalled();
  });

  it("en inglés usa en-US", () => {
    browserSpeech.speak("Hi there.", { locale: "en" });
    expect(synth()._utterances.at(-1)!.lang).toBe("en-US");
  });

  it("onEnd se dispara al terminar la locución", () => {
    const onEnd = vi.fn();
    browserSpeech.speak("Prueba", { locale: "es", onEnd });
    const u = synth()._utterances[0]! as unknown as { onend: () => void };
    u.onend();
    expect(onEnd).toHaveBeenCalled();
  });

  describe("elección de voz (opts.voiceURI / preferencia guardada / auto-match)", () => {
    it("opts.voiceURI que calza con una voz disponible: la usa", () => {
      browserSpeech.speak("Hola", { locale: "es", voiceURI: "com.test.monica" });
      const u = synth()._utterances[0]!;
      expect((u.voice as { name: string }).name).toBe("Mónica");
    });

    it("opts.voiceURI que NO calza con ninguna voz disponible: cae al auto-match por idioma", () => {
      browserSpeech.speak("Hola", { locale: "es", voiceURI: "com.test.voz-inexistente" });
      const u = synth()._utterances[0]!;
      expect((u.voice as { name: string }).name).toBe("Mónica"); // auto-match es-ES
    });

    it("sin opts.voiceURI, usa la preferencia guardada del usuario si calza con una voz disponible", () => {
      window.localStorage.setItem("aluna:voice:es", "com.test.monica");
      browserSpeech.speak("Hola", { locale: "es" });
      const u = synth()._utterances[0]!;
      expect((u.voice as { name: string }).name).toBe("Mónica");
    });

    it("sin opts.voiceURI, si la preferencia guardada no calza con ninguna voz: cae al auto-match", () => {
      window.localStorage.setItem("aluna:voice:es", "voz-de-otro-dispositivo");
      browserSpeech.speak("Hola", { locale: "es" });
      const u = synth()._utterances[0]!;
      expect((u.voice as { name: string }).name).toBe("Mónica"); // auto-match es-ES
    });

    it("opts.voiceURI explícito gana sobre la preferencia guardada", () => {
      window.localStorage.setItem("aluna:voice:en", "com.test.alex");
      browserSpeech.speak("Hi", { locale: "en", voiceURI: "com.test.alex" });
      const u = synth()._utterances[0]!;
      expect((u.voice as { name: string }).name).toBe("Alex");
    });
  });
});
