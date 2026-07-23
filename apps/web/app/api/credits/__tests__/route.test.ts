import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const authenticateRouteMock = vi.fn();
vi.mock("@/lib/supabase/route-auth", () => ({
  authenticateRoute: (...args: unknown[]) => authenticateRouteMock(...args),
}));

const rpcMock = vi.fn();
const limitMock = vi.fn();
const orderMock = vi.fn(() => ({ limit: limitMock }));
const selectMock = vi.fn(() => ({ order: orderMock }));
const fromMock = vi.fn(() => ({ select: selectMock }));

import { GET } from "../route";

function fakeRequest(): NextRequest {
  return {} as unknown as NextRequest;
}

describe("GET /api/credits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    orderMock.mockReturnValue({ limit: limitMock });
    selectMock.mockReturnValue({ order: orderMock });
    fromMock.mockReturnValue({ select: selectMock });
  });

  it("401 sin usuario autenticado", async () => {
    authenticateRouteMock.mockResolvedValue({ supabase: { rpc: rpcMock, from: fromMock }, user: null });
    const res = await GET(fakeRequest());
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
    expect(rpcMock).not.toHaveBeenCalled();
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("200 con usuario: balance del rpc + ledger del select (orden desc, últimos 20)", async () => {
    authenticateRouteMock.mockResolvedValue({ supabase: { rpc: rpcMock, from: fromMock }, user: { id: "u1" } });
    rpcMock.mockResolvedValue({ data: 42, error: null });
    const rows = [
      { delta: -1, kind: "spend", created_at: "2026-07-20T00:00:00Z" },
      { delta: 60, kind: "refill", created_at: "2026-07-01T00:00:00Z" },
    ];
    limitMock.mockResolvedValue({ data: rows, error: null });

    const res = await GET(fakeRequest());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ balance: 42, ledger: rows });
    expect(rpcMock).toHaveBeenCalledWith("my_credit_balance");
    expect(fromMock).toHaveBeenCalledWith("credit_ledger");
    expect(selectMock).toHaveBeenCalledWith("delta, kind, created_at");
    expect(orderMock).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(limitMock).toHaveBeenCalledWith(20);
  });

  it("rpc falla (error) → balance 0, nunca 500", async () => {
    authenticateRouteMock.mockResolvedValue({ supabase: { rpc: rpcMock, from: fromMock }, user: { id: "u1" } });
    rpcMock.mockResolvedValue({ data: null, error: { message: "boom" } });
    limitMock.mockResolvedValue({ data: [], error: null });

    const res = await GET(fakeRequest());
    expect(res.status).toBe(200);
    expect((await res.json()).balance).toBe(0);
  });

  it("rpc lanza (excepción de red) → balance 0, nunca 500", async () => {
    authenticateRouteMock.mockResolvedValue({ supabase: { rpc: rpcMock, from: fromMock }, user: { id: "u1" } });
    rpcMock.mockRejectedValue(new Error("network down"));
    limitMock.mockResolvedValue({ data: [], error: null });

    const res = await GET(fakeRequest());
    expect(res.status).toBe(200);
    expect((await res.json()).balance).toBe(0);
  });

  it("rpc devuelve algo no numérico → balance 0", async () => {
    authenticateRouteMock.mockResolvedValue({ supabase: { rpc: rpcMock, from: fromMock }, user: { id: "u1" } });
    rpcMock.mockResolvedValue({ data: "not-a-number", error: null });
    limitMock.mockResolvedValue({ data: [], error: null });

    const res = await GET(fakeRequest());
    expect((await res.json()).balance).toBe(0);
  });

  it("select del ledger falla (error) → ledger: [], nunca 500", async () => {
    authenticateRouteMock.mockResolvedValue({ supabase: { rpc: rpcMock, from: fromMock }, user: { id: "u1" } });
    rpcMock.mockResolvedValue({ data: 10, error: null });
    limitMock.mockResolvedValue({ data: null, error: { message: "boom" } });

    const res = await GET(fakeRequest());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ balance: 10, ledger: [] });
  });

  it("select del ledger lanza (excepción de red) → ledger: [], nunca 500", async () => {
    authenticateRouteMock.mockResolvedValue({ supabase: { rpc: rpcMock, from: fromMock }, user: { id: "u1" } });
    rpcMock.mockResolvedValue({ data: 10, error: null });
    limitMock.mockRejectedValue(new Error("network down"));

    const res = await GET(fakeRequest());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ balance: 10, ledger: [] });
  });

  it("ledger no es un array → ledger: []", async () => {
    authenticateRouteMock.mockResolvedValue({ supabase: { rpc: rpcMock, from: fromMock }, user: { id: "u1" } });
    rpcMock.mockResolvedValue({ data: 5, error: null });
    limitMock.mockResolvedValue({ data: "not-an-array", error: null });

    const res = await GET(fakeRequest());
    expect((await res.json()).ledger).toEqual([]);
  });
});
