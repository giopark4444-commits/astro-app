import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// authenticateRoute se mockea ANTES de importar la ruta (hoisting de vi.mock)
// para que route.ts reciba el doble, no el real — mismo patrón que
// app/api/manifestations/__tests__/route.test.ts.
const authenticateRouteMock = vi.fn();
vi.mock("@/lib/supabase/route-auth", () => ({
  authenticateRoute: (...args: unknown[]) => authenticateRouteMock(...args),
}));

// Chain mínimo que soporta .select().eq().neq().order()[.order()|.limit()] y
// se resuelve como thenable — cubre fetchMemories (…order().limit()),
// fetchEntities (…order().order()) y fetchCommitmentsForExport
// (…eq().neq().order()).
function chain(data: unknown) {
  const obj = {
    eq: () => obj,
    neq: () => obj,
    order: () => obj,
    limit: () => obj,
    then: (resolve: (v: { data: unknown; error: null }) => void) => resolve({ data, error: null }),
  };
  return obj;
}

let memoriesData: unknown[] = [];
let entitiesData: unknown[] = [];
let settingsRow: { language?: string } | null = null;
// v2 (Fase 2 T6): retrato + compromisos, por defecto "nada todavía" para que
// los tests v1 (memories/entities/markdown) sigan pasando sin tocarlos.
let essenceRow: { portrait: string | null } | null = null;
let commitmentsData: unknown[] = [];

const settingsMaybeSingleMock = vi.fn(() => Promise.resolve({ data: settingsRow, error: null }));
const essenceMaybeSingleMock = vi.fn(() => Promise.resolve({ data: essenceRow, error: null }));

const fromMock = vi.fn((table: string) => {
  if (table === "user_memories") return { select: () => chain(memoriesData) };
  if (table === "memory_entities") return { select: () => chain(entitiesData) };
  if (table === "settings") return { select: () => ({ eq: () => ({ maybeSingle: settingsMaybeSingleMock }) }) };
  if (table === "memory_essence") return { select: () => ({ eq: () => ({ maybeSingle: essenceMaybeSingleMock }) }) };
  if (table === "memory_threads") return { select: () => chain(commitmentsData) };
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
    essenceRow = null;
    commitmentsData = [];
    authenticateRouteMock.mockResolvedValue({ supabase: { from: fromMock }, user: { id: USER_ID } });
  });

  it("sin usuario → 401", async () => {
    authenticateRouteMock.mockResolvedValue({ supabase: { from: fromMock }, user: null });
    const res = await GET(fakeRequest("http://localhost/api/memory/export"));
    expect(res.status).toBe(401);
  });

  it("format=json por defecto: arma el payload (v2) y los headers de descarga", async () => {
    const res = await GET(fakeRequest("http://localhost/api/memory/export"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(res.headers.get("content-disposition")).toContain('filename="aluna-memoria.json"');
    const body = (await res.json()) as { version: number; memories: unknown[]; entities: unknown[]; commitments: unknown[] };
    expect(body.version).toBe(2);
    expect(body.memories).toEqual([{ content: "Vive en Quito", source: "chat", created_at: "2026-07-01T00:00:00Z" }]);
    expect(body.entities).toEqual([
      { kind: "person", name: "María", summary: "hermana", aliases: [], pinned: false, created_at: "2026-07-01T00:00:00Z" },
    ]);
    expect(body.commitments).toEqual([]);
    expect("essence" in body).toBe(false);
  });

  it("v2: sin esencia todavía, el campo 'essence' no aparece en el JSON", async () => {
    essenceRow = null;
    const res = await GET(fakeRequest("http://localhost/api/memory/export"));
    const body = (await res.json()) as Record<string, unknown>;
    expect("essence" in body).toBe(false);
  });

  it("v2: con esencia guardada, el JSON la incluye", async () => {
    essenceRow = { portrait: "Eres alguien que busca calma en medio del ruido." };
    const res = await GET(fakeRequest("http://localhost/api/memory/export"));
    const body = (await res.json()) as { essence?: string };
    expect(body.essence).toBe("Eres alguien que busca calma en medio del ruido.");
  });

  it("v2: incluye los compromisos ya leídos, mapeados al formato exportable", async () => {
    commitmentsData = [
      {
        id: "t1",
        description: "Llamar al banco",
        kind: "commitment",
        status: "open",
        due_at: "2026-08-01T00:00:00.000Z",
        source_ref: null,
        created_at: "2026-07-05T00:00:00Z",
      },
    ];
    const res = await GET(fakeRequest("http://localhost/api/memory/export"));
    const body = (await res.json()) as { commitments: unknown[] };
    expect(body.commitments).toEqual([
      {
        description: "Llamar al banco",
        kind: "commitment",
        status: "open",
        due_at: "2026-08-01T00:00:00.000Z",
        source_ref: null,
        created_at: "2026-07-05T00:00:00Z",
      },
    ]);
  });

  it("format=md: incluye 'Tu esencia' y 'Compromisos' cuando hay datos", async () => {
    essenceRow = { portrait: "Eres alguien que busca calma en medio del ruido." };
    commitmentsData = [
      {
        id: "t1",
        description: "Llamar al banco",
        kind: "commitment",
        status: "open",
        due_at: null,
        source_ref: null,
        created_at: "2026-07-05T00:00:00Z",
      },
    ];
    const res = await GET(fakeRequest("http://localhost/api/memory/export?format=md"));
    const text = await res.text();
    expect(text).toContain("## Tu esencia");
    expect(text).toContain("Eres alguien que busca calma en medio del ruido.");
    expect(text).toContain("## Compromisos");
    expect(text).toContain("- Llamar al banco");
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
