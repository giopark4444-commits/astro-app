import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resolvePremiumProvider } from "../provider";

// resolvePremiumProvider es el resolvedor del proveedor PREMIUM (Claude
// explícito, no la cascada Hermes-primero) que consumen las tasks 5/6 del
// sistema de créditos — p.ej. para forzar Sonnet/Opus en el modo profundo.

const ENV_KEYS = ["ANTHROPIC_API_KEY", "ALUNA_PREMIUM_MODEL", "ANTHROPIC_READING_MODEL"] as const;
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
});

describe("resolvePremiumProvider", () => {
  it("sin ANTHROPIC_API_KEY, queda latente", () => {
    const resolved = resolvePremiumProvider();
    expect(resolved.available).toBe(false);
  });

  it("con ANTHROPIC_API_KEY, resuelve a Claude con el modelo premium por defecto (claude-sonnet-5)", () => {
    process.env.ANTHROPIC_API_KEY = "ant-key";
    const resolved = resolvePremiumProvider();
    expect(resolved.available).toBe(true);
    if (resolved.available) {
      expect(resolved.provider.name).toBe("anthropic");
      expect(resolved.provider.model).toBe("claude-sonnet-5");
    }
  });

  it("con ALUNA_PREMIUM_MODEL propio, usa ese modelo", () => {
    process.env.ANTHROPIC_API_KEY = "ant-key";
    process.env.ALUNA_PREMIUM_MODEL = "claude-opus-4-8";
    const resolved = resolvePremiumProvider();
    expect(resolved.available).toBe(true);
    if (resolved.available) expect(resolved.provider.model).toBe("claude-opus-4-8");
  });

  it("ignora ANTHROPIC_READING_MODEL — el modelo premium es independiente del de lecturas", () => {
    process.env.ANTHROPIC_API_KEY = "ant-key";
    process.env.ANTHROPIC_READING_MODEL = "claude-haiku-4";
    const resolved = resolvePremiumProvider();
    expect(resolved.available).toBe(true);
    if (resolved.available) expect(resolved.provider.model).toBe("claude-sonnet-5");
  });
});
