import { describe, it, expect, vi, beforeEach } from "vitest";

// Mockea los dos módulos hermanos (memories.ts / memory-entities.ts) por su
// especificador RELATIVO — el mismo que usa memory-pipeline.ts internamente
// ("./memories" / "./memory-entities" desde lib/) — para que Vitest resuelva
// al mismo archivo sin ambigüedad. Así el pipeline se prueba aislado: los
// tests de cada módulo hermano ya cubren su propia lógica (memories.test.ts,
// memory-entities.test.ts).
const fetchMemoriesMock = vi.fn();
const formatMemoryBlockMock = vi.fn();
const parseDistilledMock = vi.fn();
const storeMemoriesMock = vi.fn();
vi.mock("../memories", () => ({
  fetchMemories: (...args: unknown[]) => fetchMemoriesMock(...args),
  formatMemoryBlock: (...args: unknown[]) => formatMemoryBlockMock(...args),
  parseDistilled: (...args: unknown[]) => parseDistilledMock(...args),
  storeMemories: (...args: unknown[]) => storeMemoriesMock(...args),
}));

const fetchEntitiesMock = vi.fn();
const formatEntityBlockMock = vi.fn();
const distillMemoryPromptMock = vi.fn();
const parseDistilledEntitiesMock = vi.fn();
const upsertEntitiesMock = vi.fn();
vi.mock("../memory-entities", () => ({
  fetchEntities: (...args: unknown[]) => fetchEntitiesMock(...args),
  formatEntityBlock: (...args: unknown[]) => formatEntityBlockMock(...args),
  distillMemoryPrompt: (...args: unknown[]) => distillMemoryPromptMock(...args),
  parseDistilledEntities: (...args: unknown[]) => parseDistilledEntitiesMock(...args),
  upsertEntities: (...args: unknown[]) => upsertEntitiesMock(...args),
}));

import { buildMemoryBlocks, runDistillation } from "../memory-pipeline";

const fakeSupabase = {} as never;

describe("buildMemoryBlocks", () => {
  beforeEach(() => vi.clearAllMocks());

  it('concatena memorias y entidades con "\\n\\n"', async () => {
    fetchMemoriesMock.mockResolvedValue([{ id: "1", content: "Vive en Quito", source: "chat", created_at: "" }]);
    fetchEntitiesMock.mockResolvedValue([
      { id: "e1", kind: "person", name: "María", summary: "hermana", aliases: [], pinned: false, salience: 1, last_referenced_at: "" },
    ]);
    formatMemoryBlockMock.mockReturnValue("BLOQUE MEMORIAS");
    formatEntityBlockMock.mockReturnValue("BLOQUE ENTIDADES");

    const block = await buildMemoryBlocks(fakeSupabase, "u1", "es");
    expect(block).toBe("BLOQUE MEMORIAS\n\nBLOQUE ENTIDADES");
  });

  it('devuelve "" cuando ambos bloques son null (sin memoria acumulada)', async () => {
    fetchMemoriesMock.mockResolvedValue([]);
    fetchEntitiesMock.mockResolvedValue([]);
    formatMemoryBlockMock.mockReturnValue(null);
    formatEntityBlockMock.mockReturnValue(null);

    expect(await buildMemoryBlocks(fakeSupabase, "u1", "es")).toBe("");
  });

  it("con un solo bloque presente no concatena separador vacío", async () => {
    fetchMemoriesMock.mockResolvedValue([]);
    fetchEntitiesMock.mockResolvedValue([]);
    formatMemoryBlockMock.mockReturnValue("SOLO MEMORIAS");
    formatEntityBlockMock.mockReturnValue(null);

    expect(await buildMemoryBlocks(fakeSupabase, "u1", "es")).toBe("SOLO MEMORIAS");
  });

  it('best-effort: devuelve "" si algún fetch explota', async () => {
    fetchMemoriesMock.mockRejectedValue(new Error("boom"));
    fetchEntitiesMock.mockResolvedValue([]);

    await expect(buildMemoryBlocks(fakeSupabase, "u1", "es")).resolves.toBe("");
  });
});

describe("runDistillation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("una sola llamada al modelo; parsea y guarda memorias Y entidades del mismo raw", async () => {
    fetchMemoriesMock.mockResolvedValue([{ id: "1", content: "Vive en Quito", source: "chat", created_at: "" }]);
    fetchEntitiesMock.mockResolvedValue([
      { id: "e1", kind: "person", name: "María", summary: "hermana", aliases: [], pinned: false, salience: 1, last_referenced_at: "" },
    ]);
    distillMemoryPromptMock.mockReturnValue({ system: "SYS", prompt: "PROMPT" });
    const raw = '{"memories": ["Nuevo hecho"], "entities": [{"kind":"pet","name":"Luna","summary":"gata"}]}';
    const complete = vi.fn().mockResolvedValue(raw);
    parseDistilledMock.mockReturnValue(["Nuevo hecho"]);
    parseDistilledEntitiesMock.mockReturnValue([{ kind: "pet", name: "Luna", summary: "gata", aliases: [] }]);

    await runDistillation({ complete } as never, fakeSupabase, "u1", "transcripción", "es", "chat");

    expect(complete).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledWith({ system: "SYS", prompt: "PROMPT", maxTokens: 400 });
    expect(distillMemoryPromptMock).toHaveBeenCalledWith(
      "transcripción",
      ["Vive en Quito"],
      [{ kind: "person", name: "María", summary: "hermana" }],
      "es",
    );
    expect(parseDistilledMock).toHaveBeenCalledWith(raw, ["Vive en Quito"]);
    expect(parseDistilledEntitiesMock).toHaveBeenCalledWith(raw);

    expect(storeMemoriesMock).toHaveBeenCalledTimes(1);
    expect(storeMemoriesMock).toHaveBeenCalledWith(fakeSupabase, "u1", ["Nuevo hecho"], "chat");
    expect(upsertEntitiesMock).toHaveBeenCalledTimes(1);
    expect(upsertEntitiesMock).toHaveBeenCalledWith(
      fakeSupabase,
      "u1",
      [{ kind: "pet", name: "Luna", summary: "gata", aliases: [] }],
      "chat",
    );
  });

  it('source es opcional y cae a "chat" por defecto', async () => {
    fetchMemoriesMock.mockResolvedValue([]);
    fetchEntitiesMock.mockResolvedValue([]);
    distillMemoryPromptMock.mockReturnValue({ system: "SYS", prompt: "PROMPT" });
    const complete = vi.fn().mockResolvedValue('{"memories": [], "entities": []}');
    parseDistilledMock.mockReturnValue([]);
    parseDistilledEntitiesMock.mockReturnValue([]);

    await runDistillation({ complete } as never, fakeSupabase, "u1", "t", "es");

    expect(storeMemoriesMock).toHaveBeenCalledWith(fakeSupabase, "u1", [], "chat");
    expect(upsertEntitiesMock).toHaveBeenCalledWith(fakeSupabase, "u1", [], "chat");
  });

  it("best-effort: no lanza y no guarda nada si el proveedor explota", async () => {
    fetchMemoriesMock.mockResolvedValue([]);
    fetchEntitiesMock.mockResolvedValue([]);
    distillMemoryPromptMock.mockReturnValue({ system: "SYS", prompt: "PROMPT" });
    const complete = vi.fn().mockRejectedValue(new Error("upstream down"));

    await expect(runDistillation({ complete } as never, fakeSupabase, "u1", "t", "es", "chat")).resolves.toBeUndefined();
    expect(storeMemoriesMock).not.toHaveBeenCalled();
    expect(upsertEntitiesMock).not.toHaveBeenCalled();
  });
});
