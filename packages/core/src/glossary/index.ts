import { GLOSSARY_ES, type GlossaryEntry } from "./entries-es";
import { GLOSSARY_EN } from "./entries-en";

export type { GlossaryEntry };
export { GLOSSARY_ES, GLOSSARY_EN };

export function glossaryEntry(key: string, locale: string): GlossaryEntry | null {
  const g = locale === "en" ? GLOSSARY_EN : GLOSSARY_ES;
  return g[key] ?? null;
}
