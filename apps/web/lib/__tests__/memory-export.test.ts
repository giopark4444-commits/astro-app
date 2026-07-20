import { describe, it, expect } from "vitest";
import { buildMemoryExport, formatMemoryExportMarkdown, MEMORY_EXPORT_VERSION } from "../memory-export";
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

describe("buildMemoryExport", () => {
  it("arma el payload versionado con memories y entities mapeadas", () => {
    const memories = [memory({ content: "Vive en Quito", source: "chat", created_at: "2026-07-01T00:00:00Z" })];
    const entities = [
      entity({ name: "María", kind: "person", summary: "hermana", aliases: ["Mari"], pinned: true, created_at: "2026-07-02T00:00:00Z" }),
    ];
    const now = new Date("2026-07-19T12:00:00Z");
    const payload = buildMemoryExport(memories, entities, now);

    expect(payload).toEqual({
      version: MEMORY_EXPORT_VERSION,
      exportedAt: "2026-07-19T12:00:00.000Z",
      memories: [{ content: "Vive en Quito", source: "chat", created_at: "2026-07-01T00:00:00Z" }],
      entities: [
        { kind: "person", name: "María", summary: "hermana", aliases: ["Mari"], pinned: true, created_at: "2026-07-02T00:00:00Z" },
      ],
    });
  });

  it("vacío cuando no hay memorias ni entidades", () => {
    const payload = buildMemoryExport([], [], new Date("2026-07-19T00:00:00Z"));
    expect(payload.memories).toEqual([]);
    expect(payload.entities).toEqual([]);
    expect(payload.version).toBe(1);
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
    const payload = buildMemoryExport([], [entity({ name: "Rex", kind: "pet", summary: "perro" })]);
    const md = formatMemoryExportMarkdown(payload, "en");
    expect(md).toContain("# What Aluna knows about you");
    expect(md).toContain("## About you");
    expect(md).toContain("## Pets");
    expect(md).toContain("- **Rex** — perro");
  });

  it("nota de vacío cuando no hay recuerdos, sin sección para kinds sin entidades", () => {
    const payload = buildMemoryExport([], []);
    const md = formatMemoryExportMarkdown(payload, "es");
    expect(md).toContain("(sin recuerdos todavía)");
    expect(md).not.toContain("## Personas");
    expect(md).not.toContain("## Mascotas");
  });

  it("agrupa varias entidades del mismo kind bajo un solo encabezado", () => {
    const payload = buildMemoryExport(
      [],
      [entity({ name: "María", kind: "person" }), entity({ name: "Pedro", kind: "person" })],
    );
    const md = formatMemoryExportMarkdown(payload, "es");
    expect(md.match(/## Personas/g)).toHaveLength(1);
    expect(md).toContain("- **María**");
    expect(md).toContain("- **Pedro**");
  });
});
