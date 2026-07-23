import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/dev-models/route";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/dev-models", () => {
  it("404 con el picker apagado (production sin flag)", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("MODEL_PICKER_ENABLED", "");
    const res = await GET();
    expect(res.status).toBe(404);
  });

  it("devuelve el catálogo con hasKey cuando está encendido, sin filtrar llaves", async () => {
    vi.stubEnv("MODEL_PICKER_ENABLED", "1");
    vi.stubEnv("NOUS_API_KEY", "sk-super-secreta");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.text();
    const json = JSON.parse(body) as { enabled: boolean; providers: Array<{ id: string; hasKey: boolean }> };
    expect(json.enabled).toBe(true);
    expect(json.providers.find((p) => p.id === "hermes")?.hasKey).toBe(true);
    expect(body).not.toContain("sk-super-secreta");
  });
});
