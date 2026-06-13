"use client";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTheme } from "@/lib/theme/theme-provider";
import { THEMES, MODES } from "@/lib/theme/themes";
import { setLanguage } from "../actions";

export function SettingsControls() {
  const t = useTranslations("settings");
  const router = useRouter();
  const { theme, setTheme, mode, setMode } = useTheme();
  return (
    <div style={{ display: "grid", gap: 18, padding: 20 }}>
      <section>
        <h3>{t("lightMode")}</h3>
        <div style={{ display: "flex", gap: 8 }}>
          {MODES.map((m) => (
            <button key={m} onClick={() => setMode(m)} aria-pressed={mode === m}>{t(m)}</button>
          ))}
        </div>
      </section>
      <section>
        <h3>{t("theme")}</h3>
        <div style={{ display: "flex", gap: 8 }}>
          {THEMES.map((th) => (
            <button key={th} onClick={() => setTheme(th)} aria-pressed={theme === th}>{t(th)}</button>
          ))}
        </div>
      </section>
      <section>
        <h3>{t("language")}</h3>
        <div style={{ display: "flex", gap: 8 }}>
          {(["es", "en"] as const).map((loc) => (
            <button key={loc} onClick={async () => { await setLanguage(loc); router.refresh(); }}>{loc.toUpperCase()}</button>
          ))}
        </div>
      </section>
    </div>
  );
}
