import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const authenticateRouteMock = vi.fn();
vi.mock("@/lib/supabase/route-auth", () => ({
  authenticateRoute: (...args: unknown[]) => authenticateRouteMock(...args),
}));

const resolveReadingProviderMock = vi.fn();
vi.mock("@/lib/reading/provider", () => ({
  resolveReadingProvider: (...args: unknown[]) => resolveReadingProviderMock(...args),
}));

vi.mock("@aluna/ephemeris", () => ({
  computeChart: vi.fn(() => ({ bodies: [], houses: { ascendant: 0, midheaven: 0 } })),
  setEphePath: vi.fn(),
}));
vi.mock("@aluna/core", async (importOriginal) => {
  const real = (await importOriginal()) as Record<string, unknown>;
  return {
    ...real,
    computeNumerology: vi.fn(() => ({ core: { lifePath: { value: 7 } } })),
    signOfLongitude: vi.fn(() => ({ sign: "aries" })),
  };
});

import { POST } from "../route";

function req(body: unknown): NextRequest {
  return { json: async () => body, headers: { get: () => null } } as unknown as NextRequest;
}

const FEATURES = {
  image_quality: { usable: true, issues: [] },
  mano: { declarada: "dominante" },
  forma: { elemento: "tierra" },
  lineas: [{ id: "vida", presente: true }],
  montes: [{ id: "luna", desarrollo: "plano" }],
};

const SECTIONS = {
  forma: "f", lineas: "l", montes: "m", marcas: "x", puente_astral: "p", sintesis: "s", consejo: "c",
};

function fakeProvider(capture: { system?: string } = {}) {
  return {
    name: "fake",
    model: "test-model",
    complete: vi.fn(async ({ system }: { system: string }) => {
      capture.system = system;
      return JSON.stringify(SECTIONS);
    }),
  };
}

describe("POST /api/palm-reading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authenticateRouteMock.mockResolvedValue({
      supabase: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }) },
      user: { id: "u1" },
    });
    resolveReadingProviderMock.mockReturnValue({ available: true, provider: fakeProvider() });
  });

  it("400 sin ninguna mano válida", async () => {
    expect((await POST(req({ hands: {} }))).status).toBe(400);
    expect((await POST(req({ hands: { dominante: { basura: 1 } } }))).status).toBe(400);
  });

  it("401 sin sesión", async () => {
    authenticateRouteMock.mockResolvedValue({ supabase: {}, user: null });
    const res = await POST(req({ hands: { dominante: FEATURES } }));
    expect(res.status).toBe(401);
  });

  it("responde secciones + header con una mano, sin perfil (sin puente natal)", async () => {
    const res = await POST(req({ hands: { dominante: FEATURES } }));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { available: boolean; sections: Record<string, string>; hasNatal: boolean };
    expect(json.available).toBe(true);
    expect(json.sections.sintesis).toBe("s");
    expect(json.hasNatal).toBe(false);
    expect(res.headers.get("x-aluna-model")).toBe("fake/test-model");
  });

  it("modo pro llega al system como bloque de anulación", async () => {
    const capture: { system?: string } = {};
    resolveReadingProviderMock.mockReturnValue({ available: true, provider: fakeProvider(capture) });
    await POST(req({ hands: { dominante: FEATURES }, voiceMode: "pro" }));
    expect(capture.system).toContain("MODO PROFESIONAL");
    expect(capture.system).toContain("CANON QUIROMÁNTICO");
  });

  it("502 si la voz devuelve basura", async () => {
    resolveReadingProviderMock.mockReturnValue({
      available: true,
      provider: { name: "fake", model: "m", complete: vi.fn(async () => "sin json") },
    });
    const res = await POST(req({ hands: { pasiva: FEATURES } }));
    expect(res.status).toBe(502);
  });
});
