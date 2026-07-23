import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";
import { VoiceControls } from "../voice-controls";

type MockVoice = { lang: string; name: string; voiceURI: string };

function mockSpeechSynthesis(voices: MockVoice[]) {
  // jsdom no trae Web Speech API → la simulamos (mismo patrón que
  // lib/voice/__tests__/browser-speech.test.ts).
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
    speak: vi.fn(),
    getVoices: () => voices,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
}

function renderControls() {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <VoiceControls />
    </NextIntlClientProvider>,
  );
}

describe("VoiceControls", () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete (window as unknown as { speechSynthesis?: unknown }).speechSynthesis;
  });

  it("lista las voces del locale actual (es) + la opción de sistema por defecto", () => {
    mockSpeechSynthesis([
      { lang: "es-ES", name: "Mónica", voiceURI: "com.test.monica" },
      { lang: "es-MX", name: "Paulina", voiceURI: "com.test.paulina" },
      { lang: "en-US", name: "Alex", voiceURI: "com.test.alex" }, // otro idioma: no aparece
    ]);
    renderControls();
    const select = screen.getByRole("combobox", { name: es.settings.voiceTitle });
    const options = within(select).getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual([es.settings.voiceSystemDefault, "Mónica", "Paulina"]);
  });

  it("seleccionar una voz persiste la preferencia en localStorage para el locale actual", () => {
    mockSpeechSynthesis([{ lang: "es-ES", name: "Mónica", voiceURI: "com.test.monica" }]);
    renderControls();
    const select = screen.getByRole("combobox", { name: es.settings.voiceTitle });
    fireEvent.change(select, { target: { value: "com.test.monica" } });
    expect(window.localStorage.getItem("aluna:voice:es")).toBe("com.test.monica");
  });

  it("volver a 'voz del sistema' borra la preferencia guardada", () => {
    window.localStorage.setItem("aluna:voice:es", "com.test.monica");
    mockSpeechSynthesis([{ lang: "es-ES", name: "Mónica", voiceURI: "com.test.monica" }]);
    renderControls();
    const select = screen.getByRole("combobox", { name: es.settings.voiceTitle });
    fireEvent.change(select, { target: { value: "" } });
    expect(window.localStorage.getItem("aluna:voice:es")).toBeNull();
  });

  it("preselecciona el select desde la preferencia ya guardada", () => {
    window.localStorage.setItem("aluna:voice:es", "com.test.monica");
    mockSpeechSynthesis([{ lang: "es-ES", name: "Mónica", voiceURI: "com.test.monica" }]);
    renderControls();
    const select = screen.getByRole("combobox", { name: es.settings.voiceTitle }) as HTMLSelectElement;
    expect(select.value).toBe("com.test.monica");
  });

  it("el botón de prueba llama a speak()", () => {
    mockSpeechSynthesis([{ lang: "es-ES", name: "Mónica", voiceURI: "com.test.monica" }]);
    renderControls();
    fireEvent.click(screen.getByRole("button", { name: es.settings.voiceTest }));
    const synth = window.speechSynthesis as unknown as { speak: ReturnType<typeof vi.fn> };
    expect(synth.speak).toHaveBeenCalledTimes(1);
  });

  it("sin speechSynthesis en el navegador, muestra la nota de no-soportado en vez del select", () => {
    renderControls(); // beforeEach ya borró window.speechSynthesis
    expect(screen.getByText(es.settings.voiceUnsupported)).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });
});
