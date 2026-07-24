import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const authenticateRouteMock = vi.fn();
vi.mock("@/lib/supabase/route-auth", () => ({
  authenticateRoute: (...args: unknown[]) => authenticateRouteMock(...args),
}));

const listThreadsMock = vi.fn();
vi.mock("@/lib/chat-archive", () => ({
  listThreads: (...args: unknown[]) => listThreadsMock(...args),
}));

import { GET } from "../route";

function fakeRequest(): NextRequest {
  return {} as unknown as NextRequest;
}

const USER_ID = "user-abc-123";

describe("GET /api/chat/threads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sin usuario → 401, no llama a listThreads", async () => {
    authenticateRouteMock.mockResolvedValue({ supabase: {}, user: null });

    const res = await GET(fakeRequest());

    expect(res.status).toBe(401);
    expect(listThreadsMock).not.toHaveBeenCalled();
  });

  it("con usuario: devuelve { threads } de listThreads, acotado a su user.id", async () => {
    authenticateRouteMock.mockResolvedValue({ supabase: { marker: "sb" }, user: { id: USER_ID } });
    const threads = [
      { id: "t1", surface: "tarot", profileId: "p1", pinned: true, createdAt: "2026-07-01T00:00:00Z", lastMessageAt: "2026-07-02T00:00:00Z", preview: "¿qué salió?" },
    ];
    listThreadsMock.mockResolvedValue(threads);

    const res = await GET(fakeRequest());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ threads });
    expect(listThreadsMock).toHaveBeenCalledWith(expect.objectContaining({ marker: "sb" }), USER_ID);
  });

  it("biblioteca vacía: devuelve { threads: [] }, no 404 ni error", async () => {
    authenticateRouteMock.mockResolvedValue({ supabase: {}, user: { id: USER_ID } });
    listThreadsMock.mockResolvedValue([]);

    const res = await GET(fakeRequest());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ threads: [] });
  });
});
