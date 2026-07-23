import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MODEL_CATALOG,
  isModelPickerEnabled,
  parseModelOverride,
  catalogStatus,
} from "@/lib/reading/model-catalog";

// El selector de modelos es una herramienta de PRUEBAS: solo existe en
// desarrollo (NODE_ENV=development) o con MODEL_PICKER_ENABLED=1 explícito.
// En producción sin el flag, parseModelOverride ignora cualquier override que
// venga en el body (defensa en profundidad, mismo patrón que las rutas dev-*).

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isModelPickerEnabled", () => {
  it("apagado por defecto fuera de development", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("MODEL_PICKER_ENABLED", "");
    expect(isModelPickerEnabled()).toBe(false);
  });

  it("encendido en development", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(isModelPickerEnabled()).toBe(true);
  });

  it("encendido con MODEL_PICKER_ENABLED=1 aunque sea production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("MODEL_PICKER_ENABLED", "1");
    expect(isModelPickerEnabled()).toBe(true);
  });
});

describe("parseModelOverride", () => {
  it("acepta un override válido {provider, model} cuando el picker está encendido", () => {
    vi.stubEnv("MODEL_PICKER_ENABLED", "1");
    expect(parseModelOverride({ provider: "anthropic", model: "claude-sonnet-5" })).toEqual({
      provider: "anthropic",
      model: "claude-sonnet-5",
    });
  });

  it("acepta modelos custom con caracteres de ID razonables (letras, dígitos, . _ : / -)", () => {
    vi.stubEnv("MODEL_PICKER_ENABLED", "1");
    expect(parseModelOverride({ provider: "ollama", model: "hermes3:8b" })).toEqual({
      provider: "ollama",
      model: "hermes3:8b",
    });
    expect(parseModelOverride({ provider: "hermes", model: "Hermes-4-405B" })).toEqual({
      provider: "hermes",
      model: "Hermes-4-405B",
    });
  });

  it("rechaza proveedores desconocidos", () => {
    vi.stubEnv("MODEL_PICKER_ENABLED", "1");
    expect(parseModelOverride({ provider: "skynet", model: "t-800" })).toBeNull();
  });

  it("rechaza modelos con caracteres peligrosos (espacios, ?, &) — el ID viaja en URLs de proveedor", () => {
    vi.stubEnv("MODEL_PICKER_ENABLED", "1");
    expect(parseModelOverride({ provider: "gemini", model: "flash?key=x" })).toBeNull();
    expect(parseModelOverride({ provider: "gemini", model: "a b" })).toBeNull();
    expect(parseModelOverride({ provider: "gemini", model: "" })).toBeNull();
    expect(parseModelOverride({ provider: "gemini", model: "x".repeat(101) })).toBeNull();
  });

  it("rechaza formas no-objeto sin lanzar", () => {
    vi.stubEnv("MODEL_PICKER_ENABLED", "1");
    expect(parseModelOverride(null)).toBeNull();
    expect(parseModelOverride("anthropic")).toBeNull();
    expect(parseModelOverride({ provider: "anthropic" })).toBeNull();
  });

  it("devuelve null SIEMPRE si el picker está apagado (production sin flag)", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("MODEL_PICKER_ENABLED", "");
    expect(parseModelOverride({ provider: "anthropic", model: "claude-sonnet-5" })).toBeNull();
  });
});

describe("MODEL_CATALOG", () => {
  it("cubre los 6 proveedores implementados en provider.ts", () => {
    const ids = MODEL_CATALOG.map((p) => p.id).sort();
    expect(ids).toEqual(["anthropic", "deepseek", "gemini", "hermes", "ollama", "openai"]);
  });

  it("todo modelo del catálogo pasa su propia validación de parseModelOverride", () => {
    vi.stubEnv("MODEL_PICKER_ENABLED", "1");
    for (const provider of MODEL_CATALOG) {
      for (const model of provider.models) {
        expect(parseModelOverride({ provider: provider.id, model: model.id })).not.toBeNull();
      }
    }
  });
});

describe("catalogStatus", () => {
  it("reporta hasKey por proveedor según sus env vars, sin exponer las llaves", () => {
    vi.stubEnv("MODEL_PICKER_ENABLED", "1");
    vi.stubEnv("NOUS_API_KEY", "sk-nous-test");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("GOOGLE_API_KEY", "");
    vi.stubEnv("DEEPSEEK_API_KEY", "");
    vi.stubEnv("OLLAMA_ENABLED", "1");

    const status = catalogStatus();
    expect(status.enabled).toBe(true);
    const byId = Object.fromEntries(status.providers.map((p) => [p.id, p]));
    expect(byId.hermes.hasKey).toBe(true);
    expect(byId.anthropic.hasKey).toBe(false);
    expect(byId.ollama.hasKey).toBe(true); // "llave" de ollama = OLLAMA_ENABLED=1
    expect(JSON.stringify(status)).not.toContain("sk-nous-test");
  });

  it("gemini acepta GOOGLE_API_KEY como alterna (mismo fallback que provider.ts)", () => {
    vi.stubEnv("MODEL_PICKER_ENABLED", "1");
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("GOOGLE_API_KEY", "g-key");
    const status = catalogStatus();
    expect(status.providers.find((p) => p.id === "gemini")?.hasKey).toBe(true);
  });
});
