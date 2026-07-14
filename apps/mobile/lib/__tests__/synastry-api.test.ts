import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
// ../synastry-api importa (estático) apiUrl() de ../config, que a su vez
// importa expo-constants → react-native. react-native publica su entrada en
// Flow crudo (`import typeof * as X from './index.js.flow'` en su index.js),
// que el parser de Vite/Rollup no entiende fuera de Metro. Mockeamos el
// módulo para no cargar esa cadena — mismo patrón que chart-reading-api.test.ts.
vi.mock("../config", () => ({ apiUrl: () => "https://example.test" }));
import { fetchSynastry, SynastryApiError } from "../synastry-api";

const originalFetch = global.fetch;

describe("fetchSynastry", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("llama POST /api/synastry con Bearer y el body correcto", async () => {
    const report = { overall: 82, tone: "high", themes: [], aspects: [] };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => report,
    });

    const result = await fetchSynastry({ accessToken: "token-abc", profileIdA: "a", profileIdB: "b" });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/synastry"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ authorization: "Bearer token-abc" }),
        body: JSON.stringify({ profileIdA: "a", profileIdB: "b" }),
      }),
    );
    expect(result).toEqual(report);
  });

  it("lanza SynastryApiError con el status si la respuesta no es ok", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, status: 404 });
    await expect(fetchSynastry({ accessToken: "t", profileIdA: "a", profileIdB: "b" })).rejects.toThrow(SynastryApiError);
  });
});
