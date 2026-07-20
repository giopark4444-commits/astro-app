import { describe, it, expect } from "vitest";
import { validateImportPayload, dedupeMemories, dedupeEntities, dedupeCommitments } from "../memory-import";
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

  it("null si version no es 1 ni 2", () => {
    expect(validateImportPayload({ version: 3, memories: [], entities: [] })).toBeNull();
    expect(validateImportPayload({ version: 0, memories: [], entities: [] })).toBeNull();
    expect(validateImportPayload({ memories: [], entities: [] })).toBeNull();
  });

  it("version 2 (v2, esencia+compromisos) es válida", () => {
    const parsed = validateImportPayload({ version: 2, memories: [], entities: [] });
    expect(parsed).not.toBeNull();
  });

  it("null si memories o entities no son arrays", () => {
    expect(validateImportPayload({ version: 1, memories: "x", entities: [] })).toBeNull();
    expect(validateImportPayload({ version: 1, memories: [], entities: null })).toBeNull();
  });

  it("JSON exportado limpio (v1) pasa entero — retrocompat: essence null, commitments []", () => {
    const parsed = validateImportPayload({
      version: 1,
      exportedAt: "2026-07-01T00:00:00Z",
      memories: [{ content: "Vive en Quito", source: "chat", created_at: "2026-07-01T00:00:00Z" }],
      entities: [{ kind: "person", name: "María", summary: "hermana", aliases: ["Mari"], pinned: true, created_at: "2026-07-01T00:00:00Z" }],
    });
    expect(parsed).toEqual({
      memories: [{ content: "Vive en Quito", source: "chat" }],
      entities: [{ kind: "person", name: "María", summary: "hermana", aliases: ["Mari"], pinned: true }],
      essence: null,
      commitments: [],
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

  // --- v2: essence (Fase 2 T6) ---

  it("essence: string no vacío se recorta a 4000 y se conserva", () => {
    const parsed = validateImportPayload({ version: 2, memories: [], entities: [], essence: "  Un retrato cálido.  " });
    expect(parsed?.essence).toBe("Un retrato cálido.");

    const long = validateImportPayload({ version: 2, memories: [], entities: [], essence: "x".repeat(5000) });
    expect(long?.essence?.length).toBe(4000);
  });

  it("essence: ausente, vacío/blanco o no-string quedan en null sin invalidar el resto", () => {
    expect(validateImportPayload({ version: 2, memories: [], entities: [] })?.essence).toBeNull();
    expect(validateImportPayload({ version: 2, memories: [], entities: [], essence: "" })?.essence).toBeNull();
    expect(validateImportPayload({ version: 2, memories: [], entities: [], essence: "   " })?.essence).toBeNull();
    expect(validateImportPayload({ version: 2, memories: [], entities: [], essence: 42 })?.essence).toBeNull();
  });

  // --- v2: commitments (Fase 2 T6) ---

  it("commitments: item válido pasa entero con due_at/source_ref saneados", () => {
    const parsed = validateImportPayload({
      version: 2,
      memories: [],
      entities: [],
      commitments: [
        {
          description: "Llamar al banco",
          kind: "commitment",
          status: "open",
          due_at: "2026-08-01T00:00:00.000Z",
          source_ref: "manifestation:abc-123",
        },
      ],
    });
    expect(parsed?.commitments).toEqual([
      {
        description: "Llamar al banco",
        kind: "commitment",
        status: "open",
        due_at: "2026-08-01T00:00:00.000Z",
        source_ref: "manifestation:abc-123",
      },
    ]);
  });

  it("commitments: ausente o no-array queda en [] sin invalidar el resto (retrocompat v1)", () => {
    expect(validateImportPayload({ version: 1, memories: [], entities: [] })?.commitments).toEqual([]);
    expect(validateImportPayload({ version: 2, memories: [], entities: [], commitments: "nope" })?.commitments).toEqual([]);
  });

  it("commitments: descarta status 'dismissed' o cualquier valor fuera de open/done — nunca resucita", () => {
    const parsed = validateImportPayload({
      version: 2,
      memories: [],
      entities: [],
      commitments: [
        { description: "Descartado", kind: "commitment", status: "dismissed" },
        { description: "Basura", kind: "commitment", status: "algo-raro" },
        { description: "Vigente", kind: "commitment", status: "open" },
        { description: "Cumplido", kind: "commitment", status: "done" },
      ],
    });
    expect(parsed?.commitments.map((c) => c.description)).toEqual(["Vigente", "Cumplido"]);
  });

  it("commitments: descarta kind fuera del enum y description vacía/no-string", () => {
    const parsed = validateImportPayload({
      version: 2,
      memories: [],
      entities: [],
      commitments: [
        { description: "X", kind: "alien", status: "open" },
        { description: "   ", kind: "commitment", status: "open" },
        { description: 42, kind: "commitment", status: "open" },
        { description: "Válido", kind: "manifestation", status: "open" },
      ],
    });
    expect(parsed?.commitments).toEqual([
      { description: "Válido", kind: "manifestation", status: "open", due_at: null, source_ref: null },
    ]);
  });

  it("commitments: due_at inválido sanea a null sin descartar el ítem; source_ref no-string sanea a null", () => {
    const parsed = validateImportPayload({
      version: 2,
      memories: [],
      entities: [],
      commitments: [{ description: "Sin fecha válida", kind: "other", status: "open", due_at: "no-es-fecha", source_ref: 7 }],
    });
    expect(parsed?.commitments).toEqual([
      { description: "Sin fecha válida", kind: "other", status: "open", due_at: null, source_ref: null },
    ]);
  });

  it("commitments: recorta description a 500 y colapsa whitespace interno", () => {
    const parsed = validateImportPayload({
      version: 2,
      memories: [],
      entities: [],
      commitments: [{ description: `algo  con\nsaltos ${"x".repeat(600)}`, kind: "commitment", status: "open" }],
    });
    expect(parsed?.commitments[0]?.description.length).toBe(500);
    expect(parsed?.commitments[0]?.description).not.toMatch(/\s{2,}/);
  });

  it("commitments: tope de 500 trunca el resto del array (no error)", () => {
    const many = Array.from({ length: 510 }, (_, i) => ({ description: `C${i}`, kind: "commitment", status: "open" }));
    const parsed = validateImportPayload({ version: 2, memories: [], entities: [], commitments: many });
    expect(parsed?.commitments).toHaveLength(500);
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

describe("dedupeCommitments", () => {
  function importedCommitment(over: Partial<{ description: string; kind: string; status: string; due_at: string | null; source_ref: string | null }>) {
    return {
      description: over.description ?? "Compromiso",
      kind: (over.kind ?? "commitment") as "commitment",
      status: (over.status ?? "open") as "open",
      due_at: over.due_at ?? null,
      source_ref: over.source_ref ?? null,
    };
  }

  it("descarta por source_ref ya existente en la BD", () => {
    const incoming = [importedCommitment({ description: "Ya está", source_ref: "manifestation:abc" })];
    const { toInsert, skipped } = dedupeCommitments(incoming, new Set(["manifestation:abc"]));
    expect(toInsert).toEqual([]);
    expect(skipped).toBe(1);
  });

  it("dedupea por source_ref repetido dentro del propio lote entrante", () => {
    const incoming = [
      importedCommitment({ description: "Primero", source_ref: "manifestation:xyz" }),
      importedCommitment({ description: "Repetido", source_ref: "manifestation:xyz" }),
    ];
    const { toInsert, skipped } = dedupeCommitments(incoming, new Set());
    expect(toInsert).toEqual([importedCommitment({ description: "Primero", source_ref: "manifestation:xyz" })]);
    expect(skipped).toBe(1);
  });

  it("los compromisos sin source_ref siempre pasan, incluso repetidos entre sí", () => {
    const incoming = [
      importedCommitment({ description: "Manual uno", source_ref: null }),
      importedCommitment({ description: "Manual uno", source_ref: null }),
    ];
    const { toInsert, skipped } = dedupeCommitments(incoming, new Set());
    expect(toInsert).toHaveLength(2);
    expect(skipped).toBe(0);
  });

  it("nada existente y source_ref nuevo: todo entra", () => {
    const incoming = [importedCommitment({ description: "Nuevo", source_ref: "manifestation:new" })];
    const { toInsert, skipped } = dedupeCommitments(incoming, new Set(["manifestation:otro"]));
    expect(toInsert).toEqual(incoming);
    expect(skipped).toBe(0);
  });
});
