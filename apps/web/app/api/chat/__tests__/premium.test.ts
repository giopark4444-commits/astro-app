import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";
import { computeNumerology } from "@aluna/core";

// ---------------------------------------------------------------------------
// Mocks — mismo estilo que route.test.ts, pero cubriendo el camino COMPLETO
// (no solo el corte temprano "dormant"): créditos, tope diario y el stream.
// Se usa `lenses: ["numeros"]` en el body para evitar computar carta/Ba Zi
// (fuera de foco de esta task) y así no depender de efemérides reales.
// ---------------------------------------------------------------------------

const authenticateRouteMock = vi.fn();
vi.mock("@/lib/supabase/route-auth", () => ({
  authenticateRoute: (...args: unknown[]) => authenticateRouteMock(...args),
}));

vi.mock("@aluna/ephemeris", () => ({
  computeChart: vi.fn(() => ({ bodies: [], houses: { ascendant: 0, midheaven: 0 }, patterns: [] })),
  setEphePath: vi.fn(),
  jieBoundaries: vi.fn(),
}));
vi.mock("@aluna/core", () => ({
  computeNumerology: vi.fn(() => ({
    core: { lifePath: { value: 1 }, expression: { value: 1 }, soulUrge: { value: 1 }, personality: { value: 1 }, maturity: { value: 1 } },
  })),
  signOfLongitude: vi.fn(() => ({ sign: "aries" })),
  parseIntent: vi.fn(() => null),
}));
vi.mock("@/lib/content/astrology-labels", () => ({
  astroLabels: () => ({ bodies: {}, signs: {}, dignities: {}, patterns: {} }),
}));

// Memoria/hilos apagados por defecto (gate propio) en la mayoría de los
// casos — solo la suite I1 de más abajo la prende para probar por qué canal
// se destila. `fetchIntentAndMemorySettingsMock` queda expuesto (no inline)
// para poder pisarlo con memoryEnabled:true en esa suite puntual. `vi.fn()`
// SIN implementación inline (a propósito, mismo criterio que el resto de
// los mocks del archivo): con una implementación inline TS infiere una
// tupla de parámetros fija (`[]`) y el `(...args: unknown[]) => xMock(...args)`
// de abajo deja de tipar. Los defaults se fijan en cada `beforeEach`.
const fetchIntentAndMemorySettingsMock = vi.fn();
vi.mock("@/lib/settings", () => ({
  fetchIntentAndMemorySettings: (...args: unknown[]) => fetchIntentAndMemorySettingsMock(...args),
}));

// Hilo/destilado (I1): mockeados SIEMPRE (no solo cuando memoria está ON)
// para no arrastrar chat-archive/memory-pipeline reales en ningún test —
// con memoryEnabled:false por defecto estos mocks simplemente no se llaman.
const ensureThreadMock = vi.fn();
const appendMessageMock = vi.fn();
vi.mock("@/lib/chat-archive", () => ({
  ensureThread: (...args: unknown[]) => ensureThreadMock(...args),
  appendMessage: (...args: unknown[]) => appendMessageMock(...args),
}));

const buildMemoryBlocksMock = vi.fn();
const runDistillationMock = vi.fn();
vi.mock("@/lib/memory-pipeline", () => ({
  buildMemoryBlocks: (...args: unknown[]) => buildMemoryBlocksMock(...args),
  runDistillation: (...args: unknown[]) => runDistillationMock(...args),
}));

// `after()` real exige contexto de request (Next.js lanza fuera de uno) —
// acá se captura el callback para poder correrlo a mano y esperar a que
// termine (I1 necesita inspeccionar con qué provider llamó a runDistillation).
const afterCallbacks: Array<() => unknown> = [];
vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return { ...actual, after: (cb: () => unknown) => { afterCallbacks.push(cb); } };
});

const resolveReadingProviderMock = vi.fn();
const resolvePremiumProviderMock = vi.fn();
vi.mock("@/lib/reading/provider", () => ({
  resolveReadingProvider: (...args: unknown[]) => resolveReadingProviderMock(...args),
  resolvePremiumProvider: () => resolvePremiumProviderMock(),
}));

const getCreditsServiceClientMock = vi.fn();
const spendCreditsMock = vi.fn();
const refundSpendMock = vi.fn();
const bumpChatUsageMock = vi.fn();
vi.mock("@/lib/credits/ledger", () => ({
  getCreditsServiceClient: () => getCreditsServiceClientMock(),
  spendCredits: (...args: unknown[]) => spendCreditsMock(...args),
  refundSpend: (...args: unknown[]) => refundSpendMock(...args),
  bumpChatUsage: (...args: unknown[]) => bumpChatUsageMock(...args),
}));

const chatPremiumCostMock = vi.fn();
const freeDailyChatCapMock = vi.fn();
vi.mock("@/lib/credits/config", () => ({
  chatPremiumCost: () => chatPremiumCostMock(),
  freeDailyChatCap: () => freeDailyChatCapMock(),
}));

const allAccessEnabledMock = vi.fn();
vi.mock("@/lib/plan-gate", () => ({
  allAccessEnabled: () => allAccessEnabledMock(),
}));

const isRequesterPlusMock = vi.fn();
vi.mock("@/lib/billing/requester-plus", () => ({
  isRequesterPlus: (...args: unknown[]) => isRequesterPlusMock(...args),
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

const PROFILE_ROW = {
  name: "Gio",
  birth_date: "1990-01-01",
  birth_time: "10:00",
  time_known: true,
  latitude: 1,
  longitude: 1,
  time_zone: "UTC",
  gender: "masculine",
};

function baseBody(extra: Record<string, unknown> = {}) {
  return {
    profileId: "p1",
    locale: "es",
    messages: [{ role: "user", content: "hola" }],
    lenses: ["numeros"], // evita astros/pilares: sin efemérides ni Ba Zi en esta suite
    ...extra,
  };
}

/** Genera un ReadingProvider fake cuyo chatStream emite `chunks` (o lanza si `throwOnCall`). */
function fakeProvider(name: string, model: string, chunks: string[], opts: { throwOnCall?: boolean } = {}) {
  return {
    name,
    model,
    async complete() {
      return chunks.join("");
    },
    async *completeStream() {
      for (const c of chunks) yield c;
    },
    async chat() {
      return chunks.join("");
    },
    chatStream: vi.fn(async function* () {
      if (opts.throwOnCall) throw new Error("upstream down");
      for (const c of chunks) yield c;
    }),
  };
}

const SVC = { rpc: vi.fn() }; // stand-in del SupabaseClient service-role (nunca se usa de verdad; solo identidad)

describe("POST /api/chat — créditos premium + tope diario (Task 5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authenticateRouteMock.mockResolvedValue({ supabase: { from: fromMock }, user: { id: "user-1" } });
    maybeSingleMock.mockResolvedValue({ data: PROFILE_ROW });
    eqMock.mockReturnValue({ maybeSingle: maybeSingleMock });
    selectMock.mockReturnValue({ eq: eqMock });
    fromMock.mockReturnValue({ select: selectMock });

    // Defaults neutros: sin candados, sin tope, camino gratis siempre disponible.
    allAccessEnabledMock.mockReturnValue(true);
    isRequesterPlusMock.mockResolvedValue(true);
    bumpChatUsageMock.mockResolvedValue(1);
    freeDailyChatCapMock.mockReturnValue(5);
    chatPremiumCostMock.mockReturnValue(2);
    getCreditsServiceClientMock.mockReturnValue(SVC);
    spendCreditsMock.mockResolvedValue(true);
    refundSpendMock.mockResolvedValue(true);

    // Memoria/hilo/destilado: apagada por defecto (solo la suite I1 la prende).
    fetchIntentAndMemorySettingsMock.mockResolvedValue({ intent: null, memoryEnabled: false });
    ensureThreadMock.mockResolvedValue(null);
    appendMessageMock.mockResolvedValue(undefined);
    buildMemoryBlocksMock.mockResolvedValue("");
    runDistillationMock.mockResolvedValue(undefined);
    afterCallbacks.length = 0;
  });

  it("(a) premium:true con saldo → usa el proveedor premium, header 'used', spend llamado ANTES que el proveedor", async () => {
    const free = fakeProvider("hermes", "Hermes-4-70B", ["libre"]);
    const premium = fakeProvider("anthropic", "claude-sonnet-5", ["hola premium"]);
    resolveReadingProviderMock.mockReturnValue({ available: true, provider: free });
    resolvePremiumProviderMock.mockReturnValue({ available: true, provider: premium });

    const res = await POST(fakeRequest(baseBody({ premium: true })));
    expect(res.status).toBe(200);
    expect(res.headers.get("x-aluna-premium")).toBe("used");
    expect(res.headers.get("x-aluna-model")).toBe("anthropic/claude-sonnet-5");
    expect(await res.text()).toBe("hola premium");

    expect(spendCreditsMock).toHaveBeenCalledTimes(1);
    expect(spendCreditsMock).toHaveBeenCalledWith(SVC, "user-1", 2, expect.stringMatching(/^spend:.+/));
    expect(premium.chatStream).toHaveBeenCalledTimes(1);
    expect(free.chatStream).not.toHaveBeenCalled();

    // orden: el spend se resuelve ANTES que el proveedor premium sea invocado.
    const spendOrder = spendCreditsMock.mock.invocationCallOrder[0]!;
    const providerOrder = (premium.chatStream as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0]!;
    expect(spendOrder).toBeLessThan(providerOrder);
  });

  it("(b) premium:true sin saldo (spend devuelve false) → cascada normal, header 'fallback', premium NO llamado", async () => {
    const free = fakeProvider("hermes", "Hermes-4-70B", ["libre de respaldo"]);
    const premium = fakeProvider("anthropic", "claude-sonnet-5", ["nunca sale"]);
    resolveReadingProviderMock.mockReturnValue({ available: true, provider: free });
    resolvePremiumProviderMock.mockReturnValue({ available: true, provider: premium });
    spendCreditsMock.mockResolvedValue(false);

    const res = await POST(fakeRequest(baseBody({ premium: true })));
    expect(res.status).toBe(200);
    expect(res.headers.get("x-aluna-premium")).toBe("fallback");
    expect(await res.text()).toBe("libre de respaldo");
    expect(spendCreditsMock).toHaveBeenCalledTimes(1);
    expect(premium.chatStream).not.toHaveBeenCalled();
    expect(free.chatStream).toHaveBeenCalledTimes(1);
    expect(refundSpendMock).not.toHaveBeenCalled();
  });

  it("(c) premium:true sin ANTHROPIC_API_KEY (resolvePremiumProvider apagado) → header 'off'", async () => {
    const free = fakeProvider("hermes", "Hermes-4-70B", ["libre"]);
    resolveReadingProviderMock.mockReturnValue({ available: true, provider: free });
    resolvePremiumProviderMock.mockReturnValue({ available: false });

    const res = await POST(fakeRequest(baseBody({ premium: true })));
    expect(res.status).toBe(200);
    expect(res.headers.get("x-aluna-premium")).toBe("off");
    expect(await res.text()).toBe("libre");
    expect(spendCreditsMock).not.toHaveBeenCalled();
  });

  it("(d) sin 'premium' en el body → header 'off', cero llamadas a rpcs de gasto", async () => {
    const free = fakeProvider("hermes", "Hermes-4-70B", ["libre"]);
    resolveReadingProviderMock.mockReturnValue({ available: true, provider: free });

    const res = await POST(fakeRequest(baseBody()));
    expect(res.status).toBe(200);
    expect(res.headers.get("x-aluna-premium")).toBe("off");
    expect(spendCreditsMock).not.toHaveBeenCalled();
    expect(bumpChatUsageMock).not.toHaveBeenCalled();
    expect(resolvePremiumProviderMock).not.toHaveBeenCalled();
  });

  it("(e) fallo total del stream premium (cero caracteres emitidos) → refund con 'refund:spend:<uuid>'", async () => {
    const free = fakeProvider("hermes", "Hermes-4-70B", ["libre"]);
    const premium = fakeProvider("anthropic", "claude-sonnet-5", [], { throwOnCall: true });
    resolveReadingProviderMock.mockReturnValue({ available: true, provider: free });
    resolvePremiumProviderMock.mockReturnValue({ available: true, provider: premium });

    const res = await POST(fakeRequest(baseBody({ premium: true })));
    expect(res.headers.get("x-aluna-premium")).toBe("used"); // se decidió "used" antes de que el stream fallara
    expect(await res.text()).toBe(""); // cero caracteres emitidos

    expect(refundSpendMock).toHaveBeenCalledTimes(1);
    const [svcArg, userArg, amountArg, refArg] = refundSpendMock.mock.calls[0]!;
    expect(svcArg).toBe(SVC);
    expect(userArg).toBe("user-1");
    expect(amountArg).toBe(2);
    expect(refArg).toMatch(/^spend:.+/);

    // el ref que se le pidió gastar es el mismo que se le pide revertir.
    const [, , , spentRef] = spendCreditsMock.mock.calls[0]!;
    expect(refArg).toBe(spentRef);
  });

  it("(f) all-access OFF + no-plus + count > cap + premium off (sin llave) → 429 daily_cap (sin gastar crédito)", async () => {
    allAccessEnabledMock.mockReturnValue(false);
    isRequesterPlusMock.mockResolvedValue(false);
    freeDailyChatCapMock.mockReturnValue(5);
    bumpChatUsageMock.mockResolvedValue(6);
    resolvePremiumProviderMock.mockReturnValue({ available: false });
    const free = fakeProvider("hermes", "Hermes-4-70B", ["libre"]);
    resolveReadingProviderMock.mockReturnValue({ available: true, provider: free });

    const res = await POST(fakeRequest(baseBody({ premium: true })));
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: "daily_cap", cap: 5 });
    expect(spendCreditsMock).not.toHaveBeenCalled();
  });

  it("(f-used) I2: premium:true CON saldo (used) + tope diario YA pasado → NO bumpea, NO 429 — premium pagado nunca choca con el tope", async () => {
    allAccessEnabledMock.mockReturnValue(false);
    isRequesterPlusMock.mockResolvedValue(false);
    freeDailyChatCapMock.mockReturnValue(5);
    bumpChatUsageMock.mockResolvedValue(6); // el contador ya está pasado...
    const free = fakeProvider("hermes", "Hermes-4-70B", ["libre"]);
    const premium = fakeProvider("anthropic", "claude-sonnet-5", ["hola premium"]);
    resolveReadingProviderMock.mockReturnValue({ available: true, provider: free });
    resolvePremiumProviderMock.mockReturnValue({ available: true, provider: premium });

    const res = await POST(fakeRequest(baseBody({ premium: true })));
    expect(res.status).toBe(200);
    expect(res.headers.get("x-aluna-premium")).toBe("used");
    expect(await res.text()).toBe("hola premium");
    // ...pero como se pagó con crédito, ni siquiera se consulta el tope.
    expect(bumpChatUsageMock).not.toHaveBeenCalled();
    expect(isRequesterPlusMock).not.toHaveBeenCalled();
  });

  it("(f-fallback) I2: premium:true SIN saldo (fallback) + tope diario pasado → 429 (el fallback sí pasa por el tope, no hubo débito)", async () => {
    allAccessEnabledMock.mockReturnValue(false);
    isRequesterPlusMock.mockResolvedValue(false);
    freeDailyChatCapMock.mockReturnValue(5);
    bumpChatUsageMock.mockResolvedValue(6);
    spendCreditsMock.mockResolvedValue(false);
    const free = fakeProvider("hermes", "Hermes-4-70B", ["libre"]);
    const premium = fakeProvider("anthropic", "claude-sonnet-5", ["nunca sale"]);
    resolveReadingProviderMock.mockReturnValue({ available: true, provider: free });
    resolvePremiumProviderMock.mockReturnValue({ available: true, provider: premium });

    const res = await POST(fakeRequest(baseBody({ premium: true })));
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: "daily_cap", cap: 5 });
    expect(spendCreditsMock).toHaveBeenCalledTimes(1); // se intentó y falló (sin saldo) ANTES del chequeo del tope
    expect(premium.chatStream).not.toHaveBeenCalled();
    expect(free.chatStream).not.toHaveBeenCalled(); // el 429 corta antes de llegar a invocar cualquier proveedor
  });

  it("(f2) all-access OFF + no-plus + count dentro del tope → sigue normal (200, sin 429)", async () => {
    allAccessEnabledMock.mockReturnValue(false);
    isRequesterPlusMock.mockResolvedValue(false);
    freeDailyChatCapMock.mockReturnValue(5);
    bumpChatUsageMock.mockResolvedValue(3);
    const free = fakeProvider("hermes", "Hermes-4-70B", ["libre"]);
    resolveReadingProviderMock.mockReturnValue({ available: true, provider: free });

    const res = await POST(fakeRequest(baseBody()));
    expect(res.status).toBe(200);
    expect(bumpChatUsageMock).toHaveBeenCalledTimes(1);
  });

  it("(g) all-access ON → nunca bumpea (ni consulta isRequesterPlus)", async () => {
    allAccessEnabledMock.mockReturnValue(true);
    const free = fakeProvider("hermes", "Hermes-4-70B", ["libre"]);
    resolveReadingProviderMock.mockReturnValue({ available: true, provider: free });

    const res = await POST(fakeRequest(baseBody()));
    expect(res.status).toBe(200);
    expect(bumpChatUsageMock).not.toHaveBeenCalled();
    expect(isRequesterPlusMock).not.toHaveBeenCalled();
  });

  it("(h) costo premium <= 0 → premium 'regalado': usa el proveedor premium sin llamar spend ni refund", async () => {
    chatPremiumCostMock.mockReturnValue(0);
    getCreditsServiceClientMock.mockReturnValue(null); // ni siquiera hace falta service client
    const free = fakeProvider("hermes", "Hermes-4-70B", ["libre"]);
    const premium = fakeProvider("anthropic", "claude-sonnet-5", ["premium gratis"]);
    resolveReadingProviderMock.mockReturnValue({ available: true, provider: free });
    resolvePremiumProviderMock.mockReturnValue({ available: true, provider: premium });

    const res = await POST(fakeRequest(baseBody({ premium: true })));
    expect(res.status).toBe(200);
    expect(res.headers.get("x-aluna-premium")).toBe("used");
    expect(await res.text()).toBe("premium gratis");
    expect(spendCreditsMock).not.toHaveBeenCalled();

    // Aunque el stream no emita nada, costo 0 no es un spend real: no hay que revertir nada.
    vi.clearAllMocks();
    allAccessEnabledMock.mockReturnValue(true);
    chatPremiumCostMock.mockReturnValue(0);
    getCreditsServiceClientMock.mockReturnValue(null);
    maybeSingleMock.mockResolvedValue({ data: PROFILE_ROW });
    const premiumEmpty = fakeProvider("anthropic", "claude-sonnet-5", [], { throwOnCall: true });
    resolveReadingProviderMock.mockReturnValue({ available: true, provider: free });
    resolvePremiumProviderMock.mockReturnValue({ available: true, provider: premiumEmpty });
    const res2 = await POST(fakeRequest(baseBody({ premium: true })));
    expect(await res2.text()).toBe("");
    expect(refundSpendMock).not.toHaveBeenCalled();
  });

  it("(i) C1: spend OK pero construir el contexto (pre-stream) lanza → 502 y refund con el MISMO ref del spend", async () => {
    const free = fakeProvider("hermes", "Hermes-4-70B", ["libre"]);
    const premium = fakeProvider("anthropic", "claude-sonnet-5", ["nunca sale"]);
    resolveReadingProviderMock.mockReturnValue({ available: true, provider: free });
    resolvePremiumProviderMock.mockReturnValue({ available: true, provider: premium });
    // baseBody usa lenses:["numeros"] → computeNumerology corre dentro del
    // try que arma `system`; lo hacemos explotar para simular cualquier falla
    // post-spend (computeChart/buildFocusedContext se comportan igual).
    (computeNumerology as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
      throw new Error("boom");
    });

    const res = await POST(fakeRequest(baseBody({ premium: true })));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ available: false, error: "upstream" });

    // el crédito SÍ se gastó (antes de construir el contexto)...
    expect(spendCreditsMock).toHaveBeenCalledTimes(1);
    const [, , , spentRef] = spendCreditsMock.mock.calls[0]!;
    // ...pero como no se entregó nada, debe reembolsarse con el MISMO ref.
    expect(refundSpendMock).toHaveBeenCalledTimes(1);
    const [svcArg, userArg, amountArg, refArg] = refundSpendMock.mock.calls[0]!;
    expect(svcArg).toBe(SVC);
    expect(userArg).toBe("user-1");
    expect(amountArg).toBe(2);
    expect(refArg).toBe(spentRef);
    // el proveedor premium nunca llegó a invocarse: el 502 corta antes del stream.
    expect(premium.chatStream).not.toHaveBeenCalled();
  });

  it("(j) I2: all-access OFF + isRequesterPlus rechaza (error de red) → fail-open, NO 500, sigue el flujo normal", async () => {
    allAccessEnabledMock.mockReturnValue(false);
    isRequesterPlusMock.mockRejectedValue(new Error("network down"));
    const free = fakeProvider("hermes", "Hermes-4-70B", ["libre"]);
    resolveReadingProviderMock.mockReturnValue({ available: true, provider: free });

    const res = await POST(fakeRequest(baseBody()));
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("libre");
    // fail-open: se salta el chequeo del tope entero (no bumpea el contador).
    expect(bumpChatUsageMock).not.toHaveBeenCalled();
  });

  it("sin servicio de créditos configurado (getCreditsServiceClient null) + premium:true + costo > 0 → header 'off', camino gratis", async () => {
    getCreditsServiceClientMock.mockReturnValue(null);
    const free = fakeProvider("hermes", "Hermes-4-70B", ["libre"]);
    const premium = fakeProvider("anthropic", "claude-sonnet-5", ["no debería salir"]);
    resolveReadingProviderMock.mockReturnValue({ available: true, provider: free });
    resolvePremiumProviderMock.mockReturnValue({ available: true, provider: premium });

    const res = await POST(fakeRequest(baseBody({ premium: true })));
    expect(res.status).toBe(200);
    expect(res.headers.get("x-aluna-premium")).toBe("off");
    expect(await res.text()).toBe("libre");
    expect(spendCreditsMock).not.toHaveBeenCalled();
    expect(premium.chatStream).not.toHaveBeenCalled();
  });
});

describe("POST /api/chat — I1: la destilación de memoria va por el canal barato", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authenticateRouteMock.mockResolvedValue({ supabase: { from: fromMock }, user: { id: "user-1" } });
    maybeSingleMock.mockResolvedValue({ data: PROFILE_ROW });
    eqMock.mockReturnValue({ maybeSingle: maybeSingleMock });
    selectMock.mockReturnValue({ eq: eqMock });
    fromMock.mockReturnValue({ select: selectMock });

    allAccessEnabledMock.mockReturnValue(true);
    isRequesterPlusMock.mockResolvedValue(true);
    bumpChatUsageMock.mockResolvedValue(1);
    freeDailyChatCapMock.mockReturnValue(5);
    chatPremiumCostMock.mockReturnValue(2);
    getCreditsServiceClientMock.mockReturnValue(SVC);
    spendCreditsMock.mockResolvedValue(true);
    refundSpendMock.mockResolvedValue(true);

    // Lo único distinto de la suite de arriba: memoria ON.
    fetchIntentAndMemorySettingsMock.mockResolvedValue({ intent: null, memoryEnabled: true });
    ensureThreadMock.mockResolvedValue(null);
    appendMessageMock.mockResolvedValue(undefined);
    buildMemoryBlocksMock.mockResolvedValue("");
    runDistillationMock.mockResolvedValue(undefined);
    afterCallbacks.length = 0;
  });

  it("memoria ON + premium used (gratis disponible) → runDistillation recibe el provider de la cascada GRATIS, no el premium", async () => {
    const free = fakeProvider("hermes", "Hermes-4-70B", ["libre"]);
    const premium = fakeProvider("anthropic", "claude-sonnet-5", ["hola premium"]);
    resolveReadingProviderMock.mockReturnValue({ available: true, provider: free });
    resolvePremiumProviderMock.mockReturnValue({ available: true, provider: premium });

    const res = await POST(fakeRequest(baseBody({ premium: true })));
    expect(res.status).toBe(200);
    expect(res.headers.get("x-aluna-premium")).toBe("used");
    expect(await res.text()).toBe("hola premium"); // agota el stream: assistantReply queda completo

    expect(afterCallbacks).toHaveLength(1);
    for (const cb of afterCallbacks) await cb();

    expect(runDistillationMock).toHaveBeenCalledTimes(1);
    const [providerArg] = runDistillationMock.mock.calls[0]!;
    expect(providerArg).toBe(free); // la cascada gratis, NO `premium`
  });

  it("memoria ON + premium off (sin llave) → runDistillation recibe el MISMO provider que respondió (gratis), comportamiento intacto", async () => {
    const free = fakeProvider("hermes", "Hermes-4-70B", ["libre"]);
    resolveReadingProviderMock.mockReturnValue({ available: true, provider: free });
    resolvePremiumProviderMock.mockReturnValue({ available: false });

    const res = await POST(fakeRequest(baseBody({ premium: true })));
    expect(res.status).toBe(200);
    expect(res.headers.get("x-aluna-premium")).toBe("off");
    await res.text();

    expect(afterCallbacks).toHaveLength(1);
    for (const cb of afterCallbacks) await cb();

    expect(runDistillationMock).toHaveBeenCalledTimes(1);
    const [providerArg] = runDistillationMock.mock.calls[0]!;
    expect(providerArg).toBe(free);
  });

  it("memoria ON + premium used PERO la cascada gratis no está disponible → cae al comportamiento previo (usa el provider que respondió, el premium)", async () => {
    const premium = fakeProvider("anthropic", "claude-sonnet-5", ["hola premium"]);
    resolveReadingProviderMock.mockReturnValue({ available: false, provider: undefined });
    resolvePremiumProviderMock.mockReturnValue({ available: true, provider: premium });

    const res = await POST(fakeRequest(baseBody({ premium: true })));
    expect(res.status).toBe(200);
    expect(res.headers.get("x-aluna-premium")).toBe("used");
    await res.text();

    expect(afterCallbacks).toHaveLength(1);
    for (const cb of afterCallbacks) await cb();

    expect(runDistillationMock).toHaveBeenCalledTimes(1);
    const [providerArg] = runDistillationMock.mock.calls[0]!;
    expect(providerArg).toBe(premium); // sin gratis disponible, no hay a dónde más ir
  });
});
