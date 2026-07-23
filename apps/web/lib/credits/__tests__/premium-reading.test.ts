import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";
import type { ResolvedProvider } from "@/lib/reading/provider";

// ---------------------------------------------------------------------------
// resolvePremiumReading: helper compartido por las 4 rutas de lectura profunda
// (Task 6). Mismo estilo de mocks que app/api/chat/__tests__/premium.test.ts
// (Task 5), pero probado en aislado — las rutas solo lo integran.
// ---------------------------------------------------------------------------

const authenticateRouteMock = vi.fn();
vi.mock("@/lib/supabase/route-auth", () => ({
  authenticateRoute: (...args: unknown[]) => authenticateRouteMock(...args),
}));

const resolvePremiumProviderMock = vi.fn();
vi.mock("@/lib/reading/provider", () => ({
  resolvePremiumProvider: () => resolvePremiumProviderMock(),
}));

const getCreditsServiceClientMock = vi.fn();
const spendCreditsMock = vi.fn();
const refundSpendMock = vi.fn();
vi.mock("@/lib/credits/ledger", () => ({
  getCreditsServiceClient: () => getCreditsServiceClientMock(),
  spendCredits: (...args: unknown[]) => spendCreditsMock(...args),
  refundSpend: (...args: unknown[]) => refundSpendMock(...args),
}));

const readingPremiumCostMock = vi.fn();
vi.mock("@/lib/credits/config", () => ({
  readingPremiumCost: () => readingPremiumCostMock(),
}));

import { resolvePremiumReading } from "../premium-reading";

function fakeRequest(): NextRequest {
  return { headers: { get: () => null } } as unknown as NextRequest;
}

const SVC = { rpc: vi.fn() };
const FALLBACK: ResolvedProvider = { available: true, provider: { name: "hermes", model: "Hermes-4-70B" } as never };
const PREMIUM: ResolvedProvider = { available: true, provider: { name: "anthropic", model: "claude-sonnet-5" } as never };

describe("resolvePremiumReading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authenticateRouteMock.mockResolvedValue({ supabase: {}, user: { id: "user-1" } });
    resolvePremiumProviderMock.mockReturnValue(PREMIUM);
    readingPremiumCostMock.mockReturnValue(3);
    getCreditsServiceClientMock.mockReturnValue(SVC);
    spendCreditsMock.mockResolvedValue(true);
    refundSpendMock.mockResolvedValue(true);
  });

  it("premiumFlag !== true (false/undefined/string) -> off, provider === fallback, no toca authenticateRoute ni el ledger", async () => {
    for (const flag of [false, undefined, "true", 1]) {
      const pr = await resolvePremiumReading(fakeRequest(), flag, FALLBACK);
      expect(pr.mode).toBe("free");
      expect(pr.headerValue).toBe("off");
      expect(pr.provider).toBe(FALLBACK);
    }
    expect(authenticateRouteMock).not.toHaveBeenCalled();
    expect(resolvePremiumProviderMock).not.toHaveBeenCalled();
    expect(spendCreditsMock).not.toHaveBeenCalled();
  });

  it("sin proveedor premium disponible (resolvePremiumProvider apagado) -> off, sin tocar auth ni ledger", async () => {
    resolvePremiumProviderMock.mockReturnValue({ available: false });
    const pr = await resolvePremiumReading(fakeRequest(), true, FALLBACK);
    expect(pr.headerValue).toBe("off");
    expect(pr.provider).toBe(FALLBACK);
    expect(authenticateRouteMock).not.toHaveBeenCalled();
    expect(spendCreditsMock).not.toHaveBeenCalled();
  });

  it("sin sesión (authenticateRoute sin user) -> off, nunca 401 (rutas públicas)", async () => {
    authenticateRouteMock.mockResolvedValue({ supabase: {}, user: null });
    const pr = await resolvePremiumReading(fakeRequest(), true, FALLBACK);
    expect(pr.headerValue).toBe("off");
    expect(pr.provider).toBe(FALLBACK);
    expect(spendCreditsMock).not.toHaveBeenCalled();
  });

  it("authenticateRoute lanza (Supabase mal configurado) -> off, nunca relanza", async () => {
    authenticateRouteMock.mockRejectedValue(new Error("no env"));
    const pr = await resolvePremiumReading(fakeRequest(), true, FALLBACK);
    expect(pr.headerValue).toBe("off");
    expect(pr.provider).toBe(FALLBACK);
    expect(spendCreditsMock).not.toHaveBeenCalled();
  });

  it("sin service client (sin config de créditos) -> off, no intenta gastar", async () => {
    getCreditsServiceClientMock.mockReturnValue(null);
    const pr = await resolvePremiumReading(fakeRequest(), true, FALLBACK);
    expect(pr.headerValue).toBe("off");
    expect(pr.provider).toBe(FALLBACK);
    expect(spendCreditsMock).not.toHaveBeenCalled();
  });

  it("sin saldo (spendCredits false) -> fallback, provider === fallback, premium NUNCA se usa", async () => {
    spendCreditsMock.mockResolvedValue(false);
    const pr = await resolvePremiumReading(fakeRequest(), true, FALLBACK);
    expect(pr.mode).toBe("free");
    expect(pr.headerValue).toBe("fallback");
    expect(pr.provider).toBe(FALLBACK);
    expect(spendCreditsMock).toHaveBeenCalledTimes(1);
    expect(spendCreditsMock).toHaveBeenCalledWith(SVC, "user-1", 3, expect.stringMatching(/^spend:.+/));
  });

  it("con saldo -> premium/used, gasta exactamente READING_PREMIUM_COST, provider === premium", async () => {
    const pr = await resolvePremiumReading(fakeRequest(), true, FALLBACK);
    expect(pr.mode).toBe("premium");
    expect(pr.headerValue).toBe("used");
    expect(pr.provider).toBe(PREMIUM);
    expect(spendCreditsMock).toHaveBeenCalledTimes(1);
    expect(spendCreditsMock).toHaveBeenCalledWith(SVC, "user-1", 3, expect.stringMatching(/^spend:.+/));
  });

  it("refundIfEmpty() de un spend real abona el refund con el mismo ref y monto", async () => {
    const pr = await resolvePremiumReading(fakeRequest(), true, FALLBACK);
    const [, , , spentRef] = spendCreditsMock.mock.calls[0]!;
    await pr.refundIfEmpty();
    expect(refundSpendMock).toHaveBeenCalledTimes(1);
    expect(refundSpendMock).toHaveBeenCalledWith(SVC, "user-1", 3, spentRef);
  });

  it("refundIfEmpty() llamado dos veces solo refunda una vez (anti doble-refund)", async () => {
    const pr = await resolvePremiumReading(fakeRequest(), true, FALLBACK);
    await pr.refundIfEmpty();
    await pr.refundIfEmpty();
    expect(refundSpendMock).toHaveBeenCalledTimes(1);
  });

  it("refundIfEmpty() en modo free (off/fallback) es no-op: nunca llama a refundSpend", async () => {
    spendCreditsMock.mockResolvedValue(false);
    const pr = await resolvePremiumReading(fakeRequest(), true, FALLBACK);
    await pr.refundIfEmpty();
    expect(refundSpendMock).not.toHaveBeenCalled();
  });

  it("costo <= 0 -> premium regalado: used sin spend, sin auth, sin service client, refundIfEmpty no-op", async () => {
    readingPremiumCostMock.mockReturnValue(0);
    authenticateRouteMock.mockResolvedValue({ supabase: {}, user: null }); // ni siquiera hace falta sesión
    getCreditsServiceClientMock.mockReturnValue(null);
    const pr = await resolvePremiumReading(fakeRequest(), true, FALLBACK);
    expect(pr.mode).toBe("premium");
    expect(pr.headerValue).toBe("used");
    expect(pr.provider).toBe(PREMIUM);
    expect(authenticateRouteMock).not.toHaveBeenCalled();
    expect(spendCreditsMock).not.toHaveBeenCalled();
    await pr.refundIfEmpty();
    expect(refundSpendMock).not.toHaveBeenCalled();
  });
});
