import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { completeWithCascade, resolveReportCascade, resolveReadingProvider } from "../provider";
import type { CompleteOptions, ReadingProvider } from "../provider";
// Nota: los métodos fake abajo (completeStream/chat/chatStream) omiten el
// parámetro de opciones porque no lo usan — una función con menos parámetros
// es asignable al tipo de la interfaz (TS lo permite estructuralmente), y así
// evitamos el error de lint no-unused-vars sobre un parámetro que nunca haría falta leer.

// Guardamos las llaves originales para no filtrar estado entre archivos de test.
const ENV_KEYS = [
  "NOUS_API_KEY",
  "DEEPSEEK_API_KEY",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "GEMINI_API_KEY",
  "GOOGLE_API_KEY",
  "READING_PROVIDER",
  "OLLAMA_ENABLED",
  "OLLAMA_BASE_URL",
  "OLLAMA_READING_MODEL",
  "OLLAMA_TIMEOUT_MS",
] as const;
const originalEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of ENV_KEYS) {
    originalEnv[k] = process.env[k];
    delete process.env[k];
  }
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (originalEnv[k] === undefined) delete process.env[k];
    else process.env[k] = originalEnv[k];
  }
  vi.unstubAllGlobals();
});

const OPTS: CompleteOptions = { system: "sistema", prompt: "usuario", maxTokens: 2000 };

/** Proveedor fake mínimo para no depender de red en los tests de la cascada. */
function fakeProvider(name: string, behavior: () => Promise<string>): ReadingProvider {
  return {
    name,
    model: `${name}-model`,
    complete: behavior,
    async *completeStream() {
      yield await behavior();
    },
    async chat() {
      return behavior();
    },
    async *chatStream() {
      yield await behavior();
    },
  };
}

describe("resolveReportCascade", () => {
  it("sin ninguna llave presente, devuelve cascada vacía", () => {
    expect(resolveReportCascade()).toEqual([]);
  });

  it("con NOUS_API_KEY y OPENAI_API_KEY (sin DeepSeek), devuelve [hermes, openai] en ese orden", () => {
    process.env.NOUS_API_KEY = "nous-key";
    process.env.OPENAI_API_KEY = "openai-key";
    const providers = resolveReportCascade();
    expect(providers.map((p) => p.name)).toEqual(["hermes", "openai"]);
  });

  it("con las tres llaves presentes, devuelve [hermes, deepseek, openai]", () => {
    process.env.NOUS_API_KEY = "nous-key";
    process.env.DEEPSEEK_API_KEY = "deepseek-key";
    process.env.OPENAI_API_KEY = "openai-key";
    const providers = resolveReportCascade();
    expect(providers.map((p) => p.name)).toEqual(["hermes", "deepseek", "openai"]);
  });

  it("solo con DEEPSEEK_API_KEY, devuelve [deepseek]", () => {
    process.env.DEEPSEEK_API_KEY = "deepseek-key";
    const providers = resolveReportCascade();
    expect(providers.map((p) => p.name)).toEqual(["deepseek"]);
  });

  it("con NOUS_API_KEY y OLLAMA_ENABLED=1, devuelve [hermes, ollama] — ollama al final", () => {
    process.env.NOUS_API_KEY = "nous-key";
    process.env.OLLAMA_ENABLED = "1";
    const providers = resolveReportCascade();
    expect(providers.map((p) => p.name)).toEqual(["hermes", "ollama"]);
  });

  it("sin ninguna llave pero con OLLAMA_ENABLED=1, devuelve [ollama]", () => {
    process.env.OLLAMA_ENABLED = "1";
    const providers = resolveReportCascade();
    expect(providers.map((p) => p.name)).toEqual(["ollama"]);
  });

  it("sin llaves y sin OLLAMA_ENABLED, ollama no aparece (cascada vacía)", () => {
    const providers = resolveReportCascade();
    expect(providers).toEqual([]);
  });

  it("los proveedores construidos golpean el endpoint OpenAI-compatible correcto (Hermes y DeepSeek)", async () => {
    process.env.NOUS_API_KEY = "nous-key";
    process.env.DEEPSEEK_API_KEY = "deepseek-key";
    const calls: Array<{ url: string; body: unknown }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit) => {
        calls.push({ url, body: JSON.parse(init.body as string) });
        return {
          ok: true,
          status: 200,
          json: async () => ({ choices: [{ message: { content: "{}" } }] }),
        } as Response;
      }),
    );
    const [hermes, deepseek] = resolveReportCascade();
    await hermes!.complete(OPTS);
    await deepseek!.complete(OPTS);

    expect(calls[0]!.url).toBe("https://api.nousresearch.com/v1/chat/completions");
    expect((calls[0]!.body as { model: string }).model).toBe("Hermes-4-70B");
    expect((calls[0]!.body as { max_tokens: number }).max_tokens).toBe(2000);

    expect(calls[1]!.url).toBe("https://api.deepseek.com/chat/completions");
    expect((calls[1]!.body as { model: string }).model).toBe("deepseek-chat");
    expect((calls[1]!.body as { max_tokens: number }).max_tokens).toBe(2000);
  });
});

describe("completeWithCascade", () => {
  it("si el primer proveedor responde texto no vacío, lo devuelve con su modelUsed", async () => {
    const a = fakeProvider("hermes", async () => "informe generado");
    const b = fakeProvider("deepseek", async () => {
      throw new Error("no debería llamarse");
    });
    const res = await completeWithCascade([a, b], OPTS);
    expect(res).toEqual({ text: "informe generado", modelUsed: "hermes" });
  });

  it("si el primer proveedor lanza, cae al segundo y devuelve su modelUsed", async () => {
    const a = fakeProvider("hermes", async () => {
      throw new Error("hermes caído");
    });
    const b = fakeProvider("deepseek", async () => "informe de respaldo");
    const res = await completeWithCascade([a, b], OPTS);
    expect(res).toEqual({ text: "informe de respaldo", modelUsed: "deepseek" });
  });

  it("si el primer proveedor devuelve texto vacío, cuenta como fallo y cae al siguiente", async () => {
    const a = fakeProvider("hermes", async () => "");
    const b = fakeProvider("deepseek", async () => "   "); // solo espacios también cuenta vacío
    const c = fakeProvider("openai", async () => "por fin texto");
    const res = await completeWithCascade([a, b, c], OPTS);
    expect(res).toEqual({ text: "por fin texto", modelUsed: "openai" });
  });

  it("si todos los proveedores fallan (excepción o vacío), lanza", async () => {
    const a = fakeProvider("hermes", async () => {
      throw new Error("hermes caído");
    });
    const b = fakeProvider("deepseek", async () => "");
    await expect(completeWithCascade([a, b], OPTS)).rejects.toThrow();
  });

  it("con lista de proveedores vacía, lanza", async () => {
    await expect(completeWithCascade([], OPTS)).rejects.toThrow();
  });

  it("si `validate` rechaza el texto del primer proveedor (malformado) pero acepta el del segundo, cae al segundo", async () => {
    const a = fakeProvider("hermes", async () => "esto no es JSON válido");
    const b = fakeProvider("deepseek", async () => '{"ok": true}');
    const validate = (text: string) => {
      try {
        JSON.parse(text);
        return true;
      } catch {
        return false;
      }
    };
    const res = await completeWithCascade([a, b], { ...OPTS, validate });
    expect(res).toEqual({ text: '{"ok": true}', modelUsed: "deepseek" });
  });

  it("si `validate` rechaza el texto de TODOS los proveedores, lanza", async () => {
    const a = fakeProvider("hermes", async () => "prosa suelta");
    const b = fakeProvider("deepseek", async () => "más prosa suelta");
    const validate = (text: string) => {
      try {
        JSON.parse(text);
        return true;
      } catch {
        return false;
      }
    };
    await expect(completeWithCascade([a, b], { ...OPTS, validate })).rejects.toThrow();
  });
});

describe("resolveReadingProvider — Hermes primero (patrón de cabecera)", () => {
  it("con NOUS_API_KEY sola, el chat/lecturas resuelven a hermes", () => {
    process.env.NOUS_API_KEY = "nous-key";
    const resolved = resolveReadingProvider();
    expect(resolved.available).toBe(true);
    if (resolved.available) expect(resolved.provider.name).toBe("hermes");
  });

  it("con NOUS y ANTHROPIC presentes, hermes gana (Claude queda de respaldo)", () => {
    process.env.NOUS_API_KEY = "nous-key";
    process.env.ANTHROPIC_API_KEY = "ant-key";
    const resolved = resolveReadingProvider();
    expect(resolved.available).toBe(true);
    if (resolved.available) expect(resolved.provider.name).toBe("hermes");
  });

  it("READING_PROVIDER=anthropic fuerza a Claude aunque haya llave de Nous", () => {
    process.env.NOUS_API_KEY = "nous-key";
    process.env.ANTHROPIC_API_KEY = "ant-key";
    process.env.READING_PROVIDER = "anthropic";
    const resolved = resolveReadingProvider();
    expect(resolved.available).toBe(true);
    if (resolved.available) expect(resolved.provider.name).toBe("anthropic");
  });

  it("con NOUS_API_KEY y OLLAMA_ENABLED, hermes gana (ollama sigue de último)", () => {
    process.env.NOUS_API_KEY = "nous-key";
    process.env.OLLAMA_ENABLED = "1";
    const resolved = resolveReadingProvider();
    expect(resolved.available).toBe(true);
    if (resolved.available) expect(resolved.provider.name).toBe("hermes");
  });
});

describe("resolveReadingProvider — Ollama (voz local)", () => {
  it("sin llaves y sin OLLAMA_ENABLED, sigue latente", () => {
    const resolved = resolveReadingProvider();
    expect(resolved.available).toBe(false);
  });

  it("con OLLAMA_ENABLED=1 y sin llaves de nube, resuelve a ollama con hermes3:8b por defecto", () => {
    process.env.OLLAMA_ENABLED = "1";
    const resolved = resolveReadingProvider();
    expect(resolved.available).toBe(true);
    if (resolved.available) {
      expect(resolved.provider.name).toBe("ollama");
      expect(resolved.provider.model).toBe("hermes3:8b");
    }
  });

  it("con OLLAMA_ENABLED=1 y OLLAMA_READING_MODEL propio, usa ese modelo", () => {
    process.env.OLLAMA_ENABLED = "1";
    process.env.OLLAMA_READING_MODEL = "qwen3.6:latest";
    const resolved = resolveReadingProvider();
    expect(resolved.available).toBe(true);
    if (resolved.available) expect(resolved.provider.model).toBe("qwen3.6:latest");
  });

  it("con ANTHROPIC_API_KEY y OLLAMA_ENABLED=1, prefiere anthropic (ollama es último recurso)", () => {
    process.env.ANTHROPIC_API_KEY = "ant-key";
    process.env.OLLAMA_ENABLED = "1";
    const resolved = resolveReadingProvider();
    expect(resolved.available).toBe(true);
    if (resolved.available) expect(resolved.provider.name).toBe("anthropic");
  });

  it("con READING_PROVIDER=ollama y OLLAMA_ENABLED=1, fuerza ollama aunque haya llaves de nube", () => {
    process.env.ANTHROPIC_API_KEY = "ant-key";
    process.env.READING_PROVIDER = "ollama";
    process.env.OLLAMA_ENABLED = "1";
    const resolved = resolveReadingProvider();
    expect(resolved.available).toBe(true);
    if (resolved.available) expect(resolved.provider.name).toBe("ollama");
  });

  it("con READING_PROVIDER=ollama pero SIN OLLAMA_ENABLED, no fuerza nada raro (cae al orden normal)", () => {
    process.env.READING_PROVIDER = "ollama";
    const resolved = resolveReadingProvider();
    expect(resolved.available).toBe(false);
  });
});
