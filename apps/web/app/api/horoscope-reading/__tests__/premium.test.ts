import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// Integración de créditos premium (Task 6) en /api/horoscope-reading. Ruta
// PÚBLICA (sin auth): el helper resuelve la sesión por su cuenta. Usa
// @aluna/ephemeris de VERDAD (mismo patrón que lib/horoscope/__tests__/western.test.ts)
// porque cachedWesternHoroscope depende del motor real — solo se mockean el
// proveedor de lecturas y el helper de créditos (probado en aislado en
// lib/credits/__tests__/premium-reading.test.ts).

const resolveReadingProviderMock = vi.fn();
vi.mock("@/lib/reading/provider", () => ({
  resolveReadingProvider: (...args: unknown[]) => resolveReadingProviderMock(...args),
}));

const resolvePremiumReadingMock = vi.fn();
vi.mock("@/lib/credits/premium-reading", () => ({
  resolvePremiumReading: (...args: unknown[]) => resolvePremiumReadingMock(...args),
}));

import { POST } from "../route";

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

const FREE = fakeProvider("hermes", "Hermes-4-70B", ['{"reading":"libre"}']);
const PREMIUM_JSON = '{"reading":"premium"}';

function baseBody(extra: Record<string, unknown> = {}) {
  return {
    sign: "leo",
    period: "today",
    tz: "utc",
    length: "profunda",
    locale: "es",
    ...extra,
  };
}

describe("POST /api/horoscope-reading — créditos premium (Task 6)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    // sign único por test (via extra) → clave de caché única, sin pisar otros tests.
    const body = baseBody({ sign: "virgo", premium: true });
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
    expect(await res2.json()).toEqual({ available: true, meaning: { reading: "premium" } });
    expect(resolvePremiumReadingMock).not.toHaveBeenCalled();
  });

  it("premium:true pero resolvePremiumReading degrada a 'off' (sin sesión, ruta pública) → proveedor normal", async () => {
    resolvePremiumReadingMock.mockResolvedValue({
      mode: "free",
      provider: { available: true, provider: FREE },
      headerValue: "off",
      refundIfEmpty: vi.fn(),
    });

    const res = await POST(fakeRequest(baseBody({ sign: "libra", premium: true })));
    expect(res.status).toBe(200);
    expect(res.headers.get("x-aluna-premium")).toBe("off");
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

    const res = await POST(fakeRequest(baseBody({ sign: "scorpio", premium: true })));
    expect(await res.text()).toBe("");
    expect(refundIfEmpty).toHaveBeenCalledTimes(1);
  });

  it("cachedWesternHoroscope lanza DESPUÉS de un spend premium exitoso → 502 compute Y refundIfEmpty() llamado", async () => {
    const western = await import("@/lib/horoscope/western");
    const spy = vi.spyOn(western, "cachedWesternHoroscope").mockImplementationOnce(() => {
      throw new Error("motor de efemérides caído");
    });
    const refundIfEmpty = vi.fn();
    const premiumProvider = fakeProvider("anthropic", "claude-sonnet-5", [PREMIUM_JSON]);
    resolvePremiumReadingMock.mockResolvedValue({
      mode: "premium",
      provider: { available: true, provider: premiumProvider },
      headerValue: "used",
      refundIfEmpty,
    });

    const res = await POST(fakeRequest(baseBody({ sign: "capricorn", premium: true })));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ available: false, error: "compute" });
    expect(refundIfEmpty).toHaveBeenCalledTimes(1);
    expect(premiumProvider.completeStream).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
