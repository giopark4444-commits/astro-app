"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTheme } from "@/lib/theme/theme-provider";
import { THEMES, MODES, type Theme } from "@/lib/theme/themes";
import { setLanguage, setIntentUseInAI } from "../actions";
import styles from "./settings.module.css";

const SWATCH: Record<Theme, string> = {
  observatory: "linear-gradient(135deg, #1a2150, #e7c986)",
  aurora: "linear-gradient(135deg, #fdf3ec, #ffb86b)",
  cosmic: "linear-gradient(135deg, #2a0f4a, #b86bff)",
};

export function SettingsControls({
  currentLocale,
  hasIntent,
  intentUseInAI,
}: {
  currentLocale: string;
  hasIntent: boolean;
  intentUseInAI: boolean;
}) {
  const t = useTranslations("settings");
  const router = useRouter();
  const { theme, setTheme, mode, setMode } = useTheme();
  // Estado local optimista: el toggle no depende de router.refresh() para
  // sentirse instantáneo (setIntentUseInAI es fire-and-forget del lado
  // servidor, igual que setTheme/setMode arriba).
  const [useInAI, setUseInAI] = useState(intentUseInAI);

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
      </div>
    </>
  );
}
