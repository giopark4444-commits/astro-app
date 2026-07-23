import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// Mismo patrón de mocks que app/api/scores/__tests__/route.test.ts: la ruta
// computa carta+tránsitos ella misma, así que se mockean el motor nativo y las
// funciones de puntaje de @aluna/core. profileToChartInput/todayCivilInZone/
// isValidTz/astroLabels/parseModelOverride se dejan REALES (puros, sin red ni
// motor nativo) — solo resolveReadingProvider (la llamada al proveedor de IA) y
// authenticateRoute (Supabase) se mockean.

const authenticateRouteMock = vi.fn();
vi.mock("@/lib/supabase/route-auth", () => ({
  authenticateRoute: (...args: unknown[]) => authenticateRouteMock(...args),
}));

const computeChartMock = vi.fn();
const computeDerivedChartMock = vi.fn();
vi.mock("@aluna/ephemeris", () => ({
  computeChart: (...args: unknown[]) => computeChartMock(...args),
  computeDerivedChart: (...args: unknown[]) => computeDerivedChartMock(...args),
  setEphePath: vi.fn(),
}));

const detectAspectsBetweenMock = vi.fn();
const scoreLifeAreasMock = vi.fn();
const scoreToneMock = vi.fn();
vi.mock("@aluna/core", () => ({
  detectAspectsBetween: (...args: unknown[]) => detectAspectsBetweenMock(...args),
  scoreLifeAreas: (...args: unknown[]) => scoreLifeAreasMock(...args),
  scoreTone: (...args: unknown[]) => scoreToneMock(...args),
  LIFE_AREAS: ["love", "money", "work", "health", "mood", "luck"],
}));

const resolveReadingProviderMock = vi.fn();
vi.mock("@/lib/reading/provider", () => ({
  resolveReadingProvider: (...args: unknown[]) => resolveReadingProviderMock(...args),
}));

// resolvePremiumReading (Task 6) se mockea con un default "transparente" (free,
// header off, mismo provider que le pasen) para que las pruebas EXISTENTES de
// arriba (que no mandan `premium` en el body) sigan comportándose exactamente
// igual que antes de esta task. La lógica de gasto/refund en sí se prueba en
// aislado en lib/credits/__tests__/premium-reading.test.ts; el describe
// "créditos premium (Task 6)" de más abajo sobreescribe este mock por test.
const resolvePremiumReadingMock = vi.fn();
vi.mock("@/lib/credits/premium-reading", () => ({
  resolvePremiumReading: (...args: unknown[]) => resolvePremiumReadingMock(...args),
}));

import { POST } from "../route";

const PROFILE = {
  birth_date: "1990-01-01",
  birth_time: "10:00",
  time_known: true,
  latitude: 1,
  longitude: 1,
  time_zone: "UTC",
};

const maybeSingleMock = vi.fn();
const eqMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
const selectMock = vi.fn(() => ({ eq: eqMock }));
const fromMock = vi.fn(() => ({ select: selectMock }));

function fakeRequest(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return {
    json: async () => body,
    headers: { get: (k: string) => headers[k.toLowerCase()] ?? null },
  } as unknown as NextRequest;
}

function sixAreas(score = 70, tone = "high") {
  return ["love", "money", "work", "health", "mood", "luck"].map((area) => ({
    area,
    score,
    tone,
    drivers: [],
  }));
}

function fakeProvider(overrides: Partial<{ model: string; complete: ReturnType<typeof vi.fn> }> = {}) {
  return {
    name: "fake",
    model: overrides.model ?? "test-model",
    complete:
      overrides.complete ??
      vi.fn(async () => JSON.stringify({ reading: "Una lectura cálida de prueba.", tip: "Respira hondo hoy." })),
  };
}

describe("POST /api/area-reading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authenticateRouteMock.mockResolvedValue({ supabase: { from: fromMock }, user: { id: "user-1" } });
    maybeSingleMock.mockResolvedValue({ data: PROFILE });
    computeChartMock.mockReturnValue({ bodies: [] });
    computeDerivedChartMock.mockReturnValue({ bodies: [] });
    detectAspectsBetweenMock.mockReturnValue([]);
    scoreToneMock.mockImplementation((score: number) => (score >= 60 ? "high" : score <= 40 ? "low" : "mixed"));
    scoreLifeAreasMock.mockReturnValue(sixAreas());
    resolveReadingProviderMock.mockReturnValue({ available: true, provider: fakeProvider() });
    // Default "transparente" de resolvePremiumReading — ver comentario del mock arriba.
    resolvePremiumReadingMock.mockImplementation(async (_req: unknown, _flag: unknown, fallback: unknown) => ({
      mode: "free",
      provider: fallback,
      headerValue: "off",
      refundIfEmpty: async () => {},
    }));
  });

  // NOTA: cada test usa un profileId ÚNICO (aunque no ejercite el caché a
  // propósito). El caché en memoria es un Map a nivel de módulo que vive para
  // TODO el archivo de test (no se resetea entre `it`s) — reusar el mismo
  // profileId+area+period+locale entre tests haría que uno sirviera del caché
  // la respuesta cacheada de un test anterior en vez de llamar al proveedor,
  // como pasó al descubrir este bug (el test 502 recibía el 200 cacheado del
  // test anterior). La sección "caché" de abajo sí reusa profileId a propósito,
  // dentro del MISMO test, para probar justamente eso.
  describe("validación", () => {
    it("400 si falta profileId", async () => {
      const res = await POST(fakeRequest({ area: "love", period: "today" }));
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ available: false, error: "bad_request" });
    });

    it("400 si el área no es una de las áreas reales de /api/scores", async () => {
      const res = await POST(fakeRequest({ profileId: "profile-val-area", area: "friendship", period: "today" }));
      expect(res.status).toBe(400);
    });

    it("400 si el periodo no es uno real (today/week/month/year)", async () => {
      const res = await POST(fakeRequest({ profileId: "profile-val-period", area: "love", period: "fortnight" }));
      expect(res.status).toBe(400);
    });

    it("400 si el JSON del body es inválido", async () => {
      const req = { json: async () => { throw new Error("bad json"); }, headers: { get: () => null } } as unknown as NextRequest;
      const res = await POST(req);
      expect(res.status).toBe(400);
    });
  });

  describe("auth y perfil", () => {
    it("401 si authenticateRoute no resuelve usuario", async () => {
      authenticateRouteMock.mockResolvedValue({ supabase: { from: fromMock }, user: null });
      const res = await POST(fakeRequest({ profileId: "profile-401", area: "love", period: "today" }));
      expect(res.status).toBe(401);
    });

    it("404 si el perfil no existe (RLS ya limita al dueño)", async () => {
      maybeSingleMock.mockResolvedValue({ data: null });
      const res = await POST(fakeRequest({ profileId: "profile-404", area: "love", period: "today" }));
      expect(res.status).toBe(404);
    });
  });

  it("available:false cuando no hay proveedor con llave (patrón del repo)", async () => {
    resolveReadingProviderMock.mockReturnValue({ available: false });
    const res = await POST(fakeRequest({ profileId: "profile-dormant", area: "love", period: "today" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ available: false });
  });

  it("200 con { reading, tip } y el header x-aluna-model en un MISS", async () => {
    const res = await POST(fakeRequest({ profileId: "profile-200", area: "love", period: "today", locale: "es" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({
      available: true,
      reading: "Una lectura cálida de prueba.",
      tip: "Respira hondo hoy.",
    });
    expect(res.headers.get("x-aluna-model")).toBe("fake/test-model");
  });

  it("502 si el proveedor no devuelve JSON parseable con reading+tip", async () => {
    resolveReadingProviderMock.mockReturnValue({
      available: true,
      provider: fakeProvider({ complete: vi.fn(async () => "no es json") }),
    });
    const res = await POST(fakeRequest({ profileId: "profile-502", area: "love", period: "today" }));
    expect(res.status).toBe(502);
  });

  describe("caché por (profileId, area, period, locale, modo de voz, fecha local)", () => {
    it("la segunda llamada el MISMO día no vuelve a llamar al proveedor (cache hit)", async () => {
      const completeMock = vi.fn(async () =>
        JSON.stringify({ reading: "Primera lectura.", tip: "Primer consejo." }),
      );
      resolveReadingProviderMock.mockReturnValue({ available: true, provider: fakeProvider({ complete: completeMock }) });

      const body = { profileId: "profile-cache-1", area: "love", period: "today", locale: "es" };
      const res1 = await POST(fakeRequest(body));
      expect(res1.status).toBe(200);
      const json1 = await res1.json();
      expect(json1).toEqual({ available: true, reading: "Primera lectura.", tip: "Primer consejo." });
      expect(completeMock).toHaveBeenCalledTimes(1);

      const res2 = await POST(fakeRequest(body));
      expect(res2.status).toBe(200);
      const json2 = await res2.json();
      // Mismo contenido servido desde el caché — el proveedor NO se llama de nuevo.
      expect(json2).toEqual(json1);
      expect(completeMock).toHaveBeenCalledTimes(1);
      expect(res2.headers.get("x-aluna-model")).toBe("fake/test-model");
    });

    it("distinto profileId o distinta área NO comparten caché (personal, no global)", async () => {
      const completeMock = vi.fn(async () =>
        JSON.stringify({ reading: "Lectura.", tip: "Consejo." }),
      );
      resolveReadingProviderMock.mockReturnValue({ available: true, provider: fakeProvider({ complete: completeMock }) });

      await POST(fakeRequest({ profileId: "profile-cache-2", area: "love", period: "today", locale: "es" }));
      await POST(fakeRequest({ profileId: "profile-cache-3", area: "love", period: "today", locale: "es" }));
      await POST(fakeRequest({ profileId: "profile-cache-2", area: "money", period: "today", locale: "es" }));

      expect(completeMock).toHaveBeenCalledTimes(3);
    });

    it("mismo profileId/area/period/locale pero distinto voiceMode NO comparte caché", async () => {
      const completeMock = vi.fn(async () =>
        JSON.stringify({ reading: "Lectura.", tip: "Consejo." }),
      );
      resolveReadingProviderMock.mockReturnValue({ available: true, provider: fakeProvider({ complete: completeMock }) });

      const base = { profileId: "profile-cache-voice", area: "love", period: "today", locale: "es" };
      await POST(fakeRequest({ ...base, voiceMode: "intima" }));
      await POST(fakeRequest({ ...base, voiceMode: "estudio" }));
      await POST(fakeRequest({ ...base, voiceMode: "pro" }));
      // Repite "intima": sigue siendo un HIT de SU propia entrada, no llama de nuevo.
      await POST(fakeRequest({ ...base, voiceMode: "intima" }));

      expect(completeMock).toHaveBeenCalledTimes(3);
    });
  });

  describe("créditos premium (Task 6)", () => {
    // A diferencia de chart-reading (streaming + caché durable), esta ruta
    // responde JSON directo (provider.complete(), sin stream) y cachea en el
    // Map en memoria del módulo — mismas garantías (spend antes del proveedor
    // premium, caché premium separada con prefijo, refund si no se entrega
    // nada), adaptadas a esa forma. La lógica de gasto/refund en sí se prueba
    // en aislado en lib/credits/__tests__/premium-reading.test.ts.

    it("premium:true con saldo → usa el proveedor premium, header 'used', cachea bajo la clave premium (HIT sin volver a gastar)", async () => {
      const premiumComplete = vi.fn(async () => JSON.stringify({ reading: "Premium.", tip: "Consejo premium." }));
      const premiumProvider = fakeProvider({ model: "claude-sonnet-5", complete: premiumComplete });
      resolvePremiumReadingMock.mockResolvedValue({
        mode: "premium",
        provider: { available: true, provider: { ...premiumProvider, name: "anthropic" } },
        headerValue: "used",
        refundIfEmpty: vi.fn(),
      });

      const body = { profileId: "profile-premium-1", area: "love", period: "today", locale: "es", premium: true };
      const res = await POST(fakeRequest(body));
      expect(res.status).toBe(200);
      expect(res.headers.get("x-aluna-premium")).toBe("used");
      expect(await res.json()).toEqual({ available: true, reading: "Premium.", tip: "Consejo premium." });
      expect(premiumComplete).toHaveBeenCalledTimes(1);

      // Segundo request idéntico: HIT de la caché premium (Map en memoria) →
      // nunca vuelve a llamar a resolvePremiumReading (nunca vuelve a gastar).
      resolvePremiumReadingMock.mockClear();
      const res2 = await POST(fakeRequest(body));
      expect(res2.status).toBe(200);
      expect(res2.headers.get("x-aluna-premium")).toBe("used");
      expect(await res2.json()).toEqual({ available: true, reading: "Premium.", tip: "Consejo premium." });
      expect(resolvePremiumReadingMock).not.toHaveBeenCalled();
      expect(premiumComplete).toHaveBeenCalledTimes(1); // no se regeneró
    });

    it("premium:true pero resolvePremiumReading degrada a 'fallback' → usa el proveedor normal, header 'fallback'", async () => {
      const freeComplete = vi.fn(async () => JSON.stringify({ reading: "Libre.", tip: "Consejo libre." }));
      const free = fakeProvider({ complete: freeComplete });
      resolveReadingProviderMock.mockReturnValue({ available: true, provider: free });
      resolvePremiumReadingMock.mockResolvedValue({
        mode: "free",
        provider: { available: true, provider: free },
        headerValue: "fallback",
        refundIfEmpty: vi.fn(),
      });

      const res = await POST(
        fakeRequest({ profileId: "profile-premium-2", area: "love", period: "today", locale: "es", premium: true }),
      );
      expect(res.status).toBe(200);
      expect(res.headers.get("x-aluna-premium")).toBe("fallback");
      expect(freeComplete).toHaveBeenCalledTimes(1);
    });

    it("proveedor no parseable tras spend premium → 502 bad_response Y refundIfEmpty() llamado (nada streamea acá: cero contenido entregado)", async () => {
      const refundIfEmpty = vi.fn();
      const badProvider = fakeProvider({ complete: vi.fn(async () => "no es json") });
      resolvePremiumReadingMock.mockResolvedValue({
        mode: "premium",
        provider: { available: true, provider: badProvider },
        headerValue: "used",
        refundIfEmpty,
      });

      const res = await POST(
        fakeRequest({ profileId: "profile-premium-3", area: "love", period: "today", locale: "es", premium: true }),
      );
      expect(res.status).toBe(502);
      expect(refundIfEmpty).toHaveBeenCalledTimes(1);
    });

    it("sin 'premium' en el body → header 'off' (comportamiento neutro de siempre)", async () => {
      const res = await POST(fakeRequest({ profileId: "profile-premium-4", area: "love", period: "today", locale: "es" }));
      expect(res.status).toBe(200);
      expect(res.headers.get("x-aluna-premium")).toBe("off");
    });
  });
});
