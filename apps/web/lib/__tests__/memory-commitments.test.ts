import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  syncCommitmentsFromManifestations,
  fetchOpenCommitments,
  dismissCommitment,
  completeCommitment,
} from "../memory-commitments";

// Fake supabase mínimo, mismo espíritu que chat-archive.test.ts: cada chain
// devuelve un objeto TANTO encadenable (select/eq/gte/in/or/order/insert/
// update devuelven `this`) COMO thenable (resuelve `result` en el await
// final, sin pasar por maybeSingle). `capture` registra lo que se le pasó a
// eq/or/order/insert/update para poder afirmar sobre la query exacta que
// memory-commitments.ts arma.
function chain(result: { data?: unknown; error?: unknown } = { data: null, error: null }, capture: Record<string, unknown> = {}) {
  const obj: Record<string, unknown> = {
    select: (...args: unknown[]) => {
      capture.selectArgs = args;
      return obj;
    },
    eq: (...args: unknown[]) => {
      (capture.eqCalls as unknown[][] | undefined ?? (capture.eqCalls = [])).push(args);
      return obj;
    },
    gte: (...args: unknown[]) => {
      capture.gteArgs = args;
      return obj;
    },
    in: (...args: unknown[]) => {
      capture.inArgs = args;
      return obj;
    },
    or: (...args: unknown[]) => {
      capture.orArgs = args;
      return obj;
    },
    order: (...args: unknown[]) => {
      capture.orderArgs = args;
      return obj;
    },
    insert: (v: unknown) => {
      capture.inserted = v;
      return obj;
    },
    update: (v: unknown) => {
      capture.updated = v;
      return obj;
    },
    then: (resolve: (v: typeof result) => void) => resolve(result),
  };
  return obj;
}

function throwingSupabase() {
  return {
    from: () => {
      throw new Error("boom");
    },
  } as never;
}

describe("syncCommitmentsFromManifestations", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-20T12:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("no hace nada si no hay manifestaciones en la ventana", async () => {
    const fromMock = vi.fn().mockReturnValueOnce(chain({ data: [], error: null }));
    const supabase = { from: fromMock } as never;

    await syncCommitmentsFromManifestations(supabase, "u1");

    expect(fromMock).toHaveBeenCalledTimes(1); // nunca llega a leer memory_threads
    expect(fromMock).toHaveBeenCalledWith("manifestations");
  });

  it("inserta un compromiso nuevo desde una manifestación sin hilo previo", async () => {
    const manifestations = [{ id: "m1", intention: "Terminar el TFG", target_date: "2026-07-25" }];
    const captureInsert: Record<string, unknown> = {};
    const fromMock = vi
      .fn()
      .mockReturnValueOnce(chain({ data: manifestations, error: null })) // manifestations
      .mockReturnValueOnce(chain({ data: [], error: null })) // memory_threads existentes
      .mockReturnValueOnce(chain({ error: null }, captureInsert)); // insert
    const supabase = { from: fromMock } as never;

    await syncCommitmentsFromManifestations(supabase, "u1");

    expect(fromMock).toHaveBeenNthCalledWith(1, "manifestations");
    expect(fromMock).toHaveBeenNthCalledWith(2, "memory_threads");
    expect(fromMock).toHaveBeenNthCalledWith(3, "memory_threads");
    expect(captureInsert.inserted).toEqual([
      {
        user_id: "u1",
        description: "Terminar el TFG",
        kind: "manifestation",
        status: "open",
        due_at: "2026-07-25T00:00:00.000Z",
        source_ref: "manifestation:m1",
      },
    ]);
  });

  it("NO resucita un hilo dismissed: lo deja intacto (sin insert ni update)", async () => {
    const manifestations = [{ id: "m1", intention: "Terminar el TFG", target_date: "2026-07-25" }];
    const existingThreads = [
      { id: "t1", status: "dismissed", due_at: "2026-07-01T00:00:00Z", description: "vieja", source_ref: "manifestation:m1" },
    ];
    const fromMock = vi
      .fn()
      .mockReturnValueOnce(chain({ data: manifestations, error: null }))
      .mockReturnValueOnce(chain({ data: existingThreads, error: null }));
    const supabase = { from: fromMock } as never;

    await syncCommitmentsFromManifestations(supabase, "u1");

    expect(fromMock).toHaveBeenCalledTimes(2); // ni insert ni update: solo los dos selects
  });

  it("NO resucita un hilo done: mismo trato que dismissed", async () => {
    const manifestations = [{ id: "m1", intention: "Terminar el TFG", target_date: "2026-07-25" }];
    const existingThreads = [
      { id: "t1", status: "done", due_at: "2026-07-01T00:00:00Z", description: "vieja", source_ref: "manifestation:m1" },
    ];
    const fromMock = vi
      .fn()
      .mockReturnValueOnce(chain({ data: manifestations, error: null }))
      .mockReturnValueOnce(chain({ data: existingThreads, error: null }));
    const supabase = { from: fromMock } as never;

    await syncCommitmentsFromManifestations(supabase, "u1");

    expect(fromMock).toHaveBeenCalledTimes(2);
  });

  it("actualiza due_at/description de un hilo open existente si la manifestación cambió", async () => {
    const manifestations = [{ id: "m1", intention: "Nueva intención", target_date: "2026-07-28" }];
    const existingThreads = [
      { id: "t1", status: "open", due_at: "2026-07-01T00:00:00Z", description: "vieja intención", source_ref: "manifestation:m1" },
    ];
    const captureUpdate: Record<string, unknown> = {};
    const fromMock = vi
      .fn()
      .mockReturnValueOnce(chain({ data: manifestations, error: null }))
      .mockReturnValueOnce(chain({ data: existingThreads, error: null }))
      .mockReturnValueOnce(chain({ error: null }, captureUpdate));
    const supabase = { from: fromMock } as never;

    await syncCommitmentsFromManifestations(supabase, "u1");

    expect(fromMock).toHaveBeenCalledTimes(3);
    const updated = captureUpdate.updated as { due_at: string; description: string };
    expect(updated.due_at).toBe("2026-07-28T00:00:00.000Z");
    expect(updated.description).toBe("Nueva intención");
    expect(captureUpdate.eqCalls).toEqual([["id", "t1"], ["user_id", "u1"]]);
  });

  it("no actualiza si due_at/description no cambiaron (evita el UPDATE de no-op)", async () => {
    const manifestations = [{ id: "m1", intention: "Misma intención", target_date: "2026-07-25" }];
    const existingThreads = [
      // Mismo instante, formato distinto ("+00:00" en vez de ".000Z"): no debe disparar update.
      { id: "t1", status: "open", due_at: "2026-07-25T00:00:00+00:00", description: "Misma intención", source_ref: "manifestation:m1" },
    ];
    const fromMock = vi
      .fn()
      .mockReturnValueOnce(chain({ data: manifestations, error: null }))
      .mockReturnValueOnce(chain({ data: existingThreads, error: null }));
    const supabase = { from: fromMock } as never;

    await syncCommitmentsFromManifestations(supabase, "u1");

    expect(fromMock).toHaveBeenCalledTimes(2); // sin insert ni update
  });

  it("best-effort: no lanza si el cliente explota", async () => {
    await expect(syncCommitmentsFromManifestations(throwingSupabase(), "u1")).resolves.toBeUndefined();
  });

  it("best-effort: no lanza si el select de manifestaciones devuelve error", async () => {
    const fromMock = vi.fn().mockReturnValueOnce(chain({ data: null, error: { message: "boom" } }));
    const supabase = { from: fromMock } as never;
    await expect(syncCommitmentsFromManifestations(supabase, "u1")).resolves.toBeUndefined();
  });
});

describe("fetchOpenCommitments", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-20T12:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("filtra por user_id + status=open, ventana due_at (o null) y ordena due_at asc con nulls al final", async () => {
    const capture: Record<string, unknown> = {};
    const rows = [
      {
        id: "t1",
        description: "Terminar el TFG",
        kind: "manifestation",
        status: "open",
        due_at: "2026-07-25T00:00:00Z",
        source_ref: "manifestation:m1",
        created_at: "2026-07-01T00:00:00Z",
      },
    ];
    const fromMock = vi.fn().mockReturnValueOnce(chain({ data: rows, error: null }, capture));
    const supabase = { from: fromMock } as never;

    const result = await fetchOpenCommitments(supabase, "u1", { withinDays: 21 });

    expect(fromMock).toHaveBeenCalledWith("memory_threads");
    expect(result).toEqual(rows);
    expect(capture.eqCalls).toEqual([["user_id", "u1"], ["status", "open"]]);
    expect(capture.orArgs).toEqual(["due_at.is.null,and(due_at.gte.2026-07-20,due_at.lte.2026-08-10)"]);
    expect(capture.orderArgs).toEqual(["due_at", { ascending: true, nullsFirst: false }]);
  });

  it("[] cuando la query devuelve error", async () => {
    const fromMock = vi.fn().mockReturnValueOnce(chain({ data: null, error: { message: "boom" } }));
    const supabase = { from: fromMock } as never;
    expect(await fetchOpenCommitments(supabase, "u1", { withinDays: 21 })).toEqual([]);
  });

  it("[] cuando data viene null sin error", async () => {
    const fromMock = vi.fn().mockReturnValueOnce(chain({ data: null, error: null }));
    const supabase = { from: fromMock } as never;
    expect(await fetchOpenCommitments(supabase, "u1", { withinDays: 21 })).toEqual([]);
  });

  it("best-effort: [] si el cliente explota", async () => {
    expect(await fetchOpenCommitments(throwingSupabase(), "u1", { withinDays: 21 })).toEqual([]);
  });
});

describe("dismissCommitment / completeCommitment", () => {
  it("dismiss: update status=dismissed acotado a id+user_id", async () => {
    const capture: Record<string, unknown> = {};
    const fromMock = vi.fn().mockReturnValueOnce(chain({ error: null }, capture));
    const supabase = { from: fromMock } as never;

    await dismissCommitment(supabase, "u1", "t1");

    expect(fromMock).toHaveBeenCalledWith("memory_threads");
    expect((capture.updated as { status: string }).status).toBe("dismissed");
    expect(capture.eqCalls).toEqual([["id", "t1"], ["user_id", "u1"]]);
  });

  it("complete: update status=done acotado a id+user_id", async () => {
    const capture: Record<string, unknown> = {};
    const fromMock = vi.fn().mockReturnValueOnce(chain({ error: null }, capture));
    const supabase = { from: fromMock } as never;

    await completeCommitment(supabase, "u1", "t1");

    expect((capture.updated as { status: string }).status).toBe("done");
    expect(capture.eqCalls).toEqual([["id", "t1"], ["user_id", "u1"]]);
  });

  it("best-effort: no lanza si el cliente explota (ni dismiss ni complete)", async () => {
    await expect(dismissCommitment(throwingSupabase(), "u1", "t1")).resolves.toBeUndefined();
    await expect(completeCommitment(throwingSupabase(), "u1", "t1")).resolves.toBeUndefined();
  });
});
