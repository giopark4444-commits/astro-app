"use client";
import { useTranslations } from "next-intl";
import styles from "./speak-button.module.css";

/** Botón 🔊 "Escuchar / Detener" para leer un mensaje de Aluna en voz alta. */
export function SpeakButton({ speaking, onClick }: { speaking: boolean; onClick: () => void }) {
  const t = useTranslations("voice");
  return (
    <button
      type="button"
      className={styles.btn}
      onClick={onClick}
      aria-pressed={speaking}
      aria-label={speaking ? t("stop") : t("listen")}
      title={speaking ? t("stop") : t("listen")}
    >
      {speaking ? (
        <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden>
          <rect x="4" y="4" width="8" height="8" rx="1.5" fill="currentColor" />
        </svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.3">
          <path d="M3 6h2.2L8.5 3.3v9.4L5.2 10H3z" fill="currentColor" stroke="none" />
          <path d="M11 5.6a3.4 3.4 0 0 1 0 4.8" strokeLinecap="round" />
          <path d="M12.7 4a5.6 5.6 0 0 1 0 8" strokeLinecap="round" opacity="0.6" />
        </svg>
      )}
    </button>
  );
}
