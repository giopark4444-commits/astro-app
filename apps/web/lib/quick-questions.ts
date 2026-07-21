export const PAGES = 2;
export const PER_PAGE = 6;
export const MAX_LEN = 120;

export type Locale = "es" | "en";

export function localeKey(locale: string): Locale {
  return locale.toLowerCase().startsWith("en") ? "en" : "es";
}

// Preguntas por defecto (aprobadas por Gio). Página 1 = generales/reflexivas;
// página 2 = los temas más consultados del mundo (amor/dinero/propósito/día/
// soltar/autoconocimiento) en voz evolutiva de Aluna, no predictiva.
export const DEFAULT_QUICK_QUESTIONS: Record<Locale, string[][]> = {
  es: [
    [
      "¿Cómo está mi energía hoy?",
      "¿En qué me conviene enfocarme?",
      "¿Qué necesito soltar?",
      "¿Cómo están mis vínculos ahora?",
      "¿Qué me está pidiendo mi carta?",
      "¿Qué lección me trae este momento?",
    ],
    [
      "¿Qué necesito entender sobre mis vínculos ahora?",
      "¿Qué me está frenando con el dinero?",
      "¿Hacia dónde me llama mi propósito?",
      "¿Qué energía trae mi día hoy?",
      "¿Qué necesito soltar para crecer?",
      "¿Qué me revela mi carta sobre quién soy?",
    ],
  ],
  en: [
    [
      "How is my energy today?",
      "What should I focus on?",
      "What do I need to release?",
      "How are my relationships right now?",
      "What is my chart asking of me?",
      "What lesson does this moment bring?",
    ],
    [
      "What do I need to understand about my relationships now?",
      "What's holding me back with money?",
      "Where is my purpose calling me?",
      "What energy does my day hold today?",
      "What do I need to release to grow?",
      "What does my chart reveal about who I am?",
    ],
  ],
};

function asPages(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object" && Array.isArray((raw as { pages?: unknown }).pages)) {
    return (raw as { pages: unknown[] }).pages;
  }
  return [];
}

function cleanOne(candidate: unknown, fallback: string): string {
  if (typeof candidate !== "string") return fallback;
  const trimmed = candidate.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, MAX_LEN);
}

/** Normaliza cualquier entrada a exactamente PAGES×PER_PAGE, rellenando con defaults. */
export function parseQuickQuestions(raw: unknown, locale: string): string[][] {
  const def = DEFAULT_QUICK_QUESTIONS[localeKey(locale)];
  const pages = asPages(raw);
  return def.map((defPage, p) => {
    const page = Array.isArray(pages[p]) ? (pages[p] as unknown[]) : [];
    return defPage.map((defQ, i) => cleanOne(page[i], defQ));
  });
}

/**
 * Prepara las 2×6 para persistir. Un slot vacío O idéntico al default del
 * locale se guarda como "" (centinela "usa el default"): al leer se rellena
 * con el default del locale VIGENTE, así los accesos por defecto siguen el
 * idioma en vez de congelarse en el idioma en que se guardaron. Los slots
 * personalizados se guardan recortados a MAX_LEN.
 */
export function normalizeForSave(pages: string[][], locale: string): { pages: string[][] } {
  const def = DEFAULT_QUICK_QUESTIONS[localeKey(locale)];
  const rows = asPages(pages);
  return {
    pages: def.map((defPage, p) => {
      const row = Array.isArray(rows[p]) ? (rows[p] as unknown[]) : [];
      return defPage.map((defQ, i) => {
        const candidate = typeof row[i] === "string" ? (row[i] as string).trim() : "";
        if (!candidate || candidate === defQ) return "";
        return candidate.slice(0, MAX_LEN);
      });
    }),
  };
}
