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
    not: () => obj,
    order: () => obj,
    limit: () => obj,
    then: (resolve: (v: { data: unknown; error: null }) => void) => resolve({ data, error: null }),
  };
  return obj;
}

let memoriesData: unknown[] = [];
let entitiesData: unknown[] = [];
// v2 (Fase 2 T6): source_refs ya existentes en memory_threads, para el dedupe
// de dedupeCommitments — por defecto vacío (ningún compromiso previo).
let existingThreadRefs: unknown[] = [];
const insertMemoriesMock = vi.fn((): Promise<{ error: { message: string } | null }> => Promise.resolve({ error: null }));
const insertEntitiesMock = vi.fn((): Promise<{ error: { message: string } | null }> => Promise.resolve({ error: null }));
const upsertEssenceMock = vi.fn((): Promise<{ error: { message: string } | null }> => Promise.resolve({ error: null }));
const insertCommitmentsMock = vi.fn((): Promise<{ error: { message: string } | null }> => Promise.resolve({ error: null }));

const fromMock = vi.fn((table: string) => {
  if (table === "user_memories") return { select: () => chain(memoriesData), insert: insertMemoriesMock };
  if (table === "memory_entities") return { select: () => chain(entitiesData), insert: insertEntitiesMock };
  if (table === "memory_essence") return { upsert: upsertEssenceMock };
  if (table === "memory_threads") return { select: () => chain(existingThreadRefs), insert: insertCommitmentsMock };
  throw new Error(`unexpected table ${table}`);
});

import { POST } from "../route";

const USER_ID = "user-abc-123";

// La ruta ahora lee `request.text()` + headers (Content-Length), no
// `request.json()` (review Fable: tope de tamaño antes/después de parsear).
function fakeRequest(body: unknown, opts: { contentLength?: string } = {}): NextRequest {
  const text = JSON.stringify(body);
  return {
    headers: { get: (name: string) => (name.toLowerCase() === "content-length" ? (opts.contentLength ?? String(text.length)) : null) },
    text: async () => text,
  } as unknown as NextRequest;
}

function fakeRawRequest(text: string, opts: { contentLength?: string } = {}): NextRequest {
  return {
    headers: { get: (name: string) => (name.toLowerCase() === "content-length" ? (opts.contentLength ?? String(text.length)) : null) },
    text: async () => text,
  } as unknown as NextRequest;
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
    existingThreadRefs = [];
    authenticateRouteMock.mockResolvedValue({ supabase: { from: fromMock }, user: { id: USER_ID } });
  });

  it("sin usuario → 401, no toca la BD ni siquiera lee el body", async () => {
    authenticateRouteMock.mockResolvedValue({ supabase: { from: fromMock }, user: null });
    const textMock = vi.fn(async () => JSON.stringify(VALID_PAYLOAD));
    const req = { headers: { get: () => null }, text: textMock } as unknown as NextRequest;
    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(insertMemoriesMock).not.toHaveBeenCalled();
    expect(textMock).not.toHaveBeenCalled(); // auth corre ANTES de tocar el body
  });

  it("JSON inválido en el body → 400", async () => {
    const res = await POST(fakeRawRequest("{not json"));
    expect(res.status).toBe(400);
  });

  it("Content-Length > 1MB → 413, no llega a leer el body", async () => {
    const textMock = vi.fn(async () => JSON.stringify(VALID_PAYLOAD));
    const req = { headers: { get: (n: string) => (n.toLowerCase() === "content-length" ? "2000000" : null) }, text: textMock } as unknown as NextRequest;
    const res = await POST(req);
    expect(res.status).toBe(413);
    expect(textMock).not.toHaveBeenCalled();
  });

  it("sin Content-Length pero el texto leído supera 1MB → 413 (defensa en profundidad)", async () => {
    const hugeContent = "x".repeat(1_100_000);
    const res = await POST(fakeRawRequest(hugeContent, { contentLength: "" }));
    expect(res.status).toBe(413);
    expect(insertMemoriesMock).not.toHaveBeenCalled();
  });

  it("más de 500 memorias o 1000 entidades en el body: se truncan al tope, no se rechaza el import", async () => {
    memoriesData = [];
    entitiesData = [];
    const bigPayload = {
      version: 1,
      memories: Array.from({ length: 600 }, (_, i) => ({ content: `memoria ${i}` })),
      entities: Array.from({ length: 1200 }, (_, i) => ({ kind: "person", name: `persona ${i}` })),
    };
    const res = await POST(fakeRequest(bigPayload));
    expect(res.status).toBe(200);
    const [memRows] = insertMemoriesMock.mock.calls[0] as unknown as [unknown[]];
    const [entRows] = insertEntitiesMock.mock.calls[0] as unknown as [unknown[]];
    expect(memRows).toHaveLength(500);
    expect(entRows).toHaveLength(1000);
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

    const body = (await res.json()) as {
      imported: { memories: number; entities: number; commitments: number };
      skipped: { memories: number; entities: number; commitments: number };
    };
    expect(body.imported).toEqual({ memories: 1, entities: 1, commitments: 0 });
    expect(body.skipped).toEqual({ memories: 1, entities: 0, commitments: 0 });
    // v1 (VALID_PAYLOAD no trae essence/commitments): ni memory_essence ni
    // memory_threads se tocan — retrocompat exacta con el comportamiento previo a T6.
    expect(upsertEssenceMock).not.toHaveBeenCalled();
    expect(insertCommitmentsMock).not.toHaveBeenCalled();
  });

  it("todo duplicado: no inserta nada, conteos en 0/skipped", async () => {
    entitiesData = [{ id: "e1", kind: "person", name: "maría", summary: "x", aliases: [], pinned: false, salience: 1, last_referenced_at: "", created_at: "" }];
    const res = await POST(
      fakeRequest({ version: 1, memories: [{ content: "Vive en Quito" }], entities: [{ kind: "person", name: "María" }] }),
    );
    expect(res.status).toBe(200);
    expect(insertMemoriesMock).not.toHaveBeenCalled();
    expect(insertEntitiesMock).not.toHaveBeenCalled();
    const body = (await res.json()) as {
      imported: { memories: number; entities: number; commitments: number };
      skipped: { memories: number; entities: number; commitments: number };
    };
    expect(body.imported).toEqual({ memories: 0, entities: 0, commitments: 0 });
    expect(body.skipped).toEqual({ memories: 1, entities: 1, commitments: 0 });
  });

  it("error de BD al insertar → 500", async () => {
    insertMemoriesMock.mockResolvedValueOnce({ error: { message: "boom" } });
    const res = await POST(fakeRequest(VALID_PAYLOAD));
    expect(res.status).toBe(500);
  });

  // --- v2 (Fase 2 T6): essence + commitments ---

  it("v2: essence presente hace upsert en memory_essence (status idle, user_id de la sesión)", async () => {
    const res = await POST(
      fakeRequest({ version: 2, memories: [], entities: [], essence: "Un retrato cálido y compacto." }),
    );
    expect(res.status).toBe(200);
    expect(upsertEssenceMock).toHaveBeenCalledTimes(1);
    const [row, opts] = upsertEssenceMock.mock.calls[0] as unknown as [
      { user_id: string; portrait: string; status: string },
      { onConflict: string },
    ];
    expect(row).toMatchObject({ user_id: USER_ID, portrait: "Un retrato cálido y compacto.", status: "idle" });
    expect(opts).toEqual({ onConflict: "user_id" });
  });

  it("v2: commitments se insertan en memory_threads, deduplicados por source_ref existente", async () => {
    existingThreadRefs = [{ source_ref: "manifestation:existing" }];
    const res = await POST(
      fakeRequest({
        version: 2,
        memories: [],
        entities: [],
        commitments: [
          { description: "Ya existe", kind: "manifestation", status: "open", due_at: null, source_ref: "manifestation:existing" },
          { description: "Nuevo", kind: "commitment", status: "open", due_at: null, source_ref: null },
        ],
      }),
    );
    expect(res.status).toBe(200);
    expect(insertCommitmentsMock).toHaveBeenCalledTimes(1);
    const [rows] = insertCommitmentsMock.mock.calls[0] as unknown as [
      { user_id: string; description: string; source_ref: string | null }[],
    ];
    expect(rows).toEqual([
      { user_id: USER_ID, description: "Nuevo", kind: "commitment", status: "open", due_at: null, source_ref: null },
    ]);

    const body = (await res.json()) as { imported: { commitments: number }; skipped: { commitments: number } };
    expect(body.imported.commitments).toBe(1);
    expect(body.skipped.commitments).toBe(1);
  });

  it("v2: status 'dismissed' en el body nunca llega a insertarse (lo descarta validateImportPayload)", async () => {
    const res = await POST(
      fakeRequest({
        version: 2,
        memories: [],
        entities: [],
        commitments: [{ description: "No debería resucitar", kind: "commitment", status: "dismissed" }],
      }),
    );
    expect(res.status).toBe(200);
    expect(insertCommitmentsMock).not.toHaveBeenCalled();
    const body = (await res.json()) as { imported: { commitments: number } };
    expect(body.imported.commitments).toBe(0);
  });
});
