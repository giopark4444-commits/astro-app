import { describe, it, expect } from "vitest";
import { buildMemoryExport, formatMemoryExportMarkdown, MEMORY_EXPORT_VERSION } from "../memory-export";
import type { Memory } from "../memories";
import type { MemoryEntity } from "../memory-entities";
import type { Commitment } from "../memory-commitments";

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

function commitment(over: Partial<Commitment> & { description: string }): Commitment {
  return {
    id: over.id ?? `id-${over.description}`,
    description: over.description,
    kind: over.kind ?? "commitment",
    status: over.status ?? "open",
    due_at: over.due_at ?? null,
    source_ref: over.source_ref ?? null,
    created_at: over.created_at ?? "2026-07-01T00:00:00Z",
  };
}

describe("buildMemoryExport", () => {
  it("arma el payload versionado (v2) con memories, entities y commitments mapeados", () => {
    const memories = [memory({ content: "Vive en Quito", source: "chat", created_at: "2026-07-01T00:00:00Z" })];
    const entities = [
      entity({ name: "María", kind: "person", summary: "hermana", aliases: ["Mari"], pinned: true, created_at: "2026-07-02T00:00:00Z" }),
    ];
    const commitments = [
      commitment({
        description: "Llamar al banco",
        kind: "commitment",
        status: "open",
        due_at: "2026-08-01T00:00:00.000Z",
        source_ref: "manifestation:abc",
        created_at: "2026-07-03T00:00:00Z",
      }),
    ];
    const now = new Date("2026-07-19T12:00:00Z");
    const payload = buildMemoryExport(memories, entities, null, commitments, now);

    expect(payload).toEqual({
      version: MEMORY_EXPORT_VERSION,
      exportedAt: "2026-07-19T12:00:00.000Z",
      memories: [{ content: "Vive en Quito", source: "chat", created_at: "2026-07-01T00:00:00Z" }],
      entities: [
        { kind: "person", name: "María", summary: "hermana", aliases: ["Mari"], pinned: true, created_at: "2026-07-02T00:00:00Z" },
      ],
      commitments: [
        {
          description: "Llamar al banco",
          kind: "commitment",
          status: "open",
          due_at: "2026-08-01T00:00:00.000Z",
          source_ref: "manifestation:abc",
          created_at: "2026-07-03T00:00:00Z",
        },
      ],
    });
  });

  it("versión actual es 2", () => {
    const payload = buildMemoryExport([], [], null, [], new Date("2026-07-19T00:00:00Z"));
    expect(payload.version).toBe(2);
    expect(MEMORY_EXPORT_VERSION).toBe(2);
  });

  it("vacío cuando no hay memorias, entidades ni compromisos", () => {
    const payload = buildMemoryExport([], [], null, [], new Date("2026-07-19T00:00:00Z"));
    expect(payload.memories).toEqual([]);
    expect(payload.entities).toEqual([]);
    expect(payload.commitments).toEqual([]);
  });

  it("essence null u vacío/blanco NO aparece en el payload (queda undefined, no null)", () => {
    const payload1 = buildMemoryExport([], [], null, []);
    expect(payload1.essence).toBeUndefined();
    expect("essence" in payload1).toBe(false);

    const payload2 = buildMemoryExport([], [], "   ", []);
    expect(payload2.essence).toBeUndefined();
    expect("essence" in payload2).toBe(false);
  });

  it("essence con contenido se recorta y se incluye en el payload", () => {
    const payload = buildMemoryExport([], [], "  Vive con calma, cerca de su familia.  ", []);
    expect(payload.essence).toBe("Vive con calma, cerca de su familia.");
  });
});

describe("formatMemoryExportMarkdown", () => {
  it("documento en español: título, intro, Sobre ti, y grupos por kind", () => {
    const payload = buildMemoryExport(
      [memory({ content: "Vive en Quito" }), memory({ content: "Tiene dos gatos" })],
      [
        entity({ name: "María", kind: "person", summary: "hermana, en divorcio" }),
        entity({ name: "Luna", kind: "pet", summary: "" }),
      ],
      null,
      [],
    );
    const md = formatMemoryExportMarkdown(payload, "es");

    expect(md).toContain("# Lo que Aluna sabe de ti");
    expect(md).toContain("## Sobre ti");
    expect(md).toContain("- Vive en Quito");
    expect(md).toContain("- Tiene dos gatos");
    expect(md).toContain("## Personas");
    expect(md).toContain("- **María** — hermana, en divorcio");
    expect(md).toContain("## Mascotas");
    // sin summary: nombre solo, sin em dash colgante
    expect(md).toContain("- **Luna**");
    expect(md).not.toContain("**Luna** —");
  });

  it("documento en inglés usa los encabezados traducidos", () => {
    const payload = buildMemoryExport([], [entity({ name: "Rex", kind: "pet", summary: "perro" })], null, []);
    const md = formatMemoryExportMarkdown(payload, "en");
    expect(md).toContain("# What Aluna knows about you");
    expect(md).toContain("## About you");
    expect(md).toContain("## Pets");
    expect(md).toContain("- **Rex** — perro");
  });

  it("nota de vacío cuando no hay recuerdos, sin sección para kinds sin entidades", () => {
    const payload = buildMemoryExport([], [], null, []);
    const md = formatMemoryExportMarkdown(payload, "es");
    expect(md).toContain("(sin recuerdos todavía)");
    expect(md).not.toContain("## Personas");
    expect(md).not.toContain("## Mascotas");
  });

  it("agrupa varias entidades del mismo kind bajo un solo encabezado", () => {
    const payload = buildMemoryExport([], [entity({ name: "María", kind: "person" }), entity({ name: "Pedro", kind: "person" })], null, []);
    const md = formatMemoryExportMarkdown(payload, "es");
    expect(md.match(/## Personas/g)).toHaveLength(1);
    expect(md).toContain("- **María**");
    expect(md).toContain("- **Pedro**");
  });

  it("v2: incluye 'Tu esencia' con el retrato cuando hay uno (es)", () => {
    const payload = buildMemoryExport([], [], "Eres alguien que busca calma en medio del ruido.", []);
    const md = formatMemoryExportMarkdown(payload, "es");
    expect(md).toContain("## Tu esencia");
    expect(md).toContain("Eres alguien que busca calma en medio del ruido.");
  });

  it("v2: incluye 'Your essence' con el retrato cuando hay uno (en)", () => {
    const payload = buildMemoryExport([], [], "You seek calm amid the noise.", []);
    const md = formatMemoryExportMarkdown(payload, "en");
    expect(md).toContain("## Your essence");
    expect(md).toContain("You seek calm amid the noise.");
  });

  it("v2: omite la sección de esencia si no hay retrato", () => {
    const payload = buildMemoryExport([], [], null, []);
    const md = formatMemoryExportMarkdown(payload, "es");
    expect(md).not.toContain("## Tu esencia");
    const mdEn = formatMemoryExportMarkdown(payload, "en");
    expect(mdEn).not.toContain("## Your essence");
  });

  it("v2: incluye 'Compromisos' con descripción y fecha formateada cuando hay due_at (es)", () => {
    const payload = buildMemoryExport(
      [],
      [],
      null,
      [commitment({ description: "Llamar al banco", due_at: "2026-08-01T00:00:00.000Z" })],
    );
    const md = formatMemoryExportMarkdown(payload, "es");
    expect(md).toContain("## Compromisos");
    expect(md).toMatch(/- Llamar al banco — .*2026/);
  });

  it("v2: 'Commitments' sin fecha no deja em dash colgante (en)", () => {
    const payload = buildMemoryExport([], [], null, [commitment({ description: "Follow up with dentist", due_at: null })]);
    const md = formatMemoryExportMarkdown(payload, "en");
    expect(md).toContain("## Commitments");
    expect(md).toContain("- Follow up with dentist");
    expect(md).not.toContain("Follow up with dentist —");
  });

  it("v2: omite la sección de compromisos si no hay ninguno", () => {
    const payload = buildMemoryExport([], [], null, []);
    const md = formatMemoryExportMarkdown(payload, "es");
    expect(md).not.toContain("## Compromisos");
    const mdEn = formatMemoryExportMarkdown(payload, "en");
    expect(mdEn).not.toContain("## Commitments");
  });
});
