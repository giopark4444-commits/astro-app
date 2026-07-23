"use client";
// Selector compacto del modo de voz (🌙 Íntimo / 📚 Aprender / 🔭 Profesional)
// para montar DENTRO de las ventanas de interpretación (Hoy y cada rubro), no
// solo en Ajustes: Gio quiere elegir el tono ahí mismo donde lee. Comparte
// storage con voice-mode-card.tsx (lib/voice-mode.ts, por dispositivo) — los
// cache keys de lecturas ya incluyen getVoiceMode(), así que cambiar de modo y
// re-pedir genera texto nuevo sin colisionar con el cacheado del otro modo.
// onChange avisa al panel anfitrión para que re-dispare su fetch.
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { getVoiceMode, setVoiceMode } from "@/lib/voice-mode";
import type { VoiceMode } from "@/lib/reading/voices";
import styles from "./interpretation-mode-picker.module.css";

const MODES: { mode: VoiceMode; emoji: string; labelKey: string }[] = [
  { mode: "intima", emoji: "🌙", labelKey: "voiceMode_intima" },
  { mode: "estudio", emoji: "📚", labelKey: "voiceMode_estudio" },
  { mode: "pro", emoji: "🔭", labelKey: "voiceMode_pro" },
];

export function InterpretationModePicker({ onChange }: { onChange?: (mode: VoiceMode) => void }) {
  const t = useTranslations("settings");
  // Arranca en "intima" (el default de getVoiceMode) y sincroniza tras montar:
  // localStorage no existe en SSR y leerlo en el primer render hidrataría mal.
  const [mode, setMode] = useState<VoiceMode>("intima");
  useEffect(() => {
    setMode(getVoiceMode());
  }, []);

  function pick(next: VoiceMode) {
    if (next === mode) return;
    setVoiceMode(next);
    setMode(next);
    onChange?.(next);
  }

  return (
    <div className={styles.row} role="radiogroup" aria-label={t("voiceModeTitle")}>
      {MODES.map(({ mode: m, emoji, labelKey }) => (
        <button
          key={m}
          type="button"
          role="radio"
          aria-checked={m === mode}
          className={styles.chip}
          data-on={m === mode || undefined}
          onClick={() => pick(m)}
        >
          <span aria-hidden>{emoji}</span> {t(labelKey)}
        </button>
      ))}
    </div>
  );
}
