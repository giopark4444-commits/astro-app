import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const authenticateRouteMock = vi.fn();
vi.mock("@/lib/supabase/route-auth", () => ({
  authenticateRoute: (...args: unknown[]) => authenticateRouteMock(...args),
}));

const fetchThreadMessagesMock = vi.fn();
const setThreadPinnedMock = vi.fn();
const deleteThreadMock = vi.fn();
vi.mock("@/lib/chat-archive", () => ({
  fetchThreadMessages: (...args: unknown[]) => fetchThreadMessagesMock(...args),
  setThreadPinned: (...args: unknown[]) => setThreadPinnedMock(...args),
  deleteThread: (...args: unknown[]) => deleteThreadMock(...args),
}));

import { GET, PATCH, DELETE } from "../route";

const USER_ID = "user-abc-123";
const THREAD_ID = "thread-1";

function fakeRequest(body?: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest;
}

function ctx() {
  return { params: Promise.resolve({ id: THREAD_ID }) };
}

describe("GET /api/chat/threads/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sin usuario → 401, no llama a fetchThreadMessages", async () => {
    authenticateRouteMock.mockResolvedValue({ supabase: {}, user: null });

    const res = await GET(fakeRequest(), ctx());

    expect(res.status).toBe(401);
    expect(fetchThreadMessagesMock).not.toHaveBeenCalled();
  });

  it("hilo existente: devuelve el detalle tal cual, acotado al hilo y al usuario", async () => {
    authenticateRouteMock.mockResolvedValue({ supabase: { marker: "sb" }, user: { id: USER_ID } });
    const detail = { id: THREAD_ID, surface: "tarot", pinned: false, messages: [{ id: "m1", role: "user", content: "hola", created_at: "2026-07-01T00:00:00Z" }] };
    fetchThreadMessagesMock.mockResolvedValue(detail);

    const res = await GET(fakeRequest(), ctx());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(detail);
    expect(fetchThreadMessagesMock).toHaveBeenCalledWith(expect.objectContaining({ marker: "sb" }), USER_ID, THREAD_ID);
  });

  it("hilo inexistente/ajeno: 404", async () => {
    authenticateRouteMock.mockResolvedValue({ supabase: {}, user: { id: USER_ID } });
    fetchThreadMessagesMock.mockResolvedValue(null);

    const res = await GET(fakeRequest(), ctx());

    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/chat/threads/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sin usuario → 401, no llama a setThreadPinned", async () => {
    authenticateRouteMock.mockResolvedValue({ supabase: {}, user: null });

    const res = await PATCH(fakeRequest({ pinned: true }), ctx());

    expect(res.status).toBe(401);
    expect(setThreadPinnedMock).not.toHaveBeenCalled();
  });

  it("{pinned:true}: llama a setThreadPinned y devuelve {ok:true}", async () => {
    authenticateRouteMock.mockResolvedValue({ supabase: { marker: "sb" }, user: { id: USER_ID } });
    setThreadPinnedMock.mockResolvedValue(true);

    const res = await PATCH(fakeRequest({ pinned: true }), ctx());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(setThreadPinnedMock).toHaveBeenCalledWith(expect.objectContaining({ marker: "sb" }), USER_ID, THREAD_ID, true);
  });

  it("{pinned:false}: también válido (desfijar)", async () => {
    authenticateRouteMock.mockResolvedValue({ supabase: {}, user: { id: USER_ID } });
    setThreadPinnedMock.mockResolvedValue(true);

    const res = await PATCH(fakeRequest({ pinned: false }), ctx());

    expect(res.status).toBe(200);
    expect(setThreadPinnedMock).toHaveBeenCalledWith(expect.anything(), USER_ID, THREAD_ID, false);
  });

  it("body sin `pinned` booleano → 400, no llama a setThreadPinned", async () => {
    authenticateRouteMock.mockResolvedValue({ supabase: {}, user: { id: USER_ID } });

    const res = await PATCH(fakeRequest({ pinned: "sí" }), ctx());

    expect(res.status).toBe(400);
    expect(setThreadPinnedMock).not.toHaveBeenCalled();
  });

  it("JSON inválido → 400", async () => {
    authenticateRouteMock.mockResolvedValue({ supabase: {}, user: { id: USER_ID } });
    const badRequest = { json: async () => { throw new Error("bad json"); } } as unknown as NextRequest;

    const res = await PATCH(badRequest, ctx());

    expect(res.status).toBe(400);
  });

  it("setThreadPinned falla → 500", async () => {
    authenticateRouteMock.mockResolvedValue({ supabase: {}, user: { id: USER_ID } });
    setThreadPinnedMock.mockResolvedValue(false);

    const res = await PATCH(fakeRequest({ pinned: true }), ctx());

    expect(res.status).toBe(500);
  });
});

describe("DELETE /api/chat/threads/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sin usuario → 401, no llama a deleteThread", async () => {
    authenticateRouteMock.mockResolvedValue({ supabase: {}, user: null });

    const res = await DELETE(fakeRequest(), ctx());

    expect(res.status).toBe(401);
    expect(deleteThreadMock).not.toHaveBeenCalled();
  });

  it("borra el hilo acotado al usuario y devuelve {ok:true}", async () => {
    authenticateRouteMock.mockResolvedValue({ supabase: { marker: "sb" }, user: { id: USER_ID } });
    deleteThreadMock.mockResolvedValue(true);

    const res = await DELETE(fakeRequest(), ctx());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(deleteThreadMock).toHaveBeenCalledWith(expect.objectContaining({ marker: "sb" }), USER_ID, THREAD_ID);
  });

  it("deleteThread falla → 500", async () => {
    authenticateRouteMock.mockResolvedValue({ supabase: {}, user: { id: USER_ID } });
    deleteThreadMock.mockResolvedValue(false);

    const res = await DELETE(fakeRequest(), ctx());

    expect(res.status).toBe(500);
  });
});
