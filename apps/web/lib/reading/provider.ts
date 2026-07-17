import Anthropic from "@anthropic-ai/sdk";

// Capa agnóstica de proveedor para las lecturas de Aluna. La ruta arma el
// system + prompt (la VOZ) y este módulo solo se encarga de "llamar al modelo
// y devolver texto". Cambiar de proveedor = variables de entorno, sin tocar
// código:
//   READING_PROVIDER = anthropic | openai | gemini | ollama   (opcional; por
//     defecto, usa el primero cuyo API key esté presente, en ese orden)
//   ANTHROPIC_API_KEY / OPENAI_API_KEY / GEMINI_API_KEY
//   ANTHROPIC_READING_MODEL / OPENAI_READING_MODEL / GEMINI_READING_MODEL
//     (opcional; sobrescribe el modelo por defecto de cada proveedor)
//
// Claude va por su SDK oficial; OpenAI y Gemini por REST (fetch) para no sumar
// dependencias mientras los caminos están latentes.
//
// Ollama (voz local, gratis, sin llave): solo participa si OLLAMA_ENABLED=1
// (nunca por defecto — en producción no hay servidor local, así que el
// camino se queda latente exactamente como hoy). Con OLLAMA_ENABLED=1 entra
// como último recurso tras los proveedores con llave; READING_PROVIDER=ollama
// lo fuerza. OLLAMA_BASE_URL / OLLAMA_READING_MODEL / OLLAMA_TIMEOUT_MS
// (opcionales; por defecto http://localhost:11434/v1, hermes3:8b, 120s — la
// inferencia local en un 8B tarda bastante más que un API en la nube).

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
  /**
   * Igual que `complete`, pero emite el texto por trozos a medida que se genera
   * (efecto de "escritura" en las lecturas profundas). El texto sigue siendo el
   * mismo objeto JSON {essence, flow, shadow, practice} que `complete`: la ruta
   * lo reenvía crudo y, al cerrar, lo parsea y lo cachea. Si un proveedor no
   * soporta streaming, cae a entregar el resultado de `complete()` de una vez.
   */
  completeStream(opts: CompleteOptions): AsyncIterable<string>;
  /** Conversación multi-turno (chat "Pregúntale a Aluna"). */
  chat(opts: ChatOptions): Promise<string>;
  /**
   * Igual que `chat`, pero emite el texto por trozos a medida que llega (efecto
   * de tecleo en "Pregúntale a Aluna"). Si un proveedor no soporta streaming,
   * cae a entregar el resultado de `chat()` de una sola vez.
   */
  chatStream(opts: ChatOptions): AsyncIterable<string>;
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
 *  o el primero (en orden) cuya llave esté presente. Si ninguno tiene llave y
 *  OLLAMA_ENABLED=1, cae a Ollama (local, sin llave) como último recurso;
 *  READING_PROVIDER=ollama lo fuerza (siempre que OLLAMA_ENABLED=1). Sin
 *  llaves y sin OLLAMA_ENABLED → latente. */
export function resolveReadingProvider(): ResolvedProvider {
  const configured = (process.env.READING_PROVIDER ?? "").toLowerCase();
  const ollamaEnabled = process.env.OLLAMA_ENABLED === "1";

  if (configured === "ollama" && ollamaEnabled) {
    return { available: true, provider: ollamaProvider(ollamaTimeoutMs()) };
  }

  const candidates: ProviderName[] = (ORDER as readonly string[]).includes(configured)
    ? [configured as ProviderName]
    : [...ORDER];

  for (const name of candidates) {
    const key = keyFor(name);
    if (key) return { available: true, provider: makeProvider(name, key) };
  }

  if (ollamaEnabled) {
    return { available: true, provider: ollamaProvider(ollamaTimeoutMs()) };
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
    async *completeStream({ system, prompt, maxTokens }) {
      const client = new Anthropic({ apiKey });
      const stream = client.messages.stream({
        model,
        max_tokens: maxTokens,
        thinking: { type: "disabled" },
        system,
        messages: [{ role: "user", content: prompt }],
      });
      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          yield event.delta.text;
        }
      }
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
    async *chatStream({ system, messages, maxTokens }) {
      const client = new Anthropic({ apiKey });
      const stream = client.messages.stream({
        model,
        max_tokens: maxTokens,
        thinking: { type: "disabled" },
        system,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      });
      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          yield event.delta.text;
        }
      }
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
    async *completeStream({ system, prompt, maxTokens }) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({
          model,
          max_completion_tokens: maxTokens,
          // Mismo modo JSON que complete(): el texto que sale es el objeto
          // {essence, flow, shadow, practice}, solo que troceado.
          response_format: { type: "json_object" },
          stream: true,
          messages: [
            { role: "system", content: system },
            { role: "user", content: prompt },
          ],
        }),
        signal: AbortSignal.timeout(60000),
      });
      if (!res.ok || !res.body) throw new Error(`openai ${res.status}`);
      for await (const data of sseData(res.body)) {
        if (data === "[DONE]") return;
        try {
          const json = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> };
          const piece = json.choices?.[0]?.delta?.content;
          if (piece) yield piece;
        } catch {
          /* trozo SSE no-JSON (p.ej. comentario keep-alive): ignorar */
        }
      }
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
    async *chatStream({ system, messages, maxTokens }) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({
          model,
          max_completion_tokens: maxTokens,
          stream: true,
          messages: [{ role: "system", content: system }, ...messages],
        }),
        signal: AbortSignal.timeout(60000),
      });
      if (!res.ok || !res.body) throw new Error(`openai ${res.status}`);
      // SSE: líneas "data: {json}" con choices[0].delta.content, fin con "data: [DONE]".
      for await (const data of sseData(res.body)) {
        if (data === "[DONE]") return;
        try {
          const json = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> };
          const piece = json.choices?.[0]?.delta?.content;
          if (piece) yield piece;
        } catch {
          /* trozo SSE no-JSON (p.ej. comentario keep-alive): ignorar */
        }
      }
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
    async *completeStream({ system, prompt, maxTokens }) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          // Mismo modo JSON que complete(): el texto troceado es el objeto JSON.
          generationConfig: { maxOutputTokens: maxTokens, responseMimeType: "application/json" },
        }),
        signal: AbortSignal.timeout(60000),
      });
      if (!res.ok || !res.body) throw new Error(`gemini ${res.status}`);
      for await (const data of sseData(res.body)) {
        try {
          const json = JSON.parse(data) as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
          };
          const piece = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("");
          if (piece) yield piece;
        } catch {
          /* trozo SSE no-JSON: ignorar */
        }
      }
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
    async *chatStream({ system, messages, maxTokens }) {
      // streamGenerateContent con alt=sse: líneas "data: {json}", cada una con
      // candidates[0].content.parts[].text.
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
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
      if (!res.ok || !res.body) throw new Error(`gemini ${res.status}`);
      for await (const data of sseData(res.body)) {
        try {
          const json = JSON.parse(data) as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
          };
          const piece = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("");
          if (piece) yield piece;
        } catch {
          /* trozo SSE no-JSON: ignorar */
        }
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Cascada de proveedores para informes evolutivos (Fase 4b)
// ---------------------------------------------------------------------------
// A diferencia de las lecturas cortas (un solo proveedor vía
// resolveReadingProvider, timeout de 60s), un informe evolutivo es una
// generación larga: necesita varios proveedores de respaldo en cascada
// (Hermes → DeepSeek → OpenAI, los dos primeros mucho más baratos) y un
// timeout mayor — con 60s un informe largo se cortaría siempre.

/** Timeout por defecto de la cascada de informes: 150s (vs. 60s de lecturas). */
const REPORT_TIMEOUT_MS = 150_000;

/** Timeout por defecto de Ollama (voz local): 120s. Un 8B en un M1 Max
 *  tarda entre 30 y 60s en generar una lectura larga; con 60s (el timeout de
 *  las lecturas por API) se cortaría seguido. */
const OLLAMA_TIMEOUT_MS = 120_000;

function ollamaTimeoutMs(): number {
  const configured = Number(process.env.OLLAMA_TIMEOUT_MS);
  return Number.isFinite(configured) && configured > 0 ? configured : OLLAMA_TIMEOUT_MS;
}

/**
 * Factory genérico para proveedores REST compatibles con la API de OpenAI en
 * `/chat/completions` (Hermes vía Nous Portal, DeepSeek, y también el propio
 * OpenAI para la cascada de informes). Mismo estilo que `openaiProvider` de
 * arriba: fetch crudo, sin SDK, `response_format: json_object` y timeout vía
 * `AbortSignal.timeout`. NO reemplaza a `openaiProvider` (esa sigue intacta
 * para chart-reading/reading/chat) — es una pieza nueva y paralela.
 *
 * `completeStream`/`chat`/`chatStream` delegan a `complete()`: los informes
 * solo llaman `complete()`, así que no hace falta streaming/chat real aquí.
 */
function openAICompatibleProvider(
  name: string,
  baseUrl: string,
  apiKey: string,
  model: string,
  timeoutMs: number,
): ReadingProvider {
  async function complete({ system, prompt, maxTokens }: CompleteOptions): Promise<string> {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) throw new Error(`${name} ${res.status}`);
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return json.choices?.[0]?.message?.content ?? "";
  }

  async function chat({ system, messages, maxTokens }: ChatOptions): Promise<string> {
    // Los informes no usan chat(): se resuelve delegando a complete() con el
    // último turno del usuario, así el proveedor cumple la interfaz entera.
    const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
    return complete({ system, prompt: lastUser, maxTokens });
  }

  return {
    name,
    model,
    complete,
    async *completeStream(opts) {
      yield await complete(opts);
    },
    chat,
    async *chatStream(opts) {
      yield await chat(opts);
    },
  };
}

/** Ollama (voz local, gratis, sin llave real — Ollama ignora el header
 *  Authorization que el factory siempre manda). Solo se construye cuando
 *  OLLAMA_ENABLED=1 lo habilita en resolveReadingProvider/resolveReportCascade. */
function ollamaProvider(timeoutMs: number): ReadingProvider {
  return openAICompatibleProvider(
    "ollama",
    process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1",
    "ollama",
    process.env.OLLAMA_READING_MODEL || "hermes3:8b",
    timeoutMs,
  );
}

function hermesProvider(apiKey: string, timeoutMs: number): ReadingProvider {
  return openAICompatibleProvider(
    "hermes",
    "https://api.nousresearch.com/v1",
    apiKey,
    process.env.NOUS_MODEL || "Hermes-4-70B",
    timeoutMs,
  );
}

function deepseekProvider(apiKey: string, timeoutMs: number): ReadingProvider {
  return openAICompatibleProvider(
    "deepseek",
    "https://api.deepseek.com",
    apiKey,
    process.env.DEEPSEEK_READING_MODEL || "deepseek-chat",
    timeoutMs,
  );
}

/** OpenAI como último respaldo de la cascada de informes. Deliberadamente
 *  separado del `openaiProvider` de las lecturas cortas: ese usa fetch a
 *  https://api.openai.com/v1/chat/completions con timeout fijo de 60s
 *  (correcto para lecturas breves); los informes necesitan `timeoutMs`
 *  configurable (150s por defecto), así que se arma vía el factory genérico
 *  en vez de reutilizar/tocar esa función existente. */
function openaiReportProvider(apiKey: string, timeoutMs: number): ReadingProvider {
  return openAICompatibleProvider(
    "openai",
    "https://api.openai.com/v1",
    apiKey,
    process.env.OPENAI_READING_MODEL || "gpt-4o",
    timeoutMs,
  );
}

/**
 * Arma la cascada real de proveedores para informes desde las variables de
 * entorno, en orden Hermes → DeepSeek → OpenAI: cada uno entra solo si su
 * llave está presente. Si OLLAMA_ENABLED=1, Ollama entra al final de todos
 * (sin llave, local) como último recurso. Sin ninguna llave presente ni
 * OLLAMA_ENABLED, cascada vacía (el llamador decide qué hacer, p. ej. dejar
 * el informe latente).
 */
export function resolveReportCascade(timeoutMs: number = REPORT_TIMEOUT_MS): ReadingProvider[] {
  const providers: ReadingProvider[] = [];
  const nousKey = process.env.NOUS_API_KEY;
  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  if (nousKey) providers.push(hermesProvider(nousKey, timeoutMs));
  if (deepseekKey) providers.push(deepseekProvider(deepseekKey, timeoutMs));
  if (openaiKey) providers.push(openaiReportProvider(openaiKey, timeoutMs));
  if (process.env.OLLAMA_ENABLED === "1") providers.push(ollamaProvider(timeoutMs));
  return providers;
}

/**
 * Recorre `providers` en orden e intenta cada uno con `complete()`. Un
 * proveedor "falla" si (a) lanza una excepción, (b) devuelve texto
 * vacío/solo espacios, o (c) — cuando se pasa `opts.validate` — devuelve
 * texto que NO pasa esa validación (p.ej. no parsea a la forma esperada del
 * informe). En cualquiera de los tres casos se cae al siguiente proveedor de
 * la lista. Solo se devuelve `{text, modelUsed}` del proveedor cuyo texto
 * (i) no está vacío y (ii) pasa `validate` (si se dio uno; sin `validate`, el
 * comportamiento es el de siempre: cualquier texto no vacío gana). Si todos
 * fallan, lanza con el motivo del último intento. La lista de proveedores es
 * inyectada (normalmente viene de `resolveReportCascade()`) para que la
 * cascada sea testeable con fakes, sin depender de variables de entorno.
 */
export async function completeWithCascade(
  providers: ReadingProvider[],
  opts: CompleteOptions & { validate?: (text: string) => boolean },
): Promise<{ text: string; modelUsed: string }> {
  let lastError: unknown = new Error("completeWithCascade: no hay proveedores en la cascada");
  for (const provider of providers) {
    try {
      const text = await provider.complete(opts);
      if (text.trim().length === 0) {
        lastError = new Error(`${provider.name}: devolvió texto vacío`);
        continue;
      }
      if (opts.validate && !opts.validate(text)) {
        lastError = new Error(`${provider.name}: devolvió texto que no pasó la validación`);
        continue;
      }
      return { text, modelUsed: provider.name };
    } catch (err) {
      lastError = err;
    }
  }
  const reason = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`Todos los proveedores de la cascada de informes fallaron: ${reason}`);
}

/**
 * Lee un cuerpo de respuesta SSE (text/event-stream) y emite el contenido de cada
 * campo `data:`. Junta los chunks de red, parte por líneas y maneja trozos partidos.
 * Compartido por los caminos de streaming de OpenAI y Gemini.
 */
async function* sseData(body: ReadableStream<Uint8Array>): AsyncIterable<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, nl).replace(/\r$/, "");
        buffer = buffer.slice(nl + 1);
        if (line.startsWith("data:")) yield line.slice(5).trim();
      }
    }
    const last = buffer.replace(/\r$/, "");
    if (last.startsWith("data:")) yield last.slice(5).trim();
  } finally {
    reader.releaseLock();
  }
}
