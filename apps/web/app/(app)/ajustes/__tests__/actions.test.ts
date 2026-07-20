import { describe, it, expect, vi, beforeEach } from "vitest";
import { revalidatePath } from "next/cache";

// Mock mínimo del cliente de Supabase (mismo criterio que admin/__tests__/
// actions.test.ts: sin precedente de action-test para @/lib/supabase/server,
// se arma un fake con exactamente los métodos que las nuevas acciones de
// memoria usan). settingsBuilder encadena UN solo .eq("user_id", …); los
// builders de user_memories/memory_entities encadenan DOS (.eq("id", …) y
// luego .eq("user_id", …)) — se distingue por tabla.
const state: {
  user: { id: string } | null;
  updateCalls: Array<{ table: string; v: unknown; eqs: [string, string][] }>;
  deleteCalls: Array<{ table: string; eqs: [string, string][] }>;
  throwOnFrom: boolean;
} = { user: null, updateCalls: [], deleteCalls: [], throwOnFrom: false };

function singleEqBuilder(record: (eqs: [string, string][]) => void) {
  return {
    eq: (col: string, val: string) => {
      record([[col, val]]);
      return Promise.resolve({ error: null });
    },
  };
}

function doubleEqBuilder(record: (eqs: [string, string][]) => void) {
  return {
    eq: (col1: string, val1: string) => ({
      eq: (col2: string, val2: string) => {
        record([
          [col1, val1],
          [col2, val2],
        ]);
        return Promise.resolve({ error: null });
      },
    }),
  };
}

// memory_essence (Fase 2 T5) actualiza filtrado SOLO por user_id (no hay id
// de fila propia — una fila por usuario, como settings), así que encadena UN
// solo .eq() igual que settingsBuilder.
const SINGLE_EQ_TABLES = new Set(["settings", "memory_essence"]);

function makeFrom(table: string) {
  return {
    update: (v: unknown) => {
      const record = (eqs: [string, string][]) => state.updateCalls.push({ table, v, eqs });
      return SINGLE_EQ_TABLES.has(table) ? singleEqBuilder(record) : doubleEqBuilder(record);
    },
    delete: () => doubleEqBuilder((eqs) => state.deleteCalls.push({ table, eqs })),
  };
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: (table: string) => {
      if (state.throwOnFrom) throw new Error("boom");
      return makeFrom(table);
    },
  }),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

// getLocale (Fase 2 T5, regenerateEssenceAction): sin un request real de
// Next.js en el entorno de test, next-intl/server no tiene de dónde leer el
// locale — se mockea fijo a "es" (mismo criterio que next/cache arriba).
vi.mock("next-intl/server", () => ({ getLocale: async () => "es" }));

// resolveReadingProvider/regenerateEssence (Fase 2 T5): se mockean aparte
// (ya están cubiertos por sus propios tests — lib/reading/__tests__ y
// lib/__tests__/memory-essence.test.ts) para que este archivo solo verifique
// que regenerateEssenceAction los conecta bien: sin proveedor → degrada, con
// proveedor → llama a regenerateEssence forzando minAgeSeconds=0.
const resolveReadingProviderMock = vi.fn();
vi.mock("@/lib/reading/provider", () => ({
  resolveReadingProvider: () => resolveReadingProviderMock(),
}));
const regenerateEssenceMock = vi.fn(async (..._args: unknown[]) => {});
vi.mock("@/lib/memory-essence", () => ({
  regenerateEssence: (...args: unknown[]) => regenerateEssenceMock(...args),
}));

import {
  setMemoryEnabled,
  editMemory,
  editEntity,
  deleteEntity,
  pinEntity,
  regenerateEssenceAction,
  editEssence,
  clearEssence,
} from "../../actions";

describe("acciones del panel de control de memoria (Fase 1C)", () => {
  beforeEach(() => {
    state.user = { id: "u1" };
    state.updateCalls = [];
    state.deleteCalls = [];
    state.throwOnFrom = false;
    vi.mocked(revalidatePath).mockClear();
    resolveReadingProviderMock.mockReset();
    regenerateEssenceMock.mockReset().mockResolvedValue(undefined);
  });

  describe("setMemoryEnabled", () => {
    it("actualiza settings.memory_enabled filtrado por user_id", async () => {
      await setMemoryEnabled(true);
      expect(state.updateCalls).toEqual([{ table: "settings", v: { memory_enabled: true }, eqs: [["user_id", "u1"]] }]);
    });

    it("es fire-and-forget: NO llama a revalidatePath", async () => {
      await setMemoryEnabled(false);
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("sin usuario no llama a update", async () => {
      state.user = null;
      await setMemoryEnabled(true);
      expect(state.updateCalls).toHaveLength(0);
    });

    it("best-effort: no lanza si la BD explota", async () => {
      state.throwOnFrom = true;
      await expect(setMemoryEnabled(true)).resolves.toBeUndefined();
    });
  });

  describe("editMemory", () => {
    it("actualiza el contenido filtrado por id Y user_id, y revalida /ajustes", async () => {
      await editMemory("m1", "  le encanta el café  ");
      expect(state.updateCalls).toEqual([
        {
          table: "user_memories",
          v: { content: "le encanta el café" },
          eqs: [
            ["id", "m1"],
            ["user_id", "u1"],
          ],
        },
      ]);
      expect(revalidatePath).toHaveBeenCalledWith("/ajustes");
    });

    it("recorta a 280 caracteres (mismo CHECK que la migración 0018)", async () => {
      const long = "a".repeat(300);
      await editMemory("m1", long);
      const v = state.updateCalls[0]!.v as { content: string };
      expect(v.content).toHaveLength(280);
    });

    it("contenido vacío tras el trim: no llama a update", async () => {
      await editMemory("m1", "   ");
      expect(state.updateCalls).toHaveLength(0);
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("sin usuario no llama a update", async () => {
      state.user = null;
      await editMemory("m1", "algo");
      expect(state.updateCalls).toHaveLength(0);
    });
  });

  describe("editEntity", () => {
    it("actualiza name+summary filtrado por id Y user_id, y revalida /ajustes", async () => {
      await editEntity("e1", "  Luna  ", "  su gata  ");
      expect(state.updateCalls).toEqual([
        {
          table: "memory_entities",
          v: { name: "Luna", summary: "su gata" },
          eqs: [
            ["id", "e1"],
            ["user_id", "u1"],
          ],
        },
      ]);
      expect(revalidatePath).toHaveBeenCalledWith("/ajustes");
    });

    it("recorta name a 120 y summary a 2000 (mismos CHECK que la migración 0019)", async () => {
      await editEntity("e1", "n".repeat(150), "s".repeat(2100));
      const v = state.updateCalls[0]!.v as { name: string; summary: string };
      expect(v.name).toHaveLength(120);
      expect(v.summary).toHaveLength(2000);
    });

    it("nombre vacío tras el trim: no llama a update", async () => {
      await editEntity("e1", "   ", "algo");
      expect(state.updateCalls).toHaveLength(0);
    });

    it("sin usuario no llama a update", async () => {
      state.user = null;
      await editEntity("e1", "Luna", "algo");
      expect(state.updateCalls).toHaveLength(0);
    });
  });

  describe("deleteEntity", () => {
    it("borra filtrado por id Y user_id, y revalida /ajustes", async () => {
      await deleteEntity("e1");
      expect(state.deleteCalls).toEqual([
        {
          table: "memory_entities",
          eqs: [
            ["id", "e1"],
            ["user_id", "u1"],
          ],
        },
      ]);
      expect(revalidatePath).toHaveBeenCalledWith("/ajustes");
    });

    it("sin usuario no llama a delete", async () => {
      state.user = null;
      await deleteEntity("e1");
      expect(state.deleteCalls).toHaveLength(0);
    });
  });

  describe("pinEntity", () => {
    it("actualiza pinned filtrado por id Y user_id, y revalida /ajustes", async () => {
      await pinEntity("e1", true);
      expect(state.updateCalls).toEqual([
        {
          table: "memory_entities",
          v: { pinned: true },
          eqs: [
            ["id", "e1"],
            ["user_id", "u1"],
          ],
        },
      ]);
      expect(revalidatePath).toHaveBeenCalledWith("/ajustes");
    });

    it("sin usuario no llama a update", async () => {
      state.user = null;
      await pinEntity("e1", false);
      expect(state.updateCalls).toHaveLength(0);
    });
  });

  describe("regenerateEssenceAction (Fase 2 T5)", () => {
    it("sin proveedor de IA disponible → {ok:false, reason:'no_provider'}, no llama a regenerateEssence ni revalida", async () => {
      resolveReadingProviderMock.mockReturnValue({ available: false });
      await expect(regenerateEssenceAction()).resolves.toEqual({ ok: false, reason: "no_provider" });
      expect(regenerateEssenceMock).not.toHaveBeenCalled();
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("con proveedor disponible → llama a regenerateEssence forzando minAgeSeconds=0 y revalida /ajustes", async () => {
      const provider = { name: "hermes" };
      resolveReadingProviderMock.mockReturnValue({ available: true, provider });
      await expect(regenerateEssenceAction()).resolves.toEqual({ ok: true });
      expect(regenerateEssenceMock).toHaveBeenCalledWith(provider, expect.anything(), "u1", "es", 0);
      expect(revalidatePath).toHaveBeenCalledWith("/ajustes");
    });

    it("sin usuario → {ok:false}, ni siquiera resuelve el proveedor", async () => {
      state.user = null;
      await expect(regenerateEssenceAction()).resolves.toEqual({ ok: false });
      expect(resolveReadingProviderMock).not.toHaveBeenCalled();
    });

    it("best-effort: si regenerateEssence explota, no lanza y devuelve {ok:false}", async () => {
      resolveReadingProviderMock.mockReturnValue({ available: true, provider: { name: "hermes" } });
      regenerateEssenceMock.mockRejectedValueOnce(new Error("boom"));
      await expect(regenerateEssenceAction()).resolves.toEqual({ ok: false });
    });
  });

  describe("editEssence (Fase 2 T5)", () => {
    it("actualiza portrait filtrado por user_id, y revalida /ajustes", async () => {
      await editEssence("  Eres alguien reflexivo.  ");
      expect(state.updateCalls).toEqual([
        { table: "memory_essence", v: { portrait: "Eres alguien reflexivo." }, eqs: [["user_id", "u1"]] },
      ]);
      expect(revalidatePath).toHaveBeenCalledWith("/ajustes");
    });

    it("recorta a 4000 caracteres (mismo CHECK que la migración 0020)", async () => {
      const long = "a".repeat(4500);
      await editEssence(long);
      const v = state.updateCalls[0]!.v as { portrait: string };
      expect(v.portrait).toHaveLength(4000);
    });

    it("a diferencia de editMemory/editEntity, un portrait vacío tras el trim SÍ actualiza (equivale a limpiarlo a mano)", async () => {
      await editEssence("   ");
      expect(state.updateCalls).toEqual([{ table: "memory_essence", v: { portrait: "" }, eqs: [["user_id", "u1"]] }]);
    });

    it("sin usuario no llama a update", async () => {
      state.user = null;
      await editEssence("algo");
      expect(state.updateCalls).toHaveLength(0);
    });

    it("best-effort: no lanza si la BD explota", async () => {
      state.throwOnFrom = true;
      await expect(editEssence("algo")).resolves.toBeUndefined();
    });
  });

  describe("clearEssence (Fase 2 T5)", () => {
    it("vacía portrait + metadato (generated_at, model_used) filtrado por user_id, y revalida /ajustes", async () => {
      await clearEssence();
      expect(state.updateCalls).toEqual([
        {
          table: "memory_essence",
          v: { portrait: "", generated_at: null, model_used: null },
          eqs: [["user_id", "u1"]],
        },
      ]);
      expect(revalidatePath).toHaveBeenCalledWith("/ajustes");
    });

    it("sin usuario no llama a update", async () => {
      state.user = null;
      await clearEssence();
      expect(state.updateCalls).toHaveLength(0);
    });

    it("best-effort: no lanza si la BD explota", async () => {
      state.throwOnFrom = true;
      await expect(clearEssence()).resolves.toBeUndefined();
    });
  });
});
