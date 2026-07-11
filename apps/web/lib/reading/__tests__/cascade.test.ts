import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { completeWithCascade, resolveReportCascade } from "../provider";
import type { ChatMessage, ChatOptions, CompleteOptions, ReadingProvider } from "../provider";

// Guardamos las llaves originales para no filtrar estado entre archivos de test.
const ENV_KEYS = ["NOUS_API_KEY", "DEEPSEEK_API_KEY", "OPENAI_API_KEY"] as const;
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
    async *completeStream(_opts: CompleteOptions) {
      yield await behavior();
    },
    async chat(_opts: ChatOptions) {
      return behavior();
    },
    async *chatStream(_opts: ChatOptions) {
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

  it("acepta timeoutMs opcional en opts sin romper el tipo (no depende de env)", async () => {
    const a = fakeProvider("hermes", async () => "ok");
    const res = await completeWithCascade([a], { ...OPTS, timeoutMs: 150000 });
    expect(res.modelUsed).toBe("hermes");
  });
});
