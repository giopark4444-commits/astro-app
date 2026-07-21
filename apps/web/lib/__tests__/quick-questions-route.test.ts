import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";
import { DEFAULT_QUICK_QUESTIONS } from "../quick-questions";

const authenticateRouteMock = vi.fn();
vi.mock("@/lib/supabase/route-auth", () => ({
  authenticateRoute: (...args: unknown[]) => authenticateRouteMock(...args),
}));

function chain(result: { data?: unknown; error?: unknown }) {
  const obj: Record<string, unknown> = {
    select: () => obj,
    eq: () => obj,
    maybeSingle: () => Promise.resolve(result),
  };
  return obj;
}

import { GET } from "../../app/api/quick-questions/route";

function req(url = "http://localhost/api/quick-questions?locale=es"): NextRequest {
  return { nextUrl: new URL(url) } as unknown as NextRequest;
}

describe("GET /api/quick-questions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sin usuario → 401", async () => {
    authenticateRouteMock.mockResolvedValue({ supabase: { from: vi.fn() }, user: null });
    const res = await GET(req());
    expect(res.status).toBe(401);
  });

  it("sin valor guardado → defaults del locale", async () => {
    const fromMock = vi.fn().mockReturnValue(chain({ data: { quick_questions: null }, error: null }));
    authenticateRouteMock.mockResolvedValue({ supabase: { from: fromMock }, user: { id: "u1" } });
    const res = await GET(req());
    const body = (await res.json()) as { pages: string[][] };
    expect(body.pages).toEqual(DEFAULT_QUICK_QUESTIONS.es);
  });

  it("valor guardado → se devuelve normalizado", async () => {
    const saved = {
      pages: [
        ["a1", "a2", "a3", "a4", "a5", "a6"],
        ["b1", "b2", "b3", "b4", "b5", "b6"],
      ],
    };
    const fromMock = vi.fn().mockReturnValue(chain({ data: { quick_questions: saved }, error: null }));
    authenticateRouteMock.mockResolvedValue({ supabase: { from: fromMock }, user: { id: "u1" } });
    const res = await GET(req());
    const body = (await res.json()) as { pages: string[][] };
    expect(body.pages).toEqual(saved.pages);
  });

  it("fila/columna sin migrar (el select explota): degrada a defaults", async () => {
    const fromMock = vi.fn(() => {
      throw new Error("column settings.quick_questions does not exist");
    });
    authenticateRouteMock.mockResolvedValue({ supabase: { from: fromMock }, user: { id: "u1" } });
    const res = await GET(req());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { pages: string[][] };
    expect(body.pages).toEqual(DEFAULT_QUICK_QUESTIONS.es);
  });

  it("locale en → defaults en inglés", async () => {
    const fromMock = vi.fn().mockReturnValue(chain({ data: { quick_questions: null }, error: null }));
    authenticateRouteMock.mockResolvedValue({ supabase: { from: fromMock }, user: { id: "u1" } });
    const res = await GET(req("http://localhost/api/quick-questions?locale=en"));
    const body = (await res.json()) as { pages: string[][] };
    expect(body.pages).toEqual(DEFAULT_QUICK_QUESTIONS.en);
  });
});
