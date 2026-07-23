// Lado CLIENTE del modo de voz (🌙 íntima / 📚 estudio / 🔭 pro): elección por
// dispositivo en localStorage (mismo patrón que el selector de voz 🔊 y el
// picker de modelos — sin migración de BD). Los componentes de chat/lecturas la
// leen con getVoiceMode() y la mandan como body.voiceMode; el selector de
// Ajustes la escribe con setVoiceMode(). El default es "intima".
import type { VoiceMode } from "@/lib/reading/voices";

const KEY = "aluna.voice-mode";
const MODES: readonly VoiceMode[] = ["intima", "estudio", "pro"];

export function getVoiceMode(): VoiceMode {
  if (typeof window === "undefined") return "intima";
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw && (MODES as readonly string[]).includes(raw) ? (raw as VoiceMode) : "intima";
  } catch {
    return "intima";
  }
}

export function setVoiceMode(mode: VoiceMode): void {
  try {
    window.localStorage.setItem(KEY, mode);
  } catch {
    /* sin storage (Safari privado): la elección vive solo esta visita */
  }
}
