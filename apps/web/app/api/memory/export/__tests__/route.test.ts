import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// authenticateRoute se mockea ANTES de importar la ruta (hoisting de vi.mock)
// para que route.ts reciba el doble, no el real — mismo patrón que
// app/api/manifestations/__tests__/route.test.ts.
const authenticateRouteMock = vi.fn();
vi.mock("@/lib/supabase/route-auth", () => ({
  authenticateRoute: (...args: unknown[]) => authenticateRouteMock(...args),
}));

// Chain mínimo que soporta .select().eq().order()[.order()|.limit()] y se
// resuelve como thenable — cubre tanto fetchMemories (…order().limit()) como
// fetchEntities (…order().order()).
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
let settingsRow: { language?: string } | null = null;

const settingsMaybeSingleMock = vi.fn(() => Promise.resolve({ data: settingsRow, error: null }));

const fromMock = vi.fn((table: string) => {
  if (table === "user_memories") return { select: () => chain(memoriesData) };
  if (table === "memory_entities") return { select: () => chain(entitiesData) };
  if (table === "settings") return { select: () => ({ eq: () => ({ maybeSingle: settingsMaybeSingleMock }) }) };
  throw new Error(`unexpected table ${table}`);
});

import { GET } from "../route";

const USER_ID = "user-abc-123";

function fakeRequest(url: string): NextRequest {
  return { nextUrl: new URL(url, "http://localhost") } as unknown as NextRequest;
}

describe("GET /api/memory/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    memoriesData = [{ id: "m1", content: "Vive en Quito", source: "chat", created_at: "2026-07-01T00:00:00Z" }];
    entitiesData = [
      {
        id: "e1",
        kind: "person",
        name: "María",
        summary: "hermana",
        aliases: [],
        pinned: false,
        salience: 1,
        last_referenced_at: "2026-07-01T00:00:00Z",
        created_at: "2026-07-01T00:00:00Z",
      },
    ];
    settingsRow = { language: "es" };
    authenticateRouteMock.mockResolvedValue({ supabase: { from: fromMock }, user: { id: USER_ID } });
  });

  it("sin usuario → 401", async () => {
    authenticateRouteMock.mockResolvedValue({ supabase: { from: fromMock }, user: null });
    const res = await GET(fakeRequest("http://localhost/api/memory/export"));
    expect(res.status).toBe(401);
  });

  it("format=json por defecto: arma el payload y los headers de descarga", async () => {
    const res = await GET(fakeRequest("http://localhost/api/memory/export"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(res.headers.get("content-disposition")).toContain('filename="aluna-memoria.json"');
    const body = (await res.json()) as { version: number; memories: unknown[]; entities: unknown[] };
    expect(body.version).toBe(1);
    expect(body.memories).toEqual([{ content: "Vive en Quito", source: "chat", created_at: "2026-07-01T00:00:00Z" }]);
    expect(body.entities).toEqual([
      { kind: "person", name: "María", summary: "hermana", aliases: [], pinned: false, created_at: "2026-07-01T00:00:00Z" },
    ]);
  });

  it("format=md: markdown con Content-Type de texto y el nombre de sección esperado", async () => {
    const res = await GET(fakeRequest("http://localhost/api/memory/export?format=md"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/markdown");
    expect(res.headers.get("content-disposition")).toContain('filename="aluna-memoria.md"');
    const text = await res.text();
    expect(text).toContain("# Lo que Aluna sabe de ti");
    expect(text).toContain("- Vive en Quito");
    expect(text).toContain("## Personas");
  });

  it("format=md respeta settings.language = en", async () => {
    settingsRow = { language: "en" };
    const res = await GET(fakeRequest("http://localhost/api/memory/export?format=md"));
    const text = await res.text();
    expect(text).toContain("# What Aluna knows about you");
  });

  it("format=md sin fila de settings (fallo o tabla sin migrar) cae a español", async () => {
    settingsMaybeSingleMock.mockRejectedValueOnce(new Error("boom"));
    const res = await GET(fakeRequest("http://localhost/api/memory/export?format=md"));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("# Lo que Aluna sabe de ti");
  });

  it("fallo inesperado → 500", async () => {
    authenticateRouteMock.mockRejectedValue(new Error("boom"));
    const res = await GET(fakeRequest("http://localhost/api/memory/export"));
    expect(res.status).toBe(500);
  });
});
