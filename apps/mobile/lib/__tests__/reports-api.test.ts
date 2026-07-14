import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchReport, generateReport, regenerateReport, ReportsApiError } from "../reports-api";

vi.mock("../config", () => ({ apiUrl: () => "https://example.test" }));

const originalFetch = global.fetch;

describe("reports-api", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("fetchReport arma la query string y manda Bearer", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ status: "ready", content: { intro: "x" }, model_used: "hermes" }),
    });
    const result = await fetchReport({ accessToken: "t1", kind: "solar_return", locale: "es", year: 2026 });
    expect(global.fetch).toHaveBeenCalledWith(
      "https://example.test/api/reports?kind=solar_return&locale=es&year=2026",
      expect.objectContaining({ headers: expect.objectContaining({ authorization: "Bearer t1" }) }),
    );
    expect(result).toEqual({ status: "ready", content: { intro: "x" }, model_used: "hermes" });
  });

  it("fetchReport natal no manda year en la query", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, json: async () => ({ status: "none" }) });
    await fetchReport({ accessToken: "t1", kind: "natal", locale: "es", year: null });
    expect(global.fetch).toHaveBeenCalledWith("https://example.test/api/reports?kind=natal&locale=es", expect.anything());
  });

  it("fetchReport lanza ReportsApiError con status 403 (plus_required)", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, status: 403 });
    await expect(fetchReport({ accessToken: "t1", kind: "natal", locale: "es", year: null })).rejects.toThrow(ReportsApiError);
  });

  it("generateReport hace POST a /api/reports/generate con el body correcto", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, json: async () => ({ status: "generating" }) });
    const result = await generateReport({ accessToken: "t1", profileId: "p1", kind: "natal", locale: "es", year: null });
    expect(global.fetch).toHaveBeenCalledWith(
      "https://example.test/api/reports/generate",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ authorization: "Bearer t1" }),
        body: JSON.stringify({ profileId: "p1", kind: "natal", year: null, locale: "es" }),
      }),
    );
    expect(result).toEqual({ status: "generating" });
  });

  it("regenerateReport hace POST a /api/reports/regenerate", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, json: async () => ({ status: "generating" }) });
    await regenerateReport({ accessToken: "t1", profileId: "p1", kind: "solar_return", locale: "en", year: 2026 });
    expect(global.fetch).toHaveBeenCalledWith("https://example.test/api/reports/regenerate", expect.objectContaining({ method: "POST" }));
  });
});
