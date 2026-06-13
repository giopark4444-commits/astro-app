import { getTranslations, getLocale } from "next-intl/server";
import { SettingsControls } from "./settings-controls";
import styles from "./settings.module.css";

export default async function AjustesPage() {
  const t = await getTranslations("settings");
  const locale = await getLocale();
  return (
    <main className={styles.page}>
      <h1 className={styles.title}>{t("title")}</h1>
      <SettingsControls currentLocale={locale} />
    </main>
  );
}
