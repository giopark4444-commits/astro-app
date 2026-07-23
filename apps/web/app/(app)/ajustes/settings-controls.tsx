"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTheme } from "@/lib/theme/theme-provider";
import { THEMES, MODES, type Theme } from "@/lib/theme/themes";
import { setLanguage, setIntentUseInAI, setMemoryEnabled } from "../actions";
import { VoiceControls } from "./voice-controls";
import styles from "./settings.module.css";

const SWATCH: Record<Theme, string> = {
  observatory: "linear-gradient(135deg, #1a2150, #e7c986)",
  aurora: "linear-gradient(135deg, #fdf3ec, #ffb86b)",
  cosmic: "linear-gradient(135deg, #2a0f4a, #b86bff)",
  selva: "linear-gradient(135deg, #0d3b31, #92d8b8)",
  alba: "linear-gradient(135deg, #fdf0e2, #d0854f)",
  eclipse: "linear-gradient(135deg, #232330, #caccde)",
};

export function SettingsControls({
  currentLocale,
  hasIntent,
  intentUseInAI,
  memoryEnabled,
}: {
  currentLocale: string;
  hasIntent: boolean;
  intentUseInAI: boolean;
  memoryEnabled: boolean;
}) {
  const t = useTranslations("settings");
  const router = useRouter();
  const { theme, setTheme, mode, setMode } = useTheme();
  // Estado local optimista: el toggle no depende de router.refresh() para
  // sentirse instantáneo (setIntentUseInAI es fire-and-forget del lado
  // servidor, igual que setTheme/setMode arriba).
  const [useInAI, setUseInAI] = useState(intentUseInAI);
  // Casilla dedicada de memoria (Fase 1C): mismo patrón optimista que arriba,
  // pero SIN disabled — a diferencia del cuestionario, la memoria no depende
  // de que exista otro dato previo.
  const [memOn, setMemOn] = useState(memoryEnabled);

  return (
    <>
      {/* Móvil (<1080px): tarjetas de swatch — intactas desde antes de R4c T8.
          Ocultas en desktop (media queries espejo, ver settings.module.css). */}
      <div className={styles.wrap}>
        <section className={styles.section}>
          <h3 className={styles.label}>{t("lightMode")}</h3>
          <div className="seg" role="group" aria-label={t("lightMode")}>
            {MODES.map((m) => (
              <button key={m} className={`seg__item ${styles.segItem} ${mode === m ? "seg__item--active" : ""}`}
                aria-pressed={mode === m} onClick={() => setMode(m)}>{t(m)}</button>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h3 className={styles.label}>{t("theme")}</h3>
          <div className={styles.themes} role="group" aria-label={t("theme")}>
            {THEMES.map((th) => (
              <button key={th} className={`${styles.tc} ${theme === th ? styles.tcOn : ""}`}
                aria-pressed={theme === th} onClick={() => setTheme(th)}>
                <span className={styles.sw} style={{ background: SWATCH[th] }} aria-hidden />
                {t(th)}
              </button>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h3 className={styles.label}>{t("language")}</h3>
          <div className="seg" role="group" aria-label={t("language")}>
            {(["es", "en"] as const).map((loc) => (
              <button key={loc} className={`seg__item ${styles.segItem} ${currentLocale === loc ? "seg__item--active" : ""}`}
                aria-pressed={currentLocale === loc}
                onClick={async () => { await setLanguage(loc); router.refresh(); }}>{loc.toUpperCase()}</button>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h3 className={styles.label}>{t("intentAI")}</h3>
          <p>{t("intentAIHint")}</p>
          <div className="seg" role="group" aria-label={t("intentAI")}>
            {([true, false] as const).map((on) => (
              <button
                key={String(on)}
                className={`seg__item ${styles.segItem} ${useInAI === on ? "seg__item--active" : ""}`}
                aria-pressed={useInAI === on}
                disabled={!hasIntent}
                onClick={async () => {
                  setUseInAI(on);
                  await setIntentUseInAI(on);
                }}
              >
                {t(on ? "intentAIOn" : "intentAIOff")}
              </button>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h3 className={styles.label}>{t("memoryToggle")}</h3>
          <p>{t("memoryToggleHint")}</p>
          <div className="seg" role="group" aria-label={t("memoryToggle")}>
            {([true, false] as const).map((on) => (
              <button
                key={String(on)}
                className={`seg__item ${styles.segItem} ${memOn === on ? "seg__item--active" : ""}`}
                aria-pressed={memOn === on}
                onClick={async () => {
                  setMemOn(on);
                  await setMemoryEnabled(on);
                }}
              >
                {t(on ? "memoryOn" : "memoryOff")}
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* Desktop (≥1080px): filas compactas — mockup 06 §5.3 (.pf-prow).
          Oculto en móvil (media queries espejo). */}
      <div className={styles.compact}>
        <div className={styles.prow}>
          <span className={styles.plab}>{t("theme")}</span>
          <div className={styles.sws} role="group" aria-label={t("theme")}>
            {THEMES.map((th) => (
              <button key={th} className={`${styles.psw} ${theme === th ? styles.pswOn : ""}`}
                aria-pressed={theme === th} onClick={() => setTheme(th)}>
                <i className={styles.pswDot} data-theme-dot={th} aria-hidden /> {t(th)}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.prow}>
          <span className={styles.plab}>{t("lightMode")}</span>
          <div className={`seg ${styles.segCompactWrap}`} role="group" aria-label={t("lightMode")}>
            {MODES.map((m) => (
              <button key={m} className={`seg__item ${styles.segItem} ${styles.segCompact} ${mode === m ? "seg__item--active" : ""}`}
                aria-pressed={mode === m} onClick={() => setMode(m)}>{t(m)}</button>
            ))}
          </div>
        </div>

        <div className={styles.prow}>
          <span className={styles.plab}>{t("language")}</span>
          <div className={`seg ${styles.segCompactWrap}`} role="group" aria-label={t("language")}>
            {(["es", "en"] as const).map((loc) => (
              <button key={loc} className={`seg__item ${styles.segItem} ${styles.segCompact} ${currentLocale === loc ? "seg__item--active" : ""}`}
                aria-pressed={currentLocale === loc}
                onClick={async () => { await setLanguage(loc); router.refresh(); }}>{loc.toUpperCase()}</button>
            ))}
          </div>
        </div>

        {/* Toggle de intención (cuestionario): misma fila compacta que el resto;
            el hint largo vive solo en móvil — en desktop lo lleva el title. */}
        <div className={styles.prow} title={t("intentAIHint")}>
          <span className={styles.plab}>{t("intentAI")}</span>
          <div className={`seg ${styles.segCompactWrap}`} role="group" aria-label={t("intentAI")}>
            {([true, false] as const).map((on) => (
              <button
                key={String(on)}
                className={`seg__item ${styles.segItem} ${styles.segCompact} ${useInAI === on ? "seg__item--active" : ""}`}
                aria-pressed={useInAI === on}
                disabled={!hasIntent}
                onClick={async () => {
                  setUseInAI(on);
                  await setIntentUseInAI(on);
                }}
              >
                {t(on ? "intentAIOn" : "intentAIOff")}
              </button>
            ))}
          </div>
        </div>

        {/* Toggle de memoria (Fase 1C): misma fila compacta, SIN disabled. */}
        <div className={styles.prow} title={t("memoryToggleHint")}>
          <span className={styles.plab}>{t("memoryToggle")}</span>
          <div className={`seg ${styles.segCompactWrap}`} role="group" aria-label={t("memoryToggle")}>
            {([true, false] as const).map((on) => (
              <button
                key={String(on)}
                className={`seg__item ${styles.segItem} ${styles.segCompact} ${memOn === on ? "seg__item--active" : ""}`}
                aria-pressed={memOn === on}
                onClick={async () => {
                  setMemOn(on);
                  await setMemoryEnabled(on);
                }}
              >
                {t(on ? "memoryOn" : "memoryOff")}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Voz (T-voz): sección única, NO duplicada en el patrón móvil/.wrap vs
          desktop/.compact de arriba — un <select> + botón "escuchar" no
          decompone en el patrón de pills segmentadas, y duplicar el estado
          costaría complejidad sin beneficio visual. Vive fuera de ambos
          bloques para que se vea en TODOS los anchos (.wrap se oculta
          ≥1080px, .compact se oculta <1080px — ver settings.module.css). */}
      <section className={`${styles.section} ${styles.voiceSection}`}>
        <h3 className={styles.label}>{t("voiceTitle")}</h3>
        <VoiceControls />
      </section>
    </>
  );
}
