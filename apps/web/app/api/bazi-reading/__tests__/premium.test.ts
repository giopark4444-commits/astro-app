import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// Integración de créditos premium (Task 6) en /api/bazi-reading. A diferencia
// de chart-reading, esta ruta EXIGE sesión ya de por sí (401 sin usuario) y
// computa los pilares antes de decidir premium — la lógica de gasto/refund en
// sí se prueba en aislado en lib/credits/__tests__/premium-reading.test.ts.

const authenticateRouteMock = vi.fn();
vi.mock("@/lib/supabase/route-auth", () => ({
  authenticateRoute: (...args: unknown[]) => authenticateRouteMock(...args),
}));

vi.mock("@aluna/ephemeris", () => ({
  computeChart: vi.fn(() => ({ bodies: [{ body: "sun", longitude: 100, speed: 1 }] })),
  setEphePath: vi.fn(),
}));

const resolveReadingProviderMock = vi.fn();
vi.mock("@/lib/reading/provider", () => ({
  resolveReadingProvider: (...args: unknown[]) => resolveReadingProviderMock(...args),
}));

const resolvePremiumReadingMock = vi.fn();
vi.mock("@/lib/credits/premium-reading", () => ({
  resolvePremiumReading: (...args: unknown[]) => resolvePremiumReadingMock(...args),
}));

import { POST } from "../route";

const PROFILE_ROW = {
  birth_date: "1990-01-01",
  birth_time: "10:00",
  time_known: true,
  latitude: 1,
  longitude: 1,
  time_zone: "UTC",
  gender: "masculine",
};

const maybeSingleMock = vi.fn();
const eqMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
const selectMock = vi.fn(() => ({ eq: eqMock }));
const fromMock = vi.fn(() => ({ select: selectMock }));

function fakeRequest(body: unknown): NextRequest {
  return { json: async () => body, headers: { get: () => null } } as unknown as NextRequest;
}

function fakeProvider(name: string, model: string, chunks: string[]) {
  return {
    name,
    model,
    complete: vi.fn(async () => chunks.join("")),
    completeStream: vi.fn(async function* () {
      for (const c of chunks) yield c;
    }),
  };
}

const FREE = fakeProvider("hermes", "Hermes-4-70B", [
  '{"essence":"libre","flow":"libre","shadow":"libre"}',
]);
const PREMIUM_JSON = '{"essence":"premium","flow":"premium","shadow":"premium"}';

function baseBody(extra: Record<string, unknown> = {}) {
  return {
    profileId: "profile-1",
    length: "profunda",
    locale: "es",
    profileName: `Gio-${Math.random()}`, // nombre único por test → clave de caché única
    ...extra,
  };
}

describe("POST /api/bazi-reading — créditos premium (Task 6)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authenticateRouteMock.mockResolvedValue({ supabase: { from: fromMock }, user: { id: "user-1" } });
    maybeSingleMock.mockResolvedValue({ data: PROFILE_ROW });
    eqMock.mockReturnValue({ maybeSingle: maybeSingleMock });
    selectMock.mockReturnValue({ eq: eqMock });
    fromMock.mockReturnValue({ select: selectMock });
    resolveReadingProviderMock.mockReturnValue({ available: true, provider: FREE });
  });

  it("premium:true con saldo → usa el proveedor premium, header 'used', cachea bajo la clave premium", async () => {
    const premiumProvider = fakeProvider("anthropic", "claude-sonnet-5", [PREMIUM_JSON]);
    resolvePremiumReadingMock.mockResolvedValue({
      mode: "premium",
      provider: { available: true, provider: premiumProvider },
      headerValue: "used",
      refundIfEmpty: vi.fn(),
    });

    const body = baseBody({ premium: true });
    const res = await POST(fakeRequest(body));
    expect(res.status).toBe(200);
    expect(res.headers.get("x-aluna-premium")).toBe("used");
    expect(await res.text()).toBe(PREMIUM_JSON);
    expect(premiumProvider.completeStream).toHaveBeenCalledTimes(1);
    expect(FREE.completeStream).not.toHaveBeenCalled();

    await new Promise((r) => setTimeout(r, 0));

    // Segundo request idéntico: HIT de la caché premium → nunca vuelve a
    // llamar a resolvePremiumReading (nunca vuelve a intentar gastar).
    resolvePremiumReadingMock.mockClear();
    const res2 = await POST(fakeRequest(body));
    expect(res2.status).toBe(200);
    expect(res2.headers.get("x-aluna-premium")).toBe("used");
    expect(await res2.json()).toEqual({
      available: true,
      meaning: { essence: "premium", flow: "premium", shadow: "premium" },
    });
    expect(resolvePremiumReadingMock).not.toHaveBeenCalled();
  });

  it("401 sin usuario, NUNCA se llega a llamar a resolvePremiumReading (contrato de auth intacto)", async () => {
    authenticateRouteMock.mockResolvedValue({ supabase: { from: fromMock }, user: null });
    const res = await POST(fakeRequest(baseBody({ premium: true })));
    expect(res.status).toBe(401);
    expect(resolvePremiumReadingMock).not.toHaveBeenCalled();
  });

  it("premium:true pero resolvePremiumReading degrada a 'fallback' → proveedor normal, header 'fallback'", async () => {
    resolvePremiumReadingMock.mockResolvedValue({
      mode: "free",
      provider: { available: true, provider: FREE },
      headerValue: "fallback",
      refundIfEmpty: vi.fn(),
    });

    const res = await POST(fakeRequest(baseBody({ premium: true })));
    expect(res.status).toBe(200);
    expect(res.headers.get("x-aluna-premium")).toBe("fallback");
    expect(FREE.completeStream).toHaveBeenCalledTimes(1);
  });

  it("stream premium vacío (0 caracteres) → refundIfEmpty() llamado", async () => {
    const emptyPremium = fakeProvider("anthropic", "claude-sonnet-5", []);
    const refundIfEmpty = vi.fn();
    resolvePremiumReadingMock.mockResolvedValue({
      mode: "premium",
      provider: { available: true, provider: emptyPremium },
      headerValue: "used",
      refundIfEmpty,
    });

    const res = await POST(fakeRequest(baseBody({ premium: true })));
    expect(await res.text()).toBe("");
    expect(refundIfEmpty).toHaveBeenCalledTimes(1);
  });
});
