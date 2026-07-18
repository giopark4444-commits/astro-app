// Capa agnóstica de VOZ para Aluna — espeja el patrón de lib/reading/provider.ts
// (proveedor intercambiable). Hoy: la voz del navegador (Web Speech API). Mañana,
// sin tocar los consumidores: Kokoro (Free más natural) y Hume (Plus, emocional).

export interface SpeakOptions {
  locale: "es" | "en";
  onEnd?: () => void;
  onError?: () => void;
}

/** Control de una locución en curso. */
export interface SpeakHandle {
  stop(): void;
}

export interface VoiceProvider {
  readonly id: string;
  /** ¿La plataforma soporta este proveedor? (solo cliente). */
  supported(): boolean;
  /** Lee `text` en voz alta. Devuelve un handle para detenerla. */
  speak(text: string, opts: SpeakOptions): SpeakHandle;
}
