import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// Integración de créditos premium (Task 6) en /api/chart-reading. La lógica
// de gasto/refund YA se prueba en aislado en
// lib/credits/__tests__/premium-reading.test.ts — acá solo se verifica que la
// RUTA la cablea bien: caché premium primero (sin gastar en un hit), el
// header x-aluna-premium siempre presente, y que el proveedor elegido es el
// que devuelve resolvePremiumReading.

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

/** Genera un ReadingProvider fake cuyo completeStream emite `chunks`. */
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
    body: "sun",
    sign: "aries",
    house: 1,
    length: "profunda",
    locale: "es",
    profileName: `Gio-${Math.random()}`, // nombre único por test → clave de caché única
    ...extra,
  };
}

describe("POST /api/chart-reading — créditos premium (Task 6)", () => {
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

    const body = baseBody({ premium: true });
    const res = await POST(fakeRequest(body));
    expect(res.status).toBe(200);
    expect(res.headers.get("x-aluna-premium")).toBe("used");
    expect(await res.text()).toBe(PREMIUM_JSON);
    expect(premiumProvider.completeStream).toHaveBeenCalledTimes(1);
    expect(FREE.completeStream).not.toHaveBeenCalled();

    // resolvePremiumReading recibe el request, el flag crudo del body y el
    // fallback ya resuelto por la ruta (resolveReadingProvider()).
    expect(resolvePremiumReadingMock).toHaveBeenCalledWith(
      expect.anything(),
      true,
      { available: true, provider: FREE },
    );

    // Deja tiempo a que el cache.set() fire-and-forget (post controller.close())
    // termine de escribir antes del siguiente request de este mismo test.
    await new Promise((r) => setTimeout(r, 0));

    // Segundo request IDÉNTICO: HIT de la caché premium → nunca vuelve a
    // llamar a resolvePremiumReading (o sea, nunca vuelve a intentar gastar).
    resolvePremiumReadingMock.mockClear();
    const res2 = await POST(fakeRequest(body));
    expect(res2.status).toBe(200);
    expect(res2.headers.get("x-aluna-premium")).toBe("used");
    const json2 = await res2.json();
    expect(json2).toEqual({ available: true, meaning: { essence: "premium", flow: "premium", shadow: "premium" } });
    expect(resolvePremiumReadingMock).not.toHaveBeenCalled();
  });

  it("premium:true pero resolvePremiumReading degrada a 'fallback' → usa el proveedor normal, header 'fallback'", async () => {
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

  it("sin 'premium' en el body → header 'off', el flag crudo (undefined) se le pasa tal cual al helper", async () => {
    resolvePremiumReadingMock.mockResolvedValue({
      mode: "free",
      provider: { available: true, provider: FREE },
      headerValue: "off",
      refundIfEmpty: vi.fn(),
    });

    const res = await POST(fakeRequest(baseBody()));
    expect(res.status).toBe(200);
    expect(res.headers.get("x-aluna-premium")).toBe("off");
    expect(resolvePremiumReadingMock).toHaveBeenCalledWith(expect.anything(), undefined, expect.anything());
  });

  it("proveedor no disponible ni siquiera en el fallback → available:false con el header del helper", async () => {
    resolvePremiumReadingMock.mockResolvedValue({
      mode: "free",
      provider: { available: false },
      headerValue: "off",
      refundIfEmpty: vi.fn(),
    });

    const res = await POST(fakeRequest(baseBody()));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ available: false });
    expect(res.headers.get("x-aluna-premium")).toBe("off");
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
