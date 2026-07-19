import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// authenticateRoute se mockea ANTES de importar la ruta (hoisting de vi.mock),
// mismo patrón que app/api/manifestations/__tests__/route.test.ts.
const authenticateRouteMock = vi.fn();
vi.mock("@/lib/supabase/route-auth", () => ({
  authenticateRoute: (...args: unknown[]) => authenticateRouteMock(...args),
}));

function chain(data: unknown) {
  const obj = {
    eq: () => obj,
    order: () => obj,
    limit: () => obj,
    then: (resolve: (v: { data: unknown; error: null }) => void) => resolve({ data, error: null }),
  };
  return obj;
}

let memoriesData: unknown[] = [];
let entitiesData: unknown[] = [];
const insertMemoriesMock = vi.fn((): Promise<{ error: { message: string } | null }> => Promise.resolve({ error: null }));
const insertEntitiesMock = vi.fn((): Promise<{ error: { message: string } | null }> => Promise.resolve({ error: null }));

const fromMock = vi.fn((table: string) => {
  if (table === "user_memories") return { select: () => chain(memoriesData), insert: insertMemoriesMock };
  if (table === "memory_entities") return { select: () => chain(entitiesData), insert: insertEntitiesMock };
  throw new Error(`unexpected table ${table}`);
});

import { POST } from "../route";

const USER_ID = "user-abc-123";

function fakeRequest(body: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest;
}

const VALID_PAYLOAD = {
  version: 1,
  exportedAt: "2026-07-01T00:00:00Z",
  memories: [
    { content: "Vive en Quito", source: "chat", created_at: "2026-07-01T00:00:00Z" },
    { content: "Tiene dos gatos", source: "chat", created_at: "2026-07-01T00:00:00Z" },
  ],
  entities: [{ kind: "person", name: "María", summary: "hermana", aliases: [], pinned: false, created_at: "2026-07-01T00:00:00Z" }],
};

describe("POST /api/memory/import", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    memoriesData = [{ id: "m1", content: "Vive en Quito", source: "chat", created_at: "2026-07-01T00:00:00Z" }];
    entitiesData = [];
    authenticateRouteMock.mockResolvedValue({ supabase: { from: fromMock }, user: { id: USER_ID } });
  });

  it("sin usuario → 401, no toca la BD", async () => {
    authenticateRouteMock.mockResolvedValue({ supabase: { from: fromMock }, user: null });
    const res = await POST(fakeRequest(VALID_PAYLOAD));
    expect(res.status).toBe(401);
    expect(insertMemoriesMock).not.toHaveBeenCalled();
  });

  it("JSON inválido en el body → 400", async () => {
    const badReq = { json: async () => { throw new Error("bad json"); } } as unknown as NextRequest;
    const res = await POST(badReq);
    expect(res.status).toBe(400);
  });

  it("payload sin version 1 → 400 invalid_payload", async () => {
    const res = await POST(fakeRequest({ memories: [], entities: [] }));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("invalid_payload");
    expect(insertMemoriesMock).not.toHaveBeenCalled();
  });

  it("éxito: inserta solo lo no duplicado, con user_id de la sesión, y devuelve conteos", async () => {
    const res = await POST(fakeRequest(VALID_PAYLOAD));
    expect(res.status).toBe(200);

    expect(insertMemoriesMock).toHaveBeenCalledTimes(1);
    const [memRows] = insertMemoriesMock.mock.calls[0] as unknown as [{ user_id: string; content: string }[]];
    expect(memRows).toEqual([{ user_id: USER_ID, content: "Tiene dos gatos", source: "chat" }]);

    expect(insertEntitiesMock).toHaveBeenCalledTimes(1);
    const [entRows] = insertEntitiesMock.mock.calls[0] as unknown as [{ user_id: string; name: string }[]];
    expect(entRows).toEqual([
      { user_id: USER_ID, kind: "person", name: "María", summary: "hermana", aliases: [], pinned: false, source: "import" },
    ]);

    const body = (await res.json()) as { imported: { memories: number; entities: number }; skipped: { memories: number; entities: number } };
    expect(body.imported).toEqual({ memories: 1, entities: 1 });
    expect(body.skipped).toEqual({ memories: 1, entities: 0 });
  });

  it("todo duplicado: no inserta nada, conteos en 0/skipped", async () => {
    entitiesData = [{ id: "e1", kind: "person", name: "maría", summary: "x", aliases: [], pinned: false, salience: 1, last_referenced_at: "", created_at: "" }];
    const res = await POST(
      fakeRequest({ version: 1, memories: [{ content: "Vive en Quito" }], entities: [{ kind: "person", name: "María" }] }),
    );
    expect(res.status).toBe(200);
    expect(insertMemoriesMock).not.toHaveBeenCalled();
    expect(insertEntitiesMock).not.toHaveBeenCalled();
    const body = (await res.json()) as { imported: { memories: number; entities: number }; skipped: { memories: number; entities: number } };
    expect(body.imported).toEqual({ memories: 0, entities: 0 });
    expect(body.skipped).toEqual({ memories: 1, entities: 1 });
  });

  it("error de BD al insertar → 500", async () => {
    insertMemoriesMock.mockResolvedValueOnce({ error: { message: "boom" } });
    const res = await POST(fakeRequest(VALID_PAYLOAD));
    expect(res.status).toBe(500);
  });
});
