import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const authenticateRouteMock = vi.fn();
vi.mock("@/lib/supabase/route-auth", () => ({
  authenticateRoute: (...args: unknown[]) => authenticateRouteMock(...args),
}));

const fetchRecentThreadMock = vi.fn();
vi.mock("@/lib/chat-archive", () => ({
  fetchRecentThread: (...args: unknown[]) => fetchRecentThreadMock(...args),
}));

function chain(result: { data?: unknown; error?: unknown }) {
  const obj: Record<string, unknown> = {
    select: () => obj,
    eq: () => obj,
    maybeSingle: () => Promise.resolve(result),
  };
  return obj;
}

import { GET } from "../route";

function fakeRequest(): NextRequest {
  return {} as unknown as NextRequest;
}

const USER_ID = "user-abc-123";

describe("GET /api/chat/thread", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sin usuario → 401, no llama a fetchRecentThread", async () => {
    authenticateRouteMock.mockResolvedValue({ supabase: { from: vi.fn() }, user: null });
    const res = await GET(fakeRequest());
    expect(res.status).toBe(401);
    expect(fetchRecentThreadMock).not.toHaveBeenCalled();
  });

  it("memory_enabled=false: no retoma el hilo aunque exista (gate del review Fable)", async () => {
    const fromMock = vi.fn().mockReturnValue(chain({ data: { memory_enabled: false }, error: null }));
    authenticateRouteMock.mockResolvedValue({ supabase: { from: fromMock }, user: { id: USER_ID } });

    const res = await GET(fakeRequest());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ threadId: null, messages: [] });
    expect(fetchRecentThreadMock).not.toHaveBeenCalled();
  });

  it("memory_enabled=true: retoma el hilo normalmente", async () => {
    const fromMock = vi.fn().mockReturnValue(chain({ data: { memory_enabled: true }, error: null }));
    authenticateRouteMock.mockResolvedValue({ supabase: { from: fromMock }, user: { id: USER_ID } });
    fetchRecentThreadMock.mockResolvedValue({
      threadId: "thread-1",
      messages: [{ id: "m1", role: "user", content: "hola", created_at: "2026-07-01T00:00:00Z" }],
    });

    const res = await GET(fakeRequest());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ threadId: "thread-1", messages: [{ role: "user", content: "hola" }] });
    expect(fetchRecentThreadMock).toHaveBeenCalledWith(expect.anything(), USER_ID, "chat");
  });

  it("sin fila settings (usuario nuevo): degrada a memoria ON, retoma normalmente", async () => {
    const fromMock = vi.fn().mockReturnValue(chain({ data: null, error: null }));
    authenticateRouteMock.mockResolvedValue({ supabase: { from: fromMock }, user: { id: USER_ID } });
    fetchRecentThreadMock.mockResolvedValue(null);

    const res = await GET(fakeRequest());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ threadId: null, messages: [] });
    expect(fetchRecentThreadMock).toHaveBeenCalledTimes(1); // sí llegó a intentarlo (gate ON)
  });

  it("columna memory_enabled sin migrar (el select explota): degrada a memoria ON, retoma normalmente", async () => {
    const fromMock = vi.fn(() => {
      throw new Error("column settings.memory_enabled does not exist");
    });
    authenticateRouteMock.mockResolvedValue({ supabase: { from: fromMock }, user: { id: USER_ID } });
    fetchRecentThreadMock.mockResolvedValue({ threadId: "thread-1", messages: [] });

    const res = await GET(fakeRequest());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ threadId: "thread-1", messages: [] });
    expect(fetchRecentThreadMock).toHaveBeenCalledTimes(1);
  });
});
