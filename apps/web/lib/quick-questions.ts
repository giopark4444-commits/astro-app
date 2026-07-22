export const PAGES = 2; // páginas base (con defaults), siempre presentes
export const PER_PAGE = 6;
export const MAX_PAGES = 6; // tope total de páginas (base + extra que agrega el usuario)
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

// Slot de una página EXTRA (creada por el usuario, sin default): recorta; un
// slot vacío queda "" (no hay default que rellenar).
function cleanCustom(candidate: unknown): string {
  if (typeof candidate !== "string") return "";
  return candidate.trim().slice(0, MAX_LEN);
}

/**
 * Normaliza cualquier entrada a las páginas visibles del chat:
 * - Las 2 páginas BASE siempre presentes; sus huecos ("" o faltantes) se
 *   rellenan con el default del locale.
 * - Las páginas EXTRA (3+) que el usuario agregó se conservan hasta MAX_PAGES,
 *   cada una con PER_PAGE slots ("" para los vacíos); las páginas extra
 *   totalmente vacías se descartan.
 */
export function parseQuickQuestions(raw: unknown, locale: string): string[][] {
  const def = DEFAULT_QUICK_QUESTIONS[localeKey(locale)];
  const pages = asPages(raw);
  const base = def.map((defPage, p) => {
    const page = Array.isArray(pages[p]) ? (pages[p] as unknown[]) : [];
    return defPage.map((defQ, i) => cleanOne(page[i], defQ));
  });
  const out = [...base];
  for (let p = def.length; p < pages.length && out.length < MAX_PAGES; p++) {
    const page = Array.isArray(pages[p]) ? (pages[p] as unknown[]) : [];
    const slots = Array.from({ length: PER_PAGE }, (_, i) => cleanCustom(page[i]));
    if (slots.some((q) => q !== "")) out.push(slots);
  }
  return out;
}

/**
 * Prepara las páginas para persistir. Páginas base: un slot vacío O idéntico al
 * default del locale se guarda como "" (centinela "usa el default"), así al
 * leer se rellena con el default del locale VIGENTE (no se congela el idioma).
 * Páginas extra: se guardan las que tengan al menos una pregunta (recortada a
 * MAX_LEN); una página extra vacía se descarta (vaciarla = borrarla). Tope
 * MAX_PAGES.
 */
export function normalizeForSave(pages: string[][], locale: string): { pages: string[][] } {
  const def = DEFAULT_QUICK_QUESTIONS[localeKey(locale)];
  const rows = asPages(pages);
  const out = def.map((defPage, p) => {
    const row = Array.isArray(rows[p]) ? (rows[p] as unknown[]) : [];
    return defPage.map((defQ, i) => {
      const candidate = typeof row[i] === "string" ? (row[i] as string).trim() : "";
      if (!candidate || candidate === defQ) return "";
      return candidate.slice(0, MAX_LEN);
    });
  });
  for (let p = def.length; p < rows.length && out.length < MAX_PAGES; p++) {
    const row = Array.isArray(rows[p]) ? (rows[p] as unknown[]) : [];
    const slots = Array.from({ length: PER_PAGE }, (_, i) => cleanCustom(row[i]));
    if (slots.some((q) => q !== "")) out.push(slots);
  }
  return { pages: out };
}

/**
 * Lee el flag de visibilidad de los accesos rápidos guardado junto a las
 * páginas en el mismo jsonb (`{ enabled, pages }`). Por defecto TRUE (visibles):
 * solo se apaga si el usuario lo puso explícitamente en false. Datos viejos sin
 * la clave (solo `{ pages }` o array pelado) → visibles.
 */
export function parseQuickQuestionsEnabled(raw: unknown): boolean {
  if (raw && typeof raw === "object" && !Array.isArray(raw) && "enabled" in raw) {
    return (raw as { enabled?: unknown }).enabled !== false;
  }
  return true;
}

/**
 * Extrae las páginas TAL COMO están guardadas (sin resolver defaults), para
 * operaciones que solo cambian el flag `enabled` y deben preservar `pages`
 * verbatim (read-modify-write server-side, sin reescribir desde el cliente).
 */
export function rawQuickQuestionsPages(raw: unknown): string[][] {
  return asPages(raw).map((p) =>
    Array.isArray(p) ? (p as unknown[]).map((q) => (typeof q === "string" ? q : "")) : [],
  );
}
