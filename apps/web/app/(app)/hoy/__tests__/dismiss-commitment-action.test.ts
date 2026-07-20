import { describe, it, expect, vi, beforeEach } from "vitest";
import { revalidatePath } from "next/cache";

// Mismo criterio que ajustes/__tests__/actions.test.ts: un fake mínimo del
// cliente de Supabase (aquí ni siquiera hace falta `.from`, dismissCommitment
// vive en @/lib/memory-commitments y se mockea aparte) + mocks de
// next/cache y next/headers para poder importar "../../actions" en jsdom.
const state: { user: { id: string } | null } = { user: null };
const dismissCommitmentMock = vi.fn((...args: unknown[]) => {
  void args;
  return Promise.resolve();
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
  }),
}));

vi.mock("@/lib/memory-commitments", () => ({
  dismissCommitment: (...args: unknown[]) => dismissCommitmentMock(...args),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { dismissCommitmentAction } from "../../actions";

describe("dismissCommitmentAction (Fase 2 T4 — tarjeta proactiva de /hoy)", () => {
  beforeEach(() => {
    state.user = { id: "u1" };
    dismissCommitmentMock.mockClear();
    vi.mocked(revalidatePath).mockClear();
  });

  it("descarta el compromiso del usuario autenticado y revalida /hoy", async () => {
    await dismissCommitmentAction("c1");
    expect(dismissCommitmentMock).toHaveBeenCalledWith(expect.anything(), "u1", "c1");
    expect(revalidatePath).toHaveBeenCalledWith("/hoy");
  });

  it("sin usuario no llama a dismissCommitment ni revalida", async () => {
    state.user = null;
    await dismissCommitmentAction("c1");
    expect(dismissCommitmentMock).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("best-effort: no lanza si algo explota", async () => {
    dismissCommitmentMock.mockRejectedValueOnce(new Error("boom"));
    await expect(dismissCommitmentAction("c1")).resolves.toBeUndefined();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
