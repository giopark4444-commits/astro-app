import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveReadingProvider } from "@/lib/reading/provider";

// El override del picker de modelos (banco de pruebas A/B) se aplica SOLO si
// el proveedor pedido tiene llave; sin llave, la resolución cae al default de
// siempre (Hermes → Anthropic → OpenAI → Gemini por primera llave presente).
// El gating dev del picker vive en parseModelOverride (model-catalog); aquí
// resolveReadingProvider recibe un override ya validado o null.

function clearProviderEnv() {
  vi.stubEnv("READING_PROVIDER", "");
  vi.stubEnv("NOUS_API_KEY", "");
  vi.stubEnv("ANTHROPIC_API_KEY", "");
  vi.stubEnv("OPENAI_API_KEY", "");
  vi.stubEnv("GEMINI_API_KEY", "");
  vi.stubEnv("GOOGLE_API_KEY", "");
  vi.stubEnv("DEEPSEEK_API_KEY", "");
  vi.stubEnv("OLLAMA_ENABLED", "");
  vi.stubEnv("ANTHROPIC_READING_MODEL", "");
  vi.stubEnv("NOUS_MODEL", "");
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("resolveReadingProvider con override", () => {
  it("usa el proveedor y modelo pedidos cuando hay llave", () => {
    clearProviderEnv();
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-test");
    vi.stubEnv("NOUS_API_KEY", "sk-nous"); // hermes iría primero por default
    const resolved = resolveReadingProvider({ provider: "anthropic", model: "claude-sonnet-5" });
    expect(resolved.available).toBe(true);
    if (resolved.available) {
      expect(resolved.provider.name).toBe("anthropic");
      expect(resolved.provider.model).toBe("claude-sonnet-5");
    }
  });

  it("puede elegir deepseek aunque no esté en el ORDER por defecto", () => {
    clearProviderEnv();
    vi.stubEnv("DEEPSEEK_API_KEY", "sk-ds");
    const resolved = resolveReadingProvider({ provider: "deepseek", model: "deepseek-chat" });
    expect(resolved.available).toBe(true);
    if (resolved.available) {
      expect(resolved.provider.name).toBe("deepseek");
      expect(resolved.provider.model).toBe("deepseek-chat");
    }
  });

  it("puede elegir ollama con su modelo si OLLAMA_ENABLED=1", () => {
    clearProviderEnv();
    vi.stubEnv("OLLAMA_ENABLED", "1");
    const resolved = resolveReadingProvider({ provider: "ollama", model: "llama3.3:70b" });
    expect(resolved.available).toBe(true);
    if (resolved.available) {
      expect(resolved.provider.name).toBe("ollama");
      expect(resolved.provider.model).toBe("llama3.3:70b");
    }
  });

  it("sin llave del proveedor pedido, cae a la resolución por defecto", () => {
    clearProviderEnv();
    vi.stubEnv("NOUS_API_KEY", "sk-nous");
    const resolved = resolveReadingProvider({ provider: "openai", model: "gpt-5.6-terra" });
    expect(resolved.available).toBe(true);
    if (resolved.available) {
      expect(resolved.provider.name).toBe("hermes"); // default: primera llave presente
      expect(resolved.provider.model).toBe("Hermes-4-70B");
    }
  });

  it("override ollama sin OLLAMA_ENABLED cae al default (o latente sin llaves)", () => {
    clearProviderEnv();
    const resolved = resolveReadingProvider({ provider: "ollama", model: "hermes3:8b" });
    expect(resolved.available).toBe(false);
  });

  it("sin override, el comportamiento de siempre no cambia", () => {
    clearProviderEnv();
    vi.stubEnv("NOUS_API_KEY", "sk-nous");
    const resolved = resolveReadingProvider();
    expect(resolved.available).toBe(true);
    if (resolved.available) {
      expect(resolved.provider.name).toBe("hermes");
      expect(resolved.provider.model).toBe("Hermes-4-70B");
    }
  });

  it("el override de modelo gana sobre la env var *_READING_MODEL", () => {
    clearProviderEnv();
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-test");
    vi.stubEnv("ANTHROPIC_READING_MODEL", "claude-opus-4-8");
    const resolved = resolveReadingProvider({ provider: "anthropic", model: "claude-haiku-4-5" });
    expect(resolved.available).toBe(true);
    if (resolved.available) {
      expect(resolved.provider.model).toBe("claude-haiku-4-5");
    }
  });
});
