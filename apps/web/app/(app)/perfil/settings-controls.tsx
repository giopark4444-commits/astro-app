"use client";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTheme } from "@/lib/theme/theme-provider";
import { THEMES, MODES, type Theme } from "@/lib/theme/themes";
import { signOut } from "@/app/auth/actions";
import { setLanguage } from "../actions";
import styles from "./settings.module.css";

const SWATCH: Record<Theme, string> = {
  observatory: "linear-gradient(135deg, #1a2150, #e7c986)",
  aurora: "linear-gradient(135deg, #fdf3ec, #ffb86b)",
  cosmic: "linear-gradient(135deg, #2a0f4a, #b86bff)",
};

export function SettingsControls({ currentLocale, email }: { currentLocale: string; email: string }) {
  const t = useTranslations("settings");
  const tAuth = useTranslations("auth");
  const router = useRouter();
  const { theme, setTheme, mode, setMode } = useTheme();

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

        {/* Pie de cuenta — reusa el mismo signOut server action que
            app/login /app/signup (form action={signOut}); no existe hoy un
            botón de salir en ProfileMenu (se verificó leyéndolo), así que no
            hay "otro mecanismo" que duplicar — este es el único. */}
        <div className={styles.acct}>
          <span>{email}</span>
          <form action={signOut}>
            <button type="submit" className={styles.out}>{tAuth("logout")}</button>
          </form>
        </div>
      </div>
    </>
  );
}
