import { GLOSSARY_ES, type GlossaryEntry } from "./glossary-es";
import { GLOSSARY_EN } from "./glossary-en";
export type { GlossaryEntry };
export function glossaryEntry(key: string, locale: string): GlossaryEntry | null {
  const g = locale === "en" ? GLOSSARY_EN : GLOSSARY_ES;
  return g[key] ?? null;
}
