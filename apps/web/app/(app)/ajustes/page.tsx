import { getTranslations } from "next-intl/server";
import { SettingsControls } from "./settings-controls";

export default async function AjustesPage() {
  const t = await getTranslations("settings");
  return (<main><h1 className="display" style={{ padding: "20px 20px 0" }}>{t("title")}</h1><SettingsControls /></main>);
}
