import { describe, it, expect } from "vitest";
import { getRole } from "../roles";

// Cliente mínimo, con la misma forma acotada que usa rolesBuilder (select().maybeSingle()).
function fakeSupabase(resolve: () => Promise<{ data: { role: string } | null }>) {
  return {
    from: () => ({
      select: () => ({
        maybeSingle: resolve,
      }),
    }),
  } as never;
}

describe("getRole", () => {
  it("devuelve el rol cuando la fila existe y es válida", async () => {
    const supabase = fakeSupabase(async () => ({ data: { role: "superadmin" } }));
    expect(await getRole(supabase)).toBe("superadmin");
  });

  it("devuelve collaborator tal cual", async () => {
    const supabase = fakeSupabase(async () => ({ data: { role: "collaborator" } }));
    expect(await getRole(supabase)).toBe("collaborator");
  });

  it("devuelve null cuando no hay fila (usuario común)", async () => {
    const supabase = fakeSupabase(async () => ({ data: null }));
    expect(await getRole(supabase)).toBeNull();
  });

  it("devuelve null si el rol guardado no es uno de los dos válidos", async () => {
    const supabase = fakeSupabase(async () => ({ data: { role: "algo-raro" } }));
    expect(await getRole(supabase)).toBeNull();
  });

  it("nunca revienta: si la query lanza (p.ej. tabla inexistente, migración sin aplicar), devuelve null", async () => {
    const supabase = fakeSupabase(async () => {
      throw new Error('relation "public.roles" does not exist');
    });
    await expect(getRole(supabase)).resolves.toBeNull();
  });
});
