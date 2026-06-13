"use client";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTheme } from "@/lib/theme/theme-provider";
import { THEMES, MODES, type Theme } from "@/lib/theme/themes";
import { setLanguage } from "../actions";
import styles from "./settings.module.css";

const SWATCH: Record<Theme, string> = {
  observatory: "linear-gradient(135deg, #1a2150, #e7c986)",
  aurora: "linear-gradient(135deg, #fdf3ec, #ffb86b)",
  cosmic: "linear-gradient(135deg, #2a0f4a, #b86bff)",
};

export function SettingsControls({ currentLocale }: { currentLocale: string }) {
  const t = useTranslations("settings");
  const router = useRouter();
  const { theme, setTheme, mode, setMode } = useTheme();

  return (
    <div className={styles.wrap}>
      <section className={styles.section}>
        <h3 className={styles.label}>{t("lightMode")}</h3>
        <div className={styles.seg} role="group" aria-label={t("lightMode")}>
          {MODES.map((m) => (
            <button key={m} className={`${styles.segItem} ${mode === m ? styles.segOn : ""}`}
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
        <div className={styles.seg} role="group" aria-label={t("language")}>
          {(["es", "en"] as const).map((loc) => (
            <button key={loc} className={`${styles.segItem} ${currentLocale === loc ? styles.segOn : ""}`}
              aria-pressed={currentLocale === loc}
              onClick={async () => { await setLanguage(loc); router.refresh(); }}>{loc.toUpperCase()}</button>
          ))}
        </div>
      </section>
    </div>
  );
}
