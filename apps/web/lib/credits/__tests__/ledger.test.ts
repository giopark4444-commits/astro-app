import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

// createServiceSupabaseClient se mockea ANTES de importar ledger.ts (hoisting
// de vi.mock) para que el módulo reciba el doble, no el real — así el test no
// toca red ni Supabase real. Mismo patrón que app/api/avatar/__tests__/route.test.ts.
const createServiceSupabaseClientMock = vi.fn((...args: unknown[]) => {
  void args; // firma real: (url, serviceRoleKey) — el test no depende de esos valores
  return { rpc: vi.fn() };
});
vi.mock("@aluna/supabase/server", () => ({
  createServiceSupabaseClient: (...args: unknown[]) => createServiceSupabaseClientMock(...args),
}));

import {
  getCreditsServiceClient,
  spendCredits,
  grantCredits,
  refundSpend,
  bumpChatUsage,
} from "../ledger";

// Doble mínimo de SupabaseClient: solo expone el método rpc, que es lo único
// que estos helpers usan.
function fakeClient(rpcImpl: (...args: unknown[]) => unknown) {
  return { rpc: vi.fn(rpcImpl) } as unknown as SupabaseClient;
}

describe("getCreditsServiceClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("sin NEXT_PUBLIC_SUPABASE_URL -> null (premium apagado), no crea cliente", () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
    expect(getCreditsServiceClient()).toBeNull();
    expect(createServiceSupabaseClientMock).not.toHaveBeenCalled();
  });

  it("sin SUPABASE_SERVICE_ROLE_KEY -> null, no crea cliente", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co";
    expect(getCreditsServiceClient()).toBeNull();
    expect(createServiceSupabaseClientMock).not.toHaveBeenCalled();
  });

  it("sin ninguna de las dos -> null", () => {
    expect(getCreditsServiceClient()).toBeNull();
    expect(createServiceSupabaseClientMock).not.toHaveBeenCalled();
  });

  it("con ambas env vars -> crea el cliente service-role con esos valores", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
    const client = getCreditsServiceClient();
    expect(client).not.toBeNull();
    expect(createServiceSupabaseClientMock).toHaveBeenCalledWith("https://x.supabase.co", "service-key");
  });
});

describe("spendCredits", () => {
  it("rpc devuelve { data: true, error: null } -> true", async () => {
    const svc = fakeClient(async () => ({ data: true, error: null }));
    await expect(spendCredits(svc, "user-1", 3, "spend:abc")).resolves.toBe(true);
  });

  it("rpc devuelve { data: false, error: null } (saldo insuficiente) -> false", async () => {
    const svc = fakeClient(async () => ({ data: false, error: null }));
    await expect(spendCredits(svc, "user-1", 3, "spend:abc")).resolves.toBe(false);
  });

  it("rpc devuelve error -> false (fail-closed, nunca lanza)", async () => {
    const svc = fakeClient(async () => ({ data: null, error: { message: "boom" } }));
    await expect(spendCredits(svc, "user-1", 3, "spend:abc")).resolves.toBe(false);
  });

  it("el cliente lanza (red caída) -> false, nunca lanza", async () => {
    const svc = fakeClient(async () => {
      throw new Error("network down");
    });
    await expect(spendCredits(svc, "user-1", 3, "spend:abc")).resolves.toBe(false);
  });

  it("llama al rpc spend_credits con los args posicionales correctos", async () => {
    const rpc = vi.fn(async () => ({ data: true, error: null }));
    const svc = { rpc } as unknown as SupabaseClient;
    await spendCredits(svc, "user-1", 3, "spend:abc");
    expect(rpc).toHaveBeenCalledWith("spend_credits", { p_user: "user-1", p_amount: 3, p_ref: "spend:abc" });
  });
});

describe("grantCredits", () => {
  it("rpc devuelve { data: true, error: null } -> true", async () => {
    const svc = fakeClient(async () => ({ data: true, error: null }));
    await expect(grantCredits(svc, "user-1", 100, "purchase", "dodo:pay_1")).resolves.toBe(true);
  });

  it("rpc devuelve { data: false, error: null } (ref ya abonado) -> false", async () => {
    const svc = fakeClient(async () => ({ data: false, error: null }));
    await expect(grantCredits(svc, "user-1", 100, "purchase", "dodo:pay_1")).resolves.toBe(false);
  });

  it("rpc devuelve error -> false", async () => {
    const svc = fakeClient(async () => ({ data: null, error: { message: "boom" } }));
    await expect(grantCredits(svc, "user-1", 100, "purchase", "dodo:pay_1")).resolves.toBe(false);
  });

  it("el cliente lanza -> false, nunca lanza", async () => {
    const svc = fakeClient(async () => {
      throw new Error("boom");
    });
    await expect(grantCredits(svc, "user-1", 100, "purchase", "dodo:pay_1")).resolves.toBe(false);
  });

  it("llama al rpc grant_credits con el kind incluido", async () => {
    const rpc = vi.fn(async () => ({ data: true, error: null }));
    const svc = { rpc } as unknown as SupabaseClient;
    await grantCredits(svc, "user-1", 60, "refill", "refill:sub_1:2026-07");
    expect(rpc).toHaveBeenCalledWith("grant_credits", {
      p_user: "user-1",
      p_amount: 60,
      p_kind: "refill",
      p_ref: "refill:sub_1:2026-07",
    });
  });
});

describe("refundSpend", () => {
  it('arma el ref "refund:<spendRef>" y llama a grant_credits con kind "refund"', async () => {
    const rpc = vi.fn(async () => ({ data: true, error: null }));
    const svc = { rpc } as unknown as SupabaseClient;
    await expect(refundSpend(svc, "user-1", 3, "spend:abc")).resolves.toBe(true);
    expect(rpc).toHaveBeenCalledWith("grant_credits", {
      p_user: "user-1",
      p_amount: 3,
      p_kind: "refund",
      p_ref: "refund:spend:abc",
    });
  });

  it("propaga false si el grant subyacente falla", async () => {
    const svc = fakeClient(async () => ({ data: false, error: null }));
    await expect(refundSpend(svc, "user-1", 3, "spend:abc")).resolves.toBe(false);
  });
});

describe("bumpChatUsage", () => {
  it("rpc devuelve un número -> ese número", async () => {
    const svc = fakeClient(async () => ({ data: 4, error: null }));
    await expect(bumpChatUsage(svc, "user-1")).resolves.toBe(4);
  });

  it("rpc devuelve error -> null (fail-open, el llamador no bloquea)", async () => {
    const svc = fakeClient(async () => ({ data: null, error: { message: "boom" } }));
    await expect(bumpChatUsage(svc, "user-1")).resolves.toBeNull();
  });

  it("el cliente lanza -> null, nunca lanza", async () => {
    const svc = fakeClient(async () => {
      throw new Error("boom");
    });
    await expect(bumpChatUsage(svc, "user-1")).resolves.toBeNull();
  });

  it("llama al rpc bump_chat_usage con p_user", async () => {
    const rpc = vi.fn(async () => ({ data: 1, error: null }));
    const svc = { rpc } as unknown as SupabaseClient;
    await bumpChatUsage(svc, "user-1");
    expect(rpc).toHaveBeenCalledWith("bump_chat_usage", { p_user: "user-1" });
  });
});
