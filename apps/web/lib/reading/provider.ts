import Anthropic from "@anthropic-ai/sdk";

// Capa agnóstica de proveedor para las lecturas de Aluna. La ruta arma el
// system + prompt (la VOZ) y este módulo solo se encarga de "llamar al modelo
// y devolver texto". Cambiar de proveedor = variables de entorno, sin tocar
// código:
//   READING_PROVIDER = anthropic | openai | gemini   (opcional; por defecto,
//     usa el primero cuyo API key esté presente, en ese orden)
//   ANTHROPIC_API_KEY / OPENAI_API_KEY / GEMINI_API_KEY
//   ANTHROPIC_READING_MODEL / OPENAI_READING_MODEL / GEMINI_READING_MODEL
//     (opcional; sobrescribe el modelo por defecto de cada proveedor)
//
// Claude va por su SDK oficial; OpenAI y Gemini por REST (fetch) para no sumar
// dependencias mientras los caminos están latentes.

export interface CompleteOptions {
  system: string;
  prompt: string;
  maxTokens: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  system: string;
  messages: ChatMessage[];
  maxTokens: number;
}

export interface ReadingProvider {
  readonly name: string;
  readonly model: string;
  /** Una respuesta one-shot (lecturas: system + prompt → texto). */
  complete(opts: CompleteOptions): Promise<string>;
  /** Conversación multi-turno (chat "Pregúntale a Aluna"). */
  chat(opts: ChatOptions): Promise<string>;
}

export type ResolvedProvider =
  | { available: true; provider: ReadingProvider }
  | { available: false };

const ORDER = ["anthropic", "openai", "gemini"] as const;
type ProviderName = (typeof ORDER)[number];

function keyFor(name: ProviderName): string | undefined {
  if (name === "anthropic") return process.env.ANTHROPIC_API_KEY;
  if (name === "openai") return process.env.OPENAI_API_KEY;
  return process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
}

/** Elige el proveedor a usar: el forzado por READING_PROVIDER si tiene llave,
 *  o el primero (en orden) cuya llave esté presente. Sin llaves → latente. */
export function resolveReadingProvider(): ResolvedProvider {
  const configured = (process.env.READING_PROVIDER ?? "").toLowerCase();
  const candidates: ProviderName[] = (ORDER as readonly string[]).includes(configured)
    ? [configured as ProviderName]
    : [...ORDER];

  for (const name of candidates) {
    const key = keyFor(name);
    if (key) return { available: true, provider: makeProvider(name, key) };
  }
  return { available: false };
}

function makeProvider(name: ProviderName, apiKey: string): ReadingProvider {
  if (name === "openai") return openaiProvider(apiKey);
  if (name === "gemini") return geminiProvider(apiKey);
  return anthropicProvider(apiKey);
}

function anthropicProvider(apiKey: string): ReadingProvider {
  const model = process.env.ANTHROPIC_READING_MODEL || "claude-opus-4-8";
  return {
    name: "anthropic",
    model,
    async complete({ system, prompt, maxTokens }) {
      const client = new Anthropic({ apiKey });
      const res = await client.messages.create({
        model,
        max_tokens: maxTokens,
        thinking: { type: "disabled" },
        system,
        messages: [{ role: "user", content: prompt }],
      });
      return res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    },
    async chat({ system, messages, maxTokens }) {
      const client = new Anthropic({ apiKey });
      const res = await client.messages.create({
        model,
        max_tokens: maxTokens,
        thinking: { type: "disabled" },
        system,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      });
      return res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    },
  };
}

function openaiProvider(apiKey: string): ReadingProvider {
  const model = process.env.OPENAI_READING_MODEL || "gpt-4o";
  return {
    name: "openai",
    model,
    async complete({ system, prompt, maxTokens }) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({
          model,
          max_completion_tokens: maxTokens,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: system },
            { role: "user", content: prompt },
          ],
        }),
        signal: AbortSignal.timeout(60000),
      });
      if (!res.ok) throw new Error(`openai ${res.status}`);
      const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      return json.choices?.[0]?.message?.content ?? "";
    },
    async chat({ system, messages, maxTokens }) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({
          model,
          max_completion_tokens: maxTokens,
          messages: [{ role: "system", content: system }, ...messages],
        }),
        signal: AbortSignal.timeout(60000),
      });
      if (!res.ok) throw new Error(`openai ${res.status}`);
      const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      return json.choices?.[0]?.message?.content ?? "";
    },
  };
}

function geminiProvider(apiKey: string): ReadingProvider {
  const model = process.env.GEMINI_READING_MODEL || "gemini-1.5-pro";
  return {
    name: "gemini",
    model,
    async complete({ system, prompt, maxTokens }) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: maxTokens, responseMimeType: "application/json" },
        }),
        signal: AbortSignal.timeout(60000),
      });
      if (!res.ok) throw new Error(`gemini ${res.status}`);
      const json = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      return json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    },
    async chat({ system, messages, maxTokens }) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: messages.map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          })),
          generationConfig: { maxOutputTokens: maxTokens },
        }),
        signal: AbortSignal.timeout(60000),
      });
      if (!res.ok) throw new Error(`gemini ${res.status}`);
      const json = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      return json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    },
  };
}
