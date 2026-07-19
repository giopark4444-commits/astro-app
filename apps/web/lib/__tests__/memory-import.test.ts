import { describe, it, expect } from "vitest";
import { validateImportPayload, dedupeMemories, dedupeEntities } from "../memory-import";
import type { Memory } from "../memories";
import type { MemoryEntity } from "../memory-entities";

function memory(over: Partial<Memory> & { content: string }): Memory {
  return {
    id: over.id ?? `id-${over.content}`,
    content: over.content,
    source: over.source ?? "chat",
    created_at: over.created_at ?? "2026-07-01T00:00:00Z",
  };
}

function entity(over: Partial<MemoryEntity> & { name: string }): MemoryEntity {
  return {
    id: over.id ?? `id-${over.name}`,
    kind: over.kind ?? "person",
    name: over.name,
    summary: over.summary ?? "",
    aliases: over.aliases ?? [],
    pinned: over.pinned ?? false,
    salience: over.salience ?? 0,
    last_referenced_at: over.last_referenced_at ?? "2026-07-01T00:00:00Z",
    created_at: over.created_at ?? "2026-07-01T00:00:00Z",
  };
}

describe("validateImportPayload", () => {
  it("null si no es objeto", () => {
    expect(validateImportPayload(null)).toBeNull();
    expect(validateImportPayload("nope")).toBeNull();
    expect(validateImportPayload(42)).toBeNull();
  });

  it("null si version no es 1", () => {
    expect(validateImportPayload({ version: 2, memories: [], entities: [] })).toBeNull();
    expect(validateImportPayload({ memories: [], entities: [] })).toBeNull();
  });

  it("null si memories o entities no son arrays", () => {
    expect(validateImportPayload({ version: 1, memories: "x", entities: [] })).toBeNull();
    expect(validateImportPayload({ version: 1, memories: [], entities: null })).toBeNull();
  });

  it("JSON exportado limpio pasa entero", () => {
    const parsed = validateImportPayload({
      version: 1,
      exportedAt: "2026-07-01T00:00:00Z",
      memories: [{ content: "Vive en Quito", source: "chat", created_at: "2026-07-01T00:00:00Z" }],
      entities: [{ kind: "person", name: "María", summary: "hermana", aliases: ["Mari"], pinned: true, created_at: "2026-07-01T00:00:00Z" }],
    });
    expect(parsed).toEqual({
      memories: [{ content: "Vive en Quito", source: "chat" }],
      entities: [{ kind: "person", name: "María", summary: "hermana", aliases: ["Mari"], pinned: true }],
    });
  });

  it("descarta memorias sin content string, conserva las válidas", () => {
    const parsed = validateImportPayload({
      version: 1,
      memories: [{ content: 42 }, { content: "  " }, { content: "Vive en Quito" }, "basura"],
      entities: [],
    });
    expect(parsed?.memories).toEqual([{ content: "Vive en Quito", source: "import" }]);
  });

  it("recorta content a 280 y summary a 2000, name a 120", () => {
    const parsed = validateImportPayload({
      version: 1,
      memories: [{ content: "x".repeat(300) }],
      entities: [{ kind: "person", name: "n".repeat(130), summary: "s".repeat(2100) }],
    });
    expect(parsed?.memories[0]?.content.length).toBe(280);
    expect(parsed?.entities[0]?.name.length).toBe(120);
    expect(parsed?.entities[0]?.summary.length).toBe(2000);
  });

  it("descarta entidades con kind inválido o name vacío", () => {
    const parsed = validateImportPayload({
      version: 1,
      memories: [],
      entities: [
        { kind: "alien", name: "X" },
        { kind: "person", name: "  " },
        { kind: "person", name: "Válida" },
      ],
    });
    expect(parsed?.entities).toEqual([{ kind: "person", name: "Válida", summary: "", aliases: [], pinned: false }]);
  });

  it("aliases: filtra no-strings y dedupea case-insensitive dentro de la propia entidad", () => {
    const parsed = validateImportPayload({
      version: 1,
      memories: [],
      entities: [{ kind: "pet", name: "Luna", aliases: ["Lu", "lu", 7, "  "] }],
    });
    expect(parsed?.entities[0]?.aliases).toEqual(["Lu"]);
  });

  it("pinned solo es true si viene exactamente true", () => {
    const parsed = validateImportPayload({
      version: 1,
      memories: [],
      entities: [
        { kind: "person", name: "A", pinned: true },
        { kind: "person", name: "B", pinned: "true" },
        { kind: "person", name: "C" },
      ],
    });
    expect(parsed?.entities.map((e) => e.pinned)).toEqual([true, false, false]);
  });
});

describe("dedupeMemories", () => {
  it("descarta lo que ya existe (case-insensitive)", () => {
    const existing = [memory({ content: "Vive en Quito" })];
    const incoming = [{ content: "vive en quito", source: "import" }, { content: "Tiene dos gatos", source: "import" }];
    const { toInsert, skipped } = dedupeMemories(incoming, existing);
    expect(toInsert).toEqual([{ content: "Tiene dos gatos", source: "import" }]);
    expect(skipped).toBe(1);
  });

  it("dedupea dentro del propio lote entrante", () => {
    const incoming = [{ content: "Vive en Quito", source: "import" }, { content: "vive en quito", source: "import" }];
    const { toInsert, skipped } = dedupeMemories(incoming, []);
    expect(toInsert).toEqual([{ content: "Vive en Quito", source: "import" }]);
    expect(skipped).toBe(1);
  });

  it("nada existente y nada repetido: todo entra", () => {
    const incoming = [{ content: "A", source: "import" }, { content: "B", source: "import" }];
    const { toInsert, skipped } = dedupeMemories(incoming, []);
    expect(toInsert).toEqual(incoming);
    expect(skipped).toBe(0);
  });
});

describe("dedupeEntities", () => {
  it("descarta por (kind, nombre) case-insensitive contra lo existente", () => {
    const existing = [entity({ name: "María", kind: "person" })];
    const incoming = [
      { kind: "person" as const, name: "maría", summary: "x", aliases: [], pinned: false },
      { kind: "pet" as const, name: "María", summary: "x", aliases: [], pinned: false }, // mismo nombre, otro kind: no es duplicado
    ];
    const { toInsert, skipped } = dedupeEntities(incoming, existing);
    expect(toInsert).toEqual([{ kind: "pet", name: "María", summary: "x", aliases: [], pinned: false }]);
    expect(skipped).toBe(1);
  });

  it("dedupea dentro del propio lote entrante", () => {
    const incoming = [
      { kind: "person" as const, name: "Pedro", summary: "a", aliases: [], pinned: false },
      { kind: "person" as const, name: "pedro", summary: "b", aliases: [], pinned: false },
    ];
    const { toInsert, skipped } = dedupeEntities(incoming, []);
    expect(toInsert).toEqual([{ kind: "person", name: "Pedro", summary: "a", aliases: [], pinned: false }]);
    expect(skipped).toBe(1);
  });
});
