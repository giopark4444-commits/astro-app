import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

// Mock de authenticateRoute: cada test controla qué usuario/suscripción devuelve.
const authState: {
  user: { id: string } | null;
  sub: { status: string; current_period_end: string | null } | null;
} = { user: null, sub: null };

vi.mock("@/lib/supabase/route-auth", () => ({
  authenticateRoute: async () => ({
    user: authState.user,
    supabase: {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: authState.sub }),
          }),
        }),
      }),
    },
  }),
}));

import { requirePlus, isGateResponse } from "../access";

function fakeRequest() {
  return { headers: { get: () => null } } as never;
}

describe("requirePlus (gate de acceso a informes)", () => {
  beforeEach(() => {
    authState.user = null;
    authState.sub = null;
  });

  it("401 sin sesión", async () => {
    authState.user = null;
    const r = await requirePlus(fakeRequest());
    expect(isGateResponse(r)).toBe(true);
    expect((r as NextResponse).status).toBe(401);
  });

  it("403 con sesión pero sin suscripción", async () => {
    authState.user = { id: "u1" };
    authState.sub = null;
    const r = await requirePlus(fakeRequest());
    expect(isGateResponse(r)).toBe(true);
    expect((r as NextResponse).status).toBe(403);
  });

  it("403 con suscripción cancelada", async () => {
    authState.user = { id: "u1" };
    authState.sub = { status: "cancelled", current_period_end: null };
    const r = await requirePlus(fakeRequest());
    expect((r as NextResponse).status).toBe(403);
  });

  it("pasa con Plus activo — devuelve el usuario", async () => {
    authState.user = { id: "u1" };
    authState.sub = { status: "active", current_period_end: null };
    const r = await requirePlus(fakeRequest());
    expect(isGateResponse(r)).toBe(false);
    expect((r as { user: { id: string } }).user.id).toBe("u1");
  });

  it("pasa con trial activo (fin de periodo futuro)", async () => {
    authState.user = { id: "u1" };
    authState.sub = { status: "trialing", current_period_end: "2099-01-01T00:00:00Z" };
    const r = await requirePlus(fakeRequest());
    expect(isGateResponse(r)).toBe(false);
  });

  it("403 con status active pero periodo ya vencido", async () => {
    authState.user = { id: "u1" };
    authState.sub = { status: "active", current_period_end: "2000-01-01T00:00:00Z" };
    const r = await requirePlus(fakeRequest());
    expect((r as NextResponse).status).toBe(403);
  });
});
