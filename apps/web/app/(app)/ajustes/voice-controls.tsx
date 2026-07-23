"use client";
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { getVoiceProvider } from "@/lib/voice";
import type { SpeakHandle } from "@/lib/voice";
import { getPreferredVoiceURI, setPreferredVoiceURI, listVoices } from "@/lib/voice/preference";
import styles from "./voice-controls.module.css";

/** Selector de voz en Ajustes (T-voz): elige entre las voces instaladas del
 * navegador para el idioma actual — se guarda por DISPOSITIVO (ver
 * lib/voice/preference.ts) y el botón 🔊 de los chats la usa automáticamente
 * sin cambios (browser-speech.ts la lee sola). */
export function VoiceControls() {
  const t = useTranslations("settings");
  const locale = useLocale() === "en" ? "en" : "es";
  // `supported` arranca en false y se resuelve tras montar — mismo patrón que
  // useSpeak() (index.ts) para no desajustar la hidratación SSR/cliente.
  const [supported, setSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selected, setSelected] = useState("");
  const handleRef = useRef<SpeakHandle | null>(null);

  useEffect(() => {
    const ok = typeof window !== "undefined" && "speechSynthesis" in window;
    setSupported(ok);
    setSelected(getPreferredVoiceURI(locale) ?? "");
    setVoices(listVoices(locale));
    if (!ok) return;

    // getVoices() suele venir vacío en la 1ª llamada — el navegador las carga
    // async y avisa con "voiceschanged" (mismo comentario que browser-speech.ts).
    function onVoicesChanged() {
      setVoices(listVoices(locale));
    }
    window.speechSynthesis.addEventListener("voiceschanged", onVoicesChanged);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", onVoicesChanged);
      handleRef.current?.stop();
    };
  }, [locale]);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    setSelected(value);
    setPreferredVoiceURI(locale, value || null);
  }

  function handleTest() {
    handleRef.current?.stop();
    handleRef.current = getVoiceProvider().speak(
      t("voiceSample"),
      selected ? { locale, voiceURI: selected } : { locale },
    );
  }

  return (
    <>
      <p>{t("voiceHint")}</p>
      {!supported ? (
        <p className={styles.note}>{t("voiceUnsupported")}</p>
      ) : (
        <div className={styles.row}>
          <select aria-label={t("voiceTitle")} className={styles.select} value={selected} onChange={handleChange}>
            <option value="">{t("voiceSystemDefault")}</option>
            {voices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name}
              </option>
            ))}
          </select>
          <button type="button" className={styles.testBtn} onClick={handleTest}>
            {t("voiceTest")}
          </button>
        </div>
      )}
    </>
  );
}
