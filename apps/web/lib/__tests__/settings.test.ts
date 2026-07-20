import { describe, it, expect, vi } from "vitest";
import { settingsToThemeState, fetchIntentAndMemorySettings } from "../settings";

describe("settingsToThemeState", () => {
  it("mapea una fila de settings a tema/modo/idioma con defaults", () => {
    expect(settingsToThemeState({ theme: "cosmic", light_mode: "light", language: "en" }))
      .toEqual({ theme: "cosmic", mode: "light", locale: "en" });
  });
  it("cae a defaults si faltan/invalidos", () => {
    expect(settingsToThemeState({ theme: "x", light_mode: undefined, language: null }))
      .toEqual({ theme: "observatory", mode: "auto", locale: "es" });
  });
});

// Mismo espíritu de fake supabase que memories.test.ts/memory-import route
// test: cada chain es encadenable Y thenable/maybeSingle.
function chain(result: { data?: unknown; error?: unknown }) {
  const obj: Record<string, unknown> = {
    select: () => obj,
    eq: () => obj,
    maybeSingle: () => Promise.resolve(result),
  };
  return obj;
}

describe("fetchIntentAndMemorySettings", () => {
  it("select combinado OK: intent + memoryEnabled tal cual la fila", async () => {
    const fromMock = vi.fn().mockReturnValueOnce(chain({ data: { intent: { useInAI: true }, memory_enabled: false }, error: null }));
    const supabase = { from: fromMock } as never;

    const result = await fetchIntentAndMemorySettings(supabase, "u1");

    expect(result).toEqual({ intent: { useInAI: true }, memoryEnabled: false });
    expect(fromMock).toHaveBeenCalledTimes(1); // un solo select, no degrada
  });

  it("sin fila (usuario nuevo): intent null, memoryEnabled true por defecto", async () => {
    const fromMock = vi.fn().mockReturnValueOnce(chain({ data: null, error: null }));
    const supabase = { from: fromMock } as never;

    const result = await fetchIntentAndMemorySettings(supabase, "u1");

    expect(result).toEqual({ intent: null, memoryEnabled: true });
  });

  it("columna memory_enabled sin migrar (error en el select combinado): degrada a leer solo intent, sin perderlo", async () => {
    const fromMock = vi
      .fn()
      .mockReturnValueOnce(chain({ data: null, error: { message: "column settings.memory_enabled does not exist" } }))
      .mockReturnValueOnce(chain({ data: { intent: { useInAI: true } }, error: null }));
    const supabase = { from: fromMock } as never;

    const result = await fetchIntentAndMemorySettings(supabase, "u1");

    expect(fromMock).toHaveBeenCalledTimes(2); // combinado falló, cayó al fallback
    expect(result).toEqual({ intent: { useInAI: true }, memoryEnabled: true });
  });

  it("best-effort total: si la BD explota en ambos intentos, defaults seguros", async () => {
    const fromMock = vi.fn(() => {
      throw new Error("boom");
    });
    const supabase = { from: fromMock } as never;

    await expect(fetchIntentAndMemorySettings(supabase, "u1")).resolves.toEqual({ intent: null, memoryEnabled: true });
  });
});
