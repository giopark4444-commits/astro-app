import { describe, it, expect, vi } from "vitest";
import {
  ensureThread,
  appendMessage,
  fetchRecentThread,
  listThreads,
  setThreadPinned,
  deleteThread,
  fetchThreadMessages,
} from "../chat-archive";

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
    delete: () => {
      capture.deleted = true;
      return obj;
    },
    in: (...args: unknown[]) => {
      capture.inArgs = args;
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
    expect(captureInsert.inserted).toEqual({ id, user_id: "u1", surface: "chat", profile_id: "profile-1", lens: null });
  });

  it("con lens: se guarda en el hilo nuevo (0023, etiqueta de la biblioteca)", async () => {
    const captureInsert: Record<string, unknown> = {};
    const fromMock = vi.fn().mockReturnValueOnce(chain({ error: null }, captureInsert));
    const supabase = { from: fromMock } as never;

    await ensureThread(supabase, "u1", "tarot", "profile-1", null, "tarot");

    expect((captureInsert.inserted as { lens: unknown }).lens).toBe("tarot");
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
  it("arma { threadId, messages } del hilo más reciente, pidiendo la COLA (desc+limit) y devolviéndola en orden cronológico", async () => {
    // Orden cronológico (lo que la UI espera de vuelta): m1 antes que m2.
    const messages = [
      { id: "m1", role: "user", content: "¿qué significa mi luna?", created_at: "2026-07-01T00:00:00Z" },
      { id: "m2", role: "assistant", content: "Tu luna habla de tu mundo emocional.", created_at: "2026-07-01T00:01:00Z" },
    ];
    const captureThreadSelect: Record<string, unknown> = {};
    const captureMessagesSelect: Record<string, unknown> = {};
    const fromMock = vi
      .fn()
      .mockReturnValueOnce(chain({ data: { id: "thread-1" }, error: null }, captureThreadSelect))
      // La query real pide desc+limit (la COLA); el mock simula esa forma.
      .mockReturnValueOnce(chain({ data: [...messages].reverse(), error: null }, captureMessagesSelect));
    const supabase = { from: fromMock } as never;

    const recent = await fetchRecentThread(supabase, "u1", "chat");

    expect(recent).toEqual({ threadId: "thread-1", messages });
    expect(fromMock).toHaveBeenNthCalledWith(1, "chat_threads");
    expect(fromMock).toHaveBeenNthCalledWith(2, "chat_messages");
    expect(captureThreadSelect.eqCalls).toEqual([["user_id", "u1"], ["surface", "chat"]]);
    expect(captureMessagesSelect.orderArgs).toEqual(["created_at", { ascending: false }]);
    expect(captureMessagesSelect.limitArgs).toEqual([50]);
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

describe("listThreads", () => {
  it("arma la lista con fijados primero (query) y la vista previa del primer mensaje de usuario por hilo, en un solo .in()", async () => {
    const threads = [
      { id: "t-pinned", surface: "tarot", lens: "tarot", profile_id: "p1", pinned: true, created_at: "2026-07-01T00:00:00Z", last_message_at: "2026-07-02T00:00:00Z" },
      { id: "t-recent", surface: "chat", lens: "astros", profile_id: null, pinned: false, created_at: "2026-07-03T00:00:00Z", last_message_at: "2026-07-04T00:00:00Z" },
    ];
    // Varios mensajes de usuario por hilo, en orden cronológico: solo el
    // PRIMERO de cada thread_id debe ganar como preview.
    const firstMessages = [
      { thread_id: "t-pinned", content: "¿Qué significa El Mago invertido?", created_at: "2026-07-01T00:00:01Z" },
      { thread_id: "t-pinned", content: "segundo mensaje, no debe ganar", created_at: "2026-07-01T00:05:00Z" },
      { thread_id: "t-recent", content: "¿Cómo está mi energía hoy?", created_at: "2026-07-03T00:00:01Z" },
    ];
    const captureThreadsSelect: Record<string, unknown> = {};
    const captureMessagesSelect: Record<string, unknown> = {};
    const fromMock = vi
      .fn()
      .mockReturnValueOnce(chain({ data: threads, error: null }, captureThreadsSelect))
      .mockReturnValueOnce(chain({ data: firstMessages, error: null }, captureMessagesSelect));
    const supabase = { from: fromMock } as never;

    const result = await listThreads(supabase, "u1");

    expect(fromMock).toHaveBeenNthCalledWith(1, "chat_threads");
    expect(fromMock).toHaveBeenNthCalledWith(2, "chat_messages");
    expect(captureThreadsSelect.eqCalls).toEqual([["user_id", "u1"]]);
    expect(captureMessagesSelect.inArgs).toEqual(["thread_id", ["t-pinned", "t-recent"]]);
    expect(captureMessagesSelect.eqCalls).toEqual([["role", "user"]]);
    expect(result).toEqual([
      {
        id: "t-pinned", surface: "tarot", lens: "tarot", profileId: "p1", pinned: true,
        createdAt: "2026-07-01T00:00:00Z", lastMessageAt: "2026-07-02T00:00:00Z",
        preview: "¿Qué significa El Mago invertido?",
      },
      {
        id: "t-recent", surface: "chat", lens: "astros", profileId: null, pinned: false,
        createdAt: "2026-07-03T00:00:00Z", lastMessageAt: "2026-07-04T00:00:00Z",
        preview: "¿Cómo está mi energía hoy?",
      },
    ]);
  });

  it("hilo sin lens (conversación general, sin lente encendida): lens queda null", async () => {
    const threads = [{ id: "t1", surface: "chat", lens: null, profile_id: null, pinned: false, created_at: "2026-07-01T00:00:00Z", last_message_at: "2026-07-01T00:00:00Z" }];
    const fromMock = vi
      .fn()
      .mockReturnValueOnce(chain({ data: threads, error: null }))
      .mockReturnValueOnce(chain({ data: [], error: null }));
    const supabase = { from: fromMock } as never;

    const result = await listThreads(supabase, "u1");

    expect(result[0]!.lens).toBeNull();
  });

  it("sin hilos: devuelve [] sin pedir mensajes (evita el .in() con lista vacía)", async () => {
    const fromMock = vi.fn().mockReturnValueOnce(chain({ data: [], error: null }));
    const supabase = { from: fromMock } as never;

    const result = await listThreads(supabase, "u1");

    expect(result).toEqual([]);
    expect(fromMock).toHaveBeenCalledTimes(1);
  });

  it("un hilo sin ningún mensaje de usuario (p.ej. turno-0 invisible sin respuesta real): preview vacía, no revienta", async () => {
    const threads = [{ id: "t1", surface: "timeline", profile_id: null, pinned: false, created_at: "2026-07-01T00:00:00Z", last_message_at: "2026-07-01T00:00:00Z" }];
    const fromMock = vi
      .fn()
      .mockReturnValueOnce(chain({ data: threads, error: null }))
      .mockReturnValueOnce(chain({ data: [], error: null }));
    const supabase = { from: fromMock } as never;

    const result = await listThreads(supabase, "u1");

    expect(result[0]!.preview).toBe("");
  });

  it("best-effort: [] si la BD explota", async () => {
    const fromMock = vi.fn(() => {
      throw new Error("boom");
    });
    const supabase = { from: fromMock } as never;

    await expect(listThreads(supabase, "u1")).resolves.toEqual([]);
  });
});

describe("setThreadPinned", () => {
  it("actualiza pinned + updated_at, acotado al hilo y al dueño", async () => {
    const capture: Record<string, unknown> = {};
    const fromMock = vi.fn().mockReturnValueOnce(chain({ error: null }, capture));
    const supabase = { from: fromMock } as never;

    const ok = await setThreadPinned(supabase, "u1", "thread-1", true);

    expect(ok).toBe(true);
    expect(fromMock).toHaveBeenCalledWith("chat_threads");
    const updated = capture.updated as { pinned: boolean; updated_at: string };
    expect(updated.pinned).toBe(true);
    expect(new Date(updated.updated_at).toISOString()).toBe(updated.updated_at);
    expect(capture.eqCalls).toEqual([["id", "thread-1"], ["user_id", "u1"]]);
  });

  it("best-effort: false si el update falla", async () => {
    const fromMock = vi.fn().mockReturnValueOnce(chain({ error: { message: "boom" } }));
    const supabase = { from: fromMock } as never;

    await expect(setThreadPinned(supabase, "u1", "thread-1", false)).resolves.toBe(false);
  });

  it("best-effort: false si la BD explota", async () => {
    const fromMock = vi.fn(() => {
      throw new Error("boom");
    });
    const supabase = { from: fromMock } as never;

    await expect(setThreadPinned(supabase, "u1", "thread-1", true)).resolves.toBe(false);
  });
});

describe("deleteThread", () => {
  it("borra el hilo acotado al dueño (los mensajes se van solos por FK cascade)", async () => {
    const capture: Record<string, unknown> = {};
    const fromMock = vi.fn().mockReturnValueOnce(chain({ error: null }, capture));
    const supabase = { from: fromMock } as never;

    const ok = await deleteThread(supabase, "u1", "thread-1");

    expect(ok).toBe(true);
    expect(fromMock).toHaveBeenCalledWith("chat_threads");
    expect(capture.deleted).toBe(true);
    expect(capture.eqCalls).toEqual([["id", "thread-1"], ["user_id", "u1"]]);
  });

  it("best-effort: false si el delete falla", async () => {
    const fromMock = vi.fn().mockReturnValueOnce(chain({ error: { message: "boom" } }));
    const supabase = { from: fromMock } as never;

    await expect(deleteThread(supabase, "u1", "thread-1")).resolves.toBe(false);
  });

  it("best-effort: false si la BD explota", async () => {
    const fromMock = vi.fn(() => {
      throw new Error("boom");
    });
    const supabase = { from: fromMock } as never;

    await expect(deleteThread(supabase, "u1", "thread-1")).resolves.toBe(false);
  });
});

describe("fetchThreadMessages", () => {
  it("arma { id, surface, pinned, messages } del hilo elegido, pidiendo la COLA (desc+limit) y devolviéndola en orden cronológico", async () => {
    const messages = [
      { id: "m1", role: "user", content: "¿qué salió en la tirada?", created_at: "2026-07-01T00:00:00Z" },
      { id: "m2", role: "assistant", content: "El Mago invertido en el pasado…", created_at: "2026-07-01T00:01:00Z" },
    ];
    const captureThreadSelect: Record<string, unknown> = {};
    const captureMessagesSelect: Record<string, unknown> = {};
    const fromMock = vi
      .fn()
      .mockReturnValueOnce(chain({ data: { id: "thread-1", surface: "tarot", lens: "tarot", pinned: true }, error: null }, captureThreadSelect))
      .mockReturnValueOnce(chain({ data: [...messages].reverse(), error: null }, captureMessagesSelect));
    const supabase = { from: fromMock } as never;

    const detail = await fetchThreadMessages(supabase, "u1", "thread-1");

    expect(detail).toEqual({ id: "thread-1", surface: "tarot", lens: "tarot", pinned: true, messages });
    expect(fromMock).toHaveBeenNthCalledWith(1, "chat_threads");
    expect(fromMock).toHaveBeenNthCalledWith(2, "chat_messages");
    expect(captureThreadSelect.eqCalls).toEqual([["id", "thread-1"], ["user_id", "u1"]]);
    expect(captureMessagesSelect.orderArgs).toEqual(["created_at", { ascending: false }]);
    expect(captureMessagesSelect.limitArgs).toEqual([200]);
  });

  it("null si el hilo no existe o no es del usuario", async () => {
    const fromMock = vi.fn().mockReturnValueOnce(chain({ data: null, error: null }));
    const supabase = { from: fromMock } as never;

    await expect(fetchThreadMessages(supabase, "u1", "ajeno")).resolves.toBeNull();
    expect(fromMock).toHaveBeenCalledTimes(1); // no llega a pedir mensajes
  });

  it("best-effort: null si la BD explota", async () => {
    const fromMock = vi.fn(() => {
      throw new Error("boom");
    });
    const supabase = { from: fromMock } as never;

    await expect(fetchThreadMessages(supabase, "u1", "thread-1")).resolves.toBeNull();
  });
});
