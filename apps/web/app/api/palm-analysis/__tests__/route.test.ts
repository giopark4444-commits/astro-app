import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const authenticateRouteMock = vi.fn();
vi.mock("@/lib/supabase/route-auth", () => ({
  authenticateRoute: (...args: unknown[]) => authenticateRouteMock(...args),
}));

const resolveVisionProviderMock = vi.fn();
vi.mock("@/lib/reading/provider", () => ({
  resolveVisionProvider: (...args: unknown[]) => resolveVisionProviderMock(...args),
}));

import { POST } from "../route";

function req(body: unknown): NextRequest {
  return { json: async () => body, headers: { get: () => null } } as unknown as NextRequest;
}

const GOOD_FEATURES = {
  image_quality: { usable: true, issues: [] },
  mano: { declarada: "desconocida" },
  forma: { elemento: "fuego" },
  lineas: [{ id: "vida", presente: true }],
  montes: [{ id: "venus", desarrollo: "prominente" }],
};

function fakeVision(text = JSON.stringify(GOOD_FEATURES)) {
  return { name: "gemini", model: "test-vision", visionComplete: vi.fn(async () => text) };
}

describe("POST /api/palm-analysis", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authenticateRouteMock.mockResolvedValue({ supabase: {}, user: { id: "u1" } });
    resolveVisionProviderMock.mockReturnValue({ available: true, provider: fakeVision() });
  });

  it("400 sin imagen o con mime no permitido", async () => {
    expect((await POST(req({ locale: "es" }))).status).toBe(400);
    expect((await POST(req({ image: { data: "abc", mime: "application/pdf" } }))).status).toBe(400);
  });

  it("413 si la imagen excede el tope", async () => {
    const res = await POST(req({ image: { data: "x".repeat(8_400_001), mime: "image/jpeg" } }));
    expect(res.status).toBe(413);
  });

  it("401 sin sesión", async () => {
    authenticateRouteMock.mockResolvedValue({ supabase: {}, user: null });
    const res = await POST(req({ image: { data: "abc", mime: "image/jpeg" } }));
    expect(res.status).toBe(401);
  });

  it("available:false sin proveedor de visión con llave", async () => {
    resolveVisionProviderMock.mockReturnValue({ available: false });
    const res = await POST(req({ image: { data: "abc", mime: "image/jpeg" } }));
    expect(await res.json()).toEqual({ available: false });
  });

  it("tolera el prefijo data-URL y responde features + header x-aluna-model", async () => {
    const res = await POST(req({ image: { data: "data:image/jpeg;base64,abc123" }, hand: "dominante" }));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { available: boolean; features: { mano: { declarada: string } } };
    expect(json.available).toBe(true);
    expect(json.features.mano.declarada).toBe("dominante"); // la declarada del cliente manda
    expect(res.headers.get("x-aluna-model")).toBe("gemini/test-vision");
  });

  it("502 si la visión devuelve basura", async () => {
    resolveVisionProviderMock.mockReturnValue({ available: true, provider: fakeVision("nada de json") });
    const res = await POST(req({ image: { data: "abc", mime: "image/png" } }));
    expect(res.status).toBe(502);
  });

  it("foto mala: pasa con usable:false y guidance (el cliente muestra la guía)", async () => {
    resolveVisionProviderMock.mockReturnValue({
      available: true,
      provider: fakeVision(
        JSON.stringify({ image_quality: { usable: false, issues: ["borrosa"], guidance: "más luz" }, lineas: [], montes: [] }),
      ),
    });
    const res = await POST(req({ image: { data: "abc", mime: "image/webp" } }));
    const json = (await res.json()) as { features: { image_quality: { usable: boolean } } };
    expect(json.features.image_quality.usable).toBe(false);
  });
});
