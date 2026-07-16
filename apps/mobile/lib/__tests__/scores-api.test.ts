import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
// ../scores-api importa (estático) apiUrl() de ../config, que a su vez importa
// expo-constants → react-native. Mismo mock que synastry-api.test.ts para no
// cargar esa cadena fuera de Metro.
vi.mock("../config", () => ({ apiUrl: () => "https://example.test" }));
import { fetchScores, ScoresApiError } from "../scores-api";

const originalFetch = global.fetch;

describe("fetchScores", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("llama POST /api/scores con Bearer y el body correcto", async () => {
    const payload = {
      period: "today",
      areas: [
        { area: "love", score: 72, tone: "high", drivers: [] },
        { area: "work", score: 81, tone: "high", drivers: [] },
      ],
    };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => payload,
    });

    const result = await fetchScores({ accessToken: "token-abc", profileId: "p1", period: "today" });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/scores"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ authorization: "Bearer token-abc" }),
        body: JSON.stringify({ profileId: "p1", period: "today" }),
      }),
    );
    expect(result).toEqual(payload);
  });

  it("lanza ScoresApiError con el status si la respuesta no es ok", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, status: 401 });
    await expect(fetchScores({ accessToken: "t", profileId: "p1", period: "today" })).rejects.toThrow(ScoresApiError);
  });

  it("propaga el error si la respuesta ok trae JSON malformado", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => {
        throw new SyntaxError("bad json");
      },
    });
    await expect(fetchScores({ accessToken: "t", profileId: "p1", period: "today" })).rejects.toThrow();
  });
});
