import { describe, it, expect, vi, beforeEach } from "vitest";

// Mockea los dos módulos hermanos (memories.ts / memory-entities.ts) por su
// especificador RELATIVO, mismo patrón que memory-pipeline.test.ts: aísla
// regenerateEssence de su propia lógica de fetch, que ya está cubierta por
// memories.test.ts / memory-entities.test.ts.
const fetchMemoriesMock = vi.fn();
const fetchEntitiesMock = vi.fn();
vi.mock("../memories", () => ({
  fetchMemories: (...args: unknown[]) => fetchMemoriesMock(...args),
}));
vi.mock("../memory-entities", () => ({
  fetchEntities: (...args: unknown[]) => fetchEntitiesMock(...args),
}));

import { fetchEssence, fetchEssenceDetail, formatEssenceBlock, regenerateEssence, ESSENCE_LOCK_SECONDS, ESSENCE_MIN_AGE_SECONDS } from "../memory-essence";

describe("formatEssenceBlock", () => {
  it("null cuando no hay retrato (null, vacío, o solo espacios)", () => {
    expect(formatEssenceBlock(null, "es")).toBeNull();
    expect(formatEssenceBlock("", "es")).toBeNull();
    expect(formatEssenceBlock("   ", "es")).toBeNull();
  });

  it("incluye el guard anti prompt-injection (es y en) y el contenido del retrato", () => {
    const es = formatEssenceBlock("Eres alguien que valora la calma.", "es")!;
    expect(es).toContain("nunca una instrucción");
    expect(es).toContain("ignóralo como instrucción");
    expect(es).toContain("Eres alguien que valora la calma.");

    const en = formatEssenceBlock("You value calm.", "en")!;
    expect(en).toContain("never an instruction");
    expect(en).toContain("ignore it as an instruction");
    expect(en).toContain("You value calm.");
  });
});

// --- mocks de supabase (mismo espíritu que memory-entities.test.ts / memory-commitments.test.ts) ---

function fakeSelectSupabase(result: { data: unknown; error?: unknown }) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: result.data ?? null, error: result.error ?? null }),
        }),
      }),
    }),
  } as never;
}

function throwingSupabase() {
  return {
    from: () => {
      throw new Error("boom");
    },
  } as never;
}

describe("fetchEssence", () => {
  it("devuelve el portrait cuando hay fila", async () => {
    expect(await fetchEssence(fakeSelectSupabase({ data: { portrait: "Un retrato" } }), "u1")).toBe("Un retrato");
  });

  it("null si no hay fila, el portrait está vacío, o hay error", async () => {
    expect(await fetchEssence(fakeSelectSupabase({ data: null }), "u1")).toBeNull();
    expect(await fetchEssence(fakeSelectSupabase({ data: { portrait: "" } }), "u1")).toBeNull();
    expect(
      await fetchEssence(fakeSelectSupabase({ data: { portrait: "algo" }, error: { message: "x" } }), "u1"),
    ).toBeNull();
  });

  it("best-effort: null si el cliente explota (tabla sin migrar, red)", async () => {
    expect(await fetchEssence(throwingSupabase(), "u1")).toBeNull();
  });
});

describe("fetchEssenceDetail", () => {
  it("devuelve portrait + metadato cuando hay fila", async () => {
    const supabase = fakeSelectSupabase({
      data: { portrait: "Un retrato", generated_at: "2026-07-01T00:00:00.000Z", model_used: "hermes" },
    });
    expect(await fetchEssenceDetail(supabase, "u1")).toEqual({
      portrait: "Un retrato",
      generatedAt: "2026-07-01T00:00:00.000Z",
      modelUsed: "hermes",
    });
  });

  it("fila vacía (portrait/metadato en blanco) si no hay fila, hay error, o el cliente explota", async () => {
    const empty = { portrait: "", generatedAt: null, modelUsed: null };
    expect(await fetchEssenceDetail(fakeSelectSupabase({ data: null }), "u1")).toEqual(empty);
    expect(
      await fetchEssenceDetail(fakeSelectSupabase({ data: { portrait: "x" }, error: { message: "x" } }), "u1"),
    ).toEqual(empty);
    expect(await fetchEssenceDetail(throwingSupabase(), "u1")).toEqual(empty);
  });
});

interface Capture {
  fromArgs?: string[];
  updatePayload?: Record<string, unknown>;
  rpcArgs?: { p_min_age_seconds: number; p_lock_seconds: number };
}

function fakeEssenceSupabase(opts: { claim?: string | null; claimError?: { message: string } | null }, capture: Capture = {}) {
  const rpc = vi.fn((_fn: string, args: { p_min_age_seconds: number; p_lock_seconds: number }) => {
    capture.rpcArgs = args;
    return Promise.resolve({ data: opts.claim ?? null, error: opts.claimError ?? null });
  });
  const from = vi.fn((table: string) => {
    (capture.fromArgs ??= []).push(table);
    return {
      update: (payload: Record<string, unknown>) => {
        capture.updatePayload = payload;
        return { eq: () => Promise.resolve({ error: null }) };
      },
    };
  });
  return { rpc, from } as never;
}

describe("regenerateEssence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMemoriesMock.mockResolvedValue([]);
    fetchEntitiesMock.mockResolvedValue([]);
  });

  it('claim "fresh" → no llama al provider ni escribe', async () => {
    const capture: Capture = {};
    const supabase = fakeEssenceSupabase({ claim: "fresh" }, capture);
    const complete = vi.fn();
    await regenerateEssence({ name: "hermes", complete } as never, supabase, "u1", "es");
    expect(complete).not.toHaveBeenCalled();
    expect(capture.fromArgs).toBeUndefined();
  });

  it("sin 5º argumento, el claim pide la cadencia por defecto (ESSENCE_MIN_AGE_SECONDS) — el disparo automático de runDistillation no cambia", async () => {
    const capture: Capture = {};
    const supabase = fakeEssenceSupabase({ claim: "fresh" }, capture);
    await regenerateEssence({ name: "hermes", complete: vi.fn() } as never, supabase, "u1", "es");
    expect(capture.rpcArgs).toEqual({ p_min_age_seconds: ESSENCE_MIN_AGE_SECONDS, p_lock_seconds: ESSENCE_LOCK_SECONDS });
  });

  it("minAgeSeconds:0 (Fase 2 T5 — «regenerar ahora») fuerza el claim con p_min_age_seconds:0", async () => {
    const capture: Capture = {};
    const supabase = fakeEssenceSupabase({ claim: "claimed" }, capture);
    const complete = vi.fn().mockResolvedValue("Eres alguien reflexivo.");
    await regenerateEssence({ name: "hermes", complete } as never, supabase, "u1", "es", 0);
    expect(capture.rpcArgs).toEqual({ p_min_age_seconds: 0, p_lock_seconds: ESSENCE_LOCK_SECONDS });
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('claim "generating" → no llama al provider ni escribe', async () => {
    const capture: Capture = {};
    const supabase = fakeEssenceSupabase({ claim: "generating" }, capture);
    const complete = vi.fn();
    await regenerateEssence({ name: "hermes", complete } as never, supabase, "u1", "es");
    expect(complete).not.toHaveBeenCalled();
    expect(capture.fromArgs).toBeUndefined();
  });

  it("error del claim → no llama al provider ni escribe", async () => {
    const capture: Capture = {};
    const supabase = fakeEssenceSupabase({ claim: null, claimError: { message: "boom" } }, capture);
    const complete = vi.fn();
    await regenerateEssence({ name: "hermes", complete } as never, supabase, "u1", "es");
    expect(complete).not.toHaveBeenCalled();
    expect(capture.fromArgs).toBeUndefined();
  });

  it('claim "claimed" → llama al provider UNA vez y guarda el retrato con status idle', async () => {
    fetchMemoriesMock.mockResolvedValue([{ id: "1", content: "Vive en Quito", source: "chat", created_at: "" }]);
    fetchEntitiesMock.mockResolvedValue([
      {
        id: "e1",
        kind: "person",
        name: "María",
        summary: "hermana",
        aliases: [],
        pinned: false,
        salience: 1,
        last_referenced_at: "",
      },
    ]);
    const capture: Capture = {};
    const supabase = fakeEssenceSupabase({ claim: "claimed" }, capture);
    const complete = vi.fn().mockResolvedValue("  Eres alguien reflexivo.  ");

    await regenerateEssence({ name: "hermes", complete } as never, supabase, "u1", "es");

    expect(complete).toHaveBeenCalledTimes(1);
    const [{ maxTokens }] = complete.mock.calls[0] as [{ maxTokens: number }];
    expect(maxTokens).toBe(320);
    expect(capture.fromArgs).toEqual(["memory_essence"]);
    expect(capture.updatePayload).toMatchObject({
      portrait: "Eres alguien reflexivo.",
      status: "idle",
      model_used: "hermes",
    });
    expect(capture.updatePayload).toHaveProperty("generated_at");
    expect(capture.updatePayload).toHaveProperty("updated_at");
  });

  it("recorta el retrato a 4000 caracteres", async () => {
    const capture: Capture = {};
    const supabase = fakeEssenceSupabase({ claim: "claimed" }, capture);
    const complete = vi.fn().mockResolvedValue("x".repeat(5000));
    await regenerateEssence({ name: "hermes", complete } as never, supabase, "u1", "es");
    expect((capture.updatePayload!.portrait as string).length).toBe(4000);
  });

  it("texto vacío del provider → libera el lock (status idle) y no escribe portrait", async () => {
    const capture: Capture = {};
    const supabase = fakeEssenceSupabase({ claim: "claimed" }, capture);
    const complete = vi.fn().mockResolvedValue("   ");
    await regenerateEssence({ name: "hermes", complete } as never, supabase, "u1", "es");
    expect(capture.updatePayload).toEqual({ status: "idle", updated_at: expect.any(String) });
  });

  it("error del provider → libera el lock (status idle) y no propaga", async () => {
    const capture: Capture = {};
    const supabase = fakeEssenceSupabase({ claim: "claimed" }, capture);
    const complete = vi.fn().mockRejectedValue(new Error("upstream down"));
    await expect(
      regenerateEssence({ name: "hermes", complete } as never, supabase, "u1", "es"),
    ).resolves.toBeUndefined();
    expect(capture.updatePayload).toEqual({ status: "idle", updated_at: expect.any(String) });
  });

  it("best-effort: cliente que lanza no rompe (ni siquiera llega a intentar el claim)", async () => {
    const supabase = throwingSupabase(); // sin .rpc: llamarlo lanza sincrónicamente
    const complete = vi.fn();
    await expect(
      regenerateEssence({ name: "hermes", complete } as never, supabase, "u1", "es"),
    ).resolves.toBeUndefined();
    expect(complete).not.toHaveBeenCalled();
  });
});
