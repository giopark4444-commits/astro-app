// Catálogo del selector de modelos de PRUEBA (banco A/B de proveedores).
//
// Herramienta de desarrollo: permite elegir, por ventana de chat, con qué
// proveedor+modelo responde Aluna, para comparar voz/empatía/costo entre
// Hermes, Claude, OpenAI, Gemini, DeepSeek y Ollama local. NO es una feature
// de usuario: solo se enciende en development o con MODEL_PICKER_ENABLED=1
// (mismo patrón de gate que las rutas dev-*). Apagado, parseModelOverride
// ignora cualquier override que venga en el body — defensa en profundidad:
// aunque un cliente mande el campo en producción, no tiene efecto.
//
// Los IDs de modelo son datos (no lógica): si un proveedor renombra un modelo,
// se edita aquí; y el picker permite además un ID custom tecleado a mano, por
// eso la validación acepta cualquier ID con forma razonable, no solo los del
// catálogo.

export type PickerProviderId =
  | "hermes"
  | "groq"
  | "openrouter"
  | "anthropic"
  | "openai"
  | "gemini"
  | "deepseek"
  | "ollama";

export interface ModelOverride {
  provider: PickerProviderId;
  model: string;
}

export interface CatalogModel {
  id: string;
  label: string;
}

export interface CatalogProvider {
  id: PickerProviderId;
  label: string;
  models: CatalogModel[];
}

export const MODEL_CATALOG: CatalogProvider[] = [
  {
    id: "hermes",
    label: "Hermes (Nous)",
    models: [
      { id: "Hermes-4-405B", label: "Hermes 4 405B · lecturas" },
      { id: "Hermes-4-70B", label: "Hermes 4 70B · volumen" },
    ],
  },
  {
    id: "groq",
    label: "Groq (gratis)",
    models: [
      { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B · gratis rápido" },
      { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B · instantáneo" },
      { id: "qwen/qwen3.6-27b", label: "Qwen 3.6 27B" },
    ],
  },
  {
    id: "openrouter",
    label: "OpenRouter (gratis)",
    models: [
      { id: "nvidia/nemotron-3-ultra-550b-a55b:free", label: "Nemotron 550B · gratis" },
      { id: "google/gemma-4-31b-it:free", label: "Gemma 4 31B · gratis" },
    ],
  },
  {
    id: "anthropic",
    label: "Claude",
    models: [
      { id: "claude-sonnet-5", label: "Sonnet 5 · empatía" },
      { id: "claude-haiku-4-5", label: "Haiku 4.5 · rápido" },
      { id: "claude-opus-4-8", label: "Opus 4.8" },
    ],
  },
  {
    id: "openai",
    label: "OpenAI",
    models: [
      { id: "gpt-5.6-terra", label: "GPT-5.6 Terra · chat" },
      { id: "gpt-5.6-luna", label: "GPT-5.6 Luna · barato" },
      { id: "gpt-4o", label: "GPT-4o" },
    ],
  },
  {
    id: "gemini",
    label: "Gemini",
    models: [
      { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash · free tier" },
      { id: "gemini-3.6-flash", label: "Gemini 3.6 Flash · nuevo" },
    ],
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    models: [
      { id: "deepseek-chat", label: "DeepSeek Chat" },
      { id: "deepseek-reasoner", label: "DeepSeek Reasoner" },
    ],
  },
  {
    id: "ollama",
    label: "Ollama (local)",
    models: [{ id: "hermes3:8b", label: "Hermes 3 8B · gratis local" }],
  },
];

const PROVIDER_IDS = new Set<string>(MODEL_CATALOG.map((p) => p.id));

// El ID viaja en URLs de proveedor (Gemini lo interpola en el path) y en JSON:
// solo caracteres de identificador de modelo, máx. 100. Cubre los formatos
// reales: "gpt-5.6-terra", "Hermes-4-405B", "hermes3:8b", "org/model".
const MODEL_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,99}$/;

export function isModelPickerEnabled(): boolean {
  return process.env.NODE_ENV === "development" || process.env.MODEL_PICKER_ENABLED === "1";
}

/** Lee el override {provider, model} del body de una ruta. Tolerante: cualquier
 *  forma inválida (o el picker apagado) → null, y la ruta sigue con la
 *  resolución por defecto de siempre. Nunca lanza. */
export function parseModelOverride(raw: unknown): ModelOverride | null {
  if (!isModelPickerEnabled()) return null;
  if (!raw || typeof raw !== "object") return null;
  const provider = (raw as { provider?: unknown }).provider;
  const model = (raw as { model?: unknown }).model;
  if (typeof provider !== "string" || !PROVIDER_IDS.has(provider)) return null;
  if (typeof model !== "string" || !MODEL_ID_RE.test(model)) return null;
  return { provider: provider as PickerProviderId, model };
}

/** "Llave presente" por proveedor — espejo de las env vars que usa provider.ts.
 *  Para ollama la "llave" es el flag OLLAMA_ENABLED=1 (local, sin llave real). */
export function providerHasKey(id: PickerProviderId): boolean {
  if (id === "hermes") return Boolean(process.env.NOUS_API_KEY);
  if (id === "groq") return Boolean(process.env.GROQ_API_KEY);
  if (id === "openrouter") return Boolean(process.env.OPENROUTER_API_KEY);
  if (id === "anthropic") return Boolean(process.env.ANTHROPIC_API_KEY);
  if (id === "openai") return Boolean(process.env.OPENAI_API_KEY);
  if (id === "gemini") return Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
  if (id === "deepseek") return Boolean(process.env.DEEPSEEK_API_KEY);
  return process.env.OLLAMA_ENABLED === "1";
}

export interface CatalogStatus {
  enabled: boolean;
  providers: Array<CatalogProvider & { hasKey: boolean }>;
}

/** Estado para la ruta /api/dev-models: catálogo + qué proveedores tienen
 *  llave. Solo booleanos — jamás los valores de las llaves. */
export function catalogStatus(): CatalogStatus {
  return {
    enabled: isModelPickerEnabled(),
    providers: MODEL_CATALOG.map((p) => ({ ...p, hasKey: providerHasKey(p.id) })),
  };
}
