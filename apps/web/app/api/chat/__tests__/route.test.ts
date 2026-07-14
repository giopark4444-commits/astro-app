import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const authenticateRouteMock = vi.fn();
vi.mock("@/lib/supabase/route-auth", () => ({
  authenticateRoute: (...args: unknown[]) => authenticateRouteMock(...args),
}));

vi.mock("@aluna/ephemeris", () => ({
  computeChart: vi.fn(() => ({ bodies: [], houses: { ascendant: 0, midheaven: 0 }, patterns: [] })),
  setEphePath: vi.fn(),
}));
vi.mock("@aluna/core", () => ({
  computeNumerology: vi.fn(() => ({ core: { lifePath: { value: 1 }, expression: { value: 1 }, soulUrge: { value: 1 }, personality: { value: 1 }, maturity: { value: 1 } } })),
  signOfLongitude: vi.fn(() => ({ sign: "aries" })),
}));
vi.mock("@/lib/content/astrology-labels", () => ({
  astroLabels: () => ({ bodies: {}, signs: {}, dignities: {}, patterns: {} }),
}));

const resolveReadingProviderMock = vi.fn();
vi.mock("@/lib/reading/provider", () => ({
  resolveReadingProvider: () => resolveReadingProviderMock(),
}));

const maybeSingleMock = vi.fn();
const eqMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
const selectMock = vi.fn(() => ({ eq: eqMock }));
const fromMock = vi.fn(() => ({ select: selectMock }));

import { POST } from "../route";

function fakeRequest(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return {
    json: async () => body,
    headers: { get: (k: string) => headers[k.toLowerCase()] ?? null },
  } as unknown as NextRequest;
}

const VALID_BODY = { profileId: "p1", locale: "es", messages: [{ role: "user", content: "hola" }] };

describe("POST /api/chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authenticateRouteMock.mockResolvedValue({ supabase: { from: fromMock }, user: null });
  });

  it("401 sin usuario autenticado", async () => {
    const res = await POST(fakeRequest(VALID_BODY));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ available: false, error: "unauthorized" });
  });

  it("pasa el request a authenticateRoute", async () => {
    const req = fakeRequest(VALID_BODY, { authorization: "Bearer token-xyz" });
    await POST(req);
    expect(authenticateRouteMock).toHaveBeenCalledWith(req);
  });

  it("available:false si no hay proveedor IA resuelto (dormant)", async () => {
    authenticateRouteMock.mockResolvedValue({ supabase: { from: fromMock }, user: { id: "user-1" } });
    maybeSingleMock.mockResolvedValue({ data: { name: "Gio", birth_date: "1990-01-01", birth_time: "10:00", time_known: true, latitude: 1, longitude: 1, time_zone: "UTC", gender: "masculine" } });
    resolveReadingProviderMock.mockReturnValue({ available: false });
    const res = await POST(fakeRequest(VALID_BODY));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ available: false });
  });
});
