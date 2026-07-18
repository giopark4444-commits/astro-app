import type { SpeakHandle, SpeakOptions, VoiceProvider } from "./types";

// Voz base (Free): la del navegador (Web Speech API `speechSynthesis`). Cero
// dependencias, cero descarga, funciona offline. No es tan natural como Kokoro,
// pero es sólida y universal — la base del modelo de niveles.
export const browserSpeech: VoiceProvider = {
  id: "browser",

  supported() {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  },

  speak(text: string, { locale, onEnd, onError }: SpeakOptions): SpeakHandle {
    const synth = window.speechSynthesis;
    synth.cancel(); // una sola voz a la vez

    const u = new SpeechSynthesisUtterance(text);
    u.lang = locale === "en" ? "en-US" : "es-ES";
    // Preferir una voz instalada del idioma correcto, si la hay (getVoices puede
    // venir vacío en la 1ª llamada — en ese caso el navegador usa su default del
    // idioma, que ya es correcto).
    const match = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith(u.lang.slice(0, 2).toLowerCase()));
    if (match) u.voice = match;
    u.rate = 1;
    u.onend = () => onEnd?.();
    u.onerror = () => onError?.();
    synth.speak(u);

    return { stop: () => synth.cancel() };
  },
};
