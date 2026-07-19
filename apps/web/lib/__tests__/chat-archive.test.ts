import { describe, it, expect, vi } from "vitest";
import { ensureThread, appendMessage, fetchRecentThread } from "../chat-archive";

// Fake supabase mínimo, mismo espíritu que memories.test.ts: cada chain
// devuelve un objeto que es TANTO encadenable (select/eq/order/limit/
// insert/update devuelven `this`) COMO thenable (resuelve `result` sin
// pasar por maybeSingle, para los awaits directos sobre insert()/update()/
// order()) y también expone `.maybeSingle()` para los que sí lo usan.
// `capture` registra lo que se le pasó a insert/update para poder afirmar
// sobre el row exacto que chat-archive.ts arma.
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
    order: (...args: unknown[]) => {
      capture.orderArgs = args;
      return obj;
    },
    limit: (...args: unknown[]) => {
      capture.limitArgs = args;
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
    maybeSingle: () => Promise.resolve(result),
    then: (resolve: (v: typeof result) => void) => resolve(result),
  };
  return obj;
}

describe("ensureThread", () => {
  it("sin threadId: crea un hilo nuevo y devuelve su id", async () => {
    const captureInsert: Record<string, unknown> = {};
    const fromMock = vi.fn().mockReturnValueOnce(chain({ error: null }, captureInsert));
    const supabase = { from: fromMock } as never;

    const id = await ensureThread(supabase, "u1", "chat", "profile-1");

    expect(fromMock).toHaveBeenCalledTimes(1);
    expect(fromMock).toHaveBeenCalledWith("chat_threads");
    expect(typeof id).toBe("string");
    expect(id).not.toBe("");
    expect(captureInsert.inserted).toEqual({ id, user_id: "u1", surface: "chat", profile_id: "profile-1" });
  });

  it("sin threadId ni profileId: profile_id queda null", async () => {
    const captureInsert: Record<string, unknown> = {};
    const fromMock = vi.fn().mockReturnValueOnce(chain({ error: null }, captureInsert));
    const supabase = { from: fromMock } as never;

    await ensureThread(supabase, "u1", "tarot");

    expect((captureInsert.inserted as { profile_id: unknown }).profile_id).toBeNull();
  });

  it("threadId existente y del usuario: lo devuelve tal cual, sin crear uno nuevo", async () => {
    const captureSelect: Record<string, unknown> = {};
    const fromMock = vi.fn().mockReturnValueOnce(chain({ data: { id: "thread-1" }, error: null }, captureSelect));
    const supabase = { from: fromMock } as never;

    const id = await ensureThread(supabase, "u1", "chat", "profile-1", "thread-1");

    expect(id).toBe("thread-1");
    expect(fromMock).toHaveBeenCalledTimes(1); // solo el select, ningún insert
    expect(captureSelect.eqCalls).toEqual([["id", "thread-1"], ["user_id", "u1"]]);
  });

  it("threadId ajeno/inexistente (select sin fila): crea uno nuevo en su lugar", async () => {
    const captureSelect: Record<string, unknown> = {};
    const captureInsert: Record<string, unknown> = {};
    const fromMock = vi
      .fn()
      .mockReturnValueOnce(chain({ data: null, error: null }, captureSelect))
      .mockReturnValueOnce(chain({ error: null }, captureInsert));
    const supabase = { from: fromMock } as never;

    const id = await ensureThread(supabase, "u1", "chat", "profile-1", "thread-ajeno");

    expect(fromMock).toHaveBeenCalledTimes(2);
    expect(typeof id).toBe("string");
    expect(id).not.toBe("thread-ajeno");
    expect((captureInsert.inserted as { id: string }).id).toBe(id);
  });

  it("best-effort: devuelve null si la BD explota", async () => {
    const fromMock = vi.fn(() => {
      throw new Error("boom");
    });
    const supabase = { from: fromMock } as never;

    await expect(ensureThread(supabase, "u1", "chat")).resolves.toBeNull();
  });

  it("best-effort: devuelve null si el insert falla", async () => {
    const fromMock = vi.fn().mockReturnValueOnce(chain({ error: { message: "boom" } }));
    const supabase = { from: fromMock } as never;

    await expect(ensureThread(supabase, "u1", "chat")).resolves.toBeNull();
  });
});

describe("appendMessage", () => {
  it("no guarda mensajes vacíos (tras trim)", async () => {
    const fromMock = vi.fn();
    const supabase = { from: fromMock } as never;

    await appendMessage(supabase, "u1", "thread-1", "user", "   ");

    expect(fromMock).not.toHaveBeenCalled();
  });

  it("inserta el mensaje y actualiza last_message_at/updated_at del hilo", async () => {
    const captureInsert: Record<string, unknown> = {};
    const captureUpdate: Record<string, unknown> = {};
    const fromMock = vi
      .fn()
      .mockReturnValueOnce(chain({ error: null }, captureInsert))
      .mockReturnValueOnce(chain({ data: null, error: null }, captureUpdate));
    const supabase = { from: fromMock } as never;

    await appendMessage(supabase, "u1", "thread-1", "assistant", "Tu luna habla de tu mundo emocional.");

    expect(fromMock).toHaveBeenNthCalledWith(1, "chat_messages");
    expect(captureInsert.inserted).toEqual({
      thread_id: "thread-1",
      user_id: "u1",
      role: "assistant",
      content: "Tu luna habla de tu mundo emocional.",
    });

    expect(fromMock).toHaveBeenNthCalledWith(2, "chat_threads");
    const updated = captureUpdate.updated as { last_message_at: string; updated_at: string };
    expect(updated.last_message_at).toBe(updated.updated_at);
    expect(new Date(updated.last_message_at).toISOString()).toBe(updated.last_message_at);
    expect(captureUpdate.eqCalls).toEqual([["id", "thread-1"], ["user_id", "u1"]]);
  });

  it("best-effort: si el insert del mensaje falla, no toca el hilo", async () => {
    const fromMock = vi.fn().mockReturnValueOnce(chain({ error: { message: "boom" } }));
    const supabase = { from: fromMock } as never;

    await appendMessage(supabase, "u1", "thread-1", "user", "hola");

    expect(fromMock).toHaveBeenCalledTimes(1); // solo el insert, nunca el update
  });

  it("best-effort: no lanza si la BD explota", async () => {
    const fromMock = vi.fn(() => {
      throw new Error("boom");
    });
    const supabase = { from: fromMock } as never;

    await expect(appendMessage(supabase, "u1", "thread-1", "user", "hola")).resolves.toBeUndefined();
  });
});

describe("fetchRecentThread", () => {
  it("arma { threadId, messages } del hilo más reciente de la superficie", async () => {
    const messages = [
      { id: "m1", role: "user", content: "¿qué significa mi luna?", created_at: "2026-07-01T00:00:00Z" },
      { id: "m2", role: "assistant", content: "Tu luna habla de tu mundo emocional.", created_at: "2026-07-01T00:01:00Z" },
    ];
    const captureThreadSelect: Record<string, unknown> = {};
    const fromMock = vi
      .fn()
      .mockReturnValueOnce(chain({ data: { id: "thread-1" }, error: null }, captureThreadSelect))
      .mockReturnValueOnce(chain({ data: messages, error: null }));
    const supabase = { from: fromMock } as never;

    const recent = await fetchRecentThread(supabase, "u1", "chat");

    expect(recent).toEqual({ threadId: "thread-1", messages });
    expect(fromMock).toHaveBeenNthCalledWith(1, "chat_threads");
    expect(fromMock).toHaveBeenNthCalledWith(2, "chat_messages");
    expect(captureThreadSelect.eqCalls).toEqual([["user_id", "u1"], ["surface", "chat"]]);
  });

  it("null si no hay ningún hilo para esa superficie", async () => {
    const fromMock = vi.fn().mockReturnValueOnce(chain({ data: null, error: null }));
    const supabase = { from: fromMock } as never;

    const recent = await fetchRecentThread(supabase, "u1", "timeline");

    expect(recent).toBeNull();
    expect(fromMock).toHaveBeenCalledTimes(1); // no llega a pedir mensajes
  });

  it("messages nulo del select se normaliza a []", async () => {
    const fromMock = vi
      .fn()
      .mockReturnValueOnce(chain({ data: { id: "thread-1" }, error: null }))
      .mockReturnValueOnce(chain({ data: null, error: null }));
    const supabase = { from: fromMock } as never;

    const recent = await fetchRecentThread(supabase, "u1", "chat");

    expect(recent).toEqual({ threadId: "thread-1", messages: [] });
  });

  it("best-effort: null si la BD explota", async () => {
    const fromMock = vi.fn(() => {
      throw new Error("boom");
    });
    const supabase = { from: fromMock } as never;

    await expect(fetchRecentThread(supabase, "u1", "chat")).resolves.toBeNull();
  });
});
