"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { VoiceMode } from "@/lib/reading/voices";
import { getVoiceMode, setVoiceMode } from "@/lib/voice-mode";
import styles from "./voice-mode-card.module.css";

// Selector del MODO DE ALUNA (🌙 íntima / 📚 estudio / 🔭 pro) en Ajustes.
// Elección por dispositivo (localStorage, ver lib/voice-mode.ts): cero
// migraciones; cada chat y lectura la manda como body.voiceMode en su próxima
// petición, así que el cambio aplica al siguiente mensaje sin recargar.

const MODES: Array<{ id: VoiceMode; emoji: string }> = [
  { id: "intima", emoji: "🌙" },
  { id: "estudio", emoji: "📚" },
  { id: "pro", emoji: "🔭" },
];

export function VoiceModeCard() {
  const t = useTranslations("settings");
  // Arranca en "intima" (lo que renderiza el server) y se hidrata con el valor
  // real del dispositivo en el efecto — evita mismatch SSR/cliente.
  const [mode, setMode] = useState<VoiceMode>("intima");
  useEffect(() => {
    setMode(getVoiceMode());
  }, []);

  const choose = (next: VoiceMode) => {
    setMode(next);
    setVoiceMode(next);
  };

  return (
    <section className="card">
      <h2 className={styles.eyebrow}>{t("voiceModeTitle")}</h2>
      <p className={styles.hint}>{t("voiceModeHint")}</p>
      <div className={styles.options} role="radiogroup" aria-label={t("voiceModeTitle")}>
        {MODES.map(({ id, emoji }) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={mode === id}
            className={`${styles.option} ${mode === id ? styles.selected : ""}`}
            onClick={() => choose(id)}
          >
            <span className={styles.emoji} aria-hidden>
              {emoji}
            </span>
            <span className={styles.texts}>
              <span className={styles.name}>{t(`voiceMode_${id}`)}</span>
              <span className={styles.desc}>{t(`voiceMode_${id}Desc`)}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
