import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// authenticateRoute y resolveHorizonDate se mockean ANTES de importar la ruta
// (hoisting de vi.mock) para que route.ts reciba los dobles, no los reales —
// así el test no toca red, Supabase real ni el motor de efemérides.
const authenticateRouteMock = vi.fn();
vi.mock("@/lib/supabase/route-auth", () => ({
  authenticateRoute: (...args: unknown[]) => authenticateRouteMock(...args),
}));

const resolveHorizonDateMock = vi.fn();
vi.mock("@/lib/manifestations/horizon", () => ({
  resolveHorizonDate: (...args: unknown[]) => resolveHorizonDateMock(...args),
}));

const maybeSingleMock = vi.fn();
const selectAfterInsertMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
const insertMock = vi.fn(() => ({ select: selectAfterInsertMock }));

const orderMock = vi.fn();
const eqListMock = vi.fn(() => ({ order: orderMock }));
const selectListMock = vi.fn(() => ({ eq: eqListMock }));

const profileMaybeSingleMock = vi.fn();
const profileEqMock = vi.fn(() => ({ maybeSingle: profileMaybeSingleMock }));
const profileSelectMock = vi.fn(() => ({ eq: profileEqMock }));

const fromMock = vi.fn((table: string) => {
  if (table === "birth_profiles") return { select: profileSelectMock };
  return { insert: insertMock, select: selectListMock };
});

import { POST, GET } from "../route";

const USER_ID = "user-abc-123";
const TARGET_DATE = "2026-07-29";

function fakeRequest(body: unknown): NextRequest {
  return {
    json: async () => body,
  } as unknown as NextRequest;
}

function fakeGetRequest(): NextRequest {
  return {} as unknown as NextRequest;
}

describe("POST /api/manifestations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authenticateRouteMock.mockResolvedValue({ supabase: { from: fromMock }, user: { id: USER_ID } });
    resolveHorizonDateMock.mockReturnValue(TARGET_DATE);
    maybeSingleMock.mockResolvedValue({
      data: { id: "m1", user_id: USER_ID, intention: "paz", horizon: "new_moon", target_date: TARGET_DATE, created_at: "2026-07-13T00:00:00Z" },
      error: null,
    });
    profileMaybeSingleMock.mockResolvedValue({ data: null, error: null });
  });

  it("sin usuario → 401, no toca la BD", async () => {
    authenticateRouteMock.mockResolvedValue({ supabase: { from: fromMock }, user: null });
    const res = await POST(fakeRequest({ intention: "paz", horizon: "new_moon" }));
    expect(res.status).toBe(401);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("horizon inválido → 400, no toca la BD", async () => {
    const res = await POST(fakeRequest({ intention: "paz", horizon: "eclipse" }));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("invalid_horizon");
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("intención vacía → 400", async () => {
    const res = await POST(fakeRequest({ intention: "", horizon: "new_moon" }));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("invalid_intention");
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("intención > 280 caracteres → 400", async () => {
    const res = await POST(fakeRequest({ intention: "x".repeat(281), horizon: "new_moon" }));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("invalid_intention");
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("intención de 280 caracteres exactos → 200 (límite inclusivo)", async () => {
    const res = await POST(fakeRequest({ intention: "x".repeat(280), horizon: "new_moon" }));
    expect(res.status).toBe(200);
  });

  it("JSON inválido en el body → 400", async () => {
    const badReq = { json: async () => { throw new Error("bad json"); } } as unknown as NextRequest;
    const res = await POST(badReq);
    expect(res.status).toBe(400);
  });

  it("éxito: user_id SIEMPRE de la sesión, aunque el body intente colar uno ajeno", async () => {
    const res = await POST(
      fakeRequest({ intention: "paz", horizon: "new_moon", user_id: "attacker-id", userId: "attacker-id" }),
    );
    expect(res.status).toBe(200);

    expect(insertMock).toHaveBeenCalledTimes(1);
    const [row] = insertMock.mock.calls[0] as unknown as [Record<string, unknown>];
    expect(row.user_id).toBe(USER_ID);
    expect(row.target_date).toBe(TARGET_DATE);
    expect(row.intention).toBe("paz");
    expect(row.horizon).toBe("new_moon");

    const body = (await res.json()) as { manifestation: unknown };
    expect(body.manifestation).toBeTruthy();
  });

  it("solar_return con profileId propio: carga el perfil (RLS) y lo pasa como natal", async () => {
    profileMaybeSingleMock.mockResolvedValue({
      data: {
        birth_date: "1990-01-01",
        birth_time: "10:00",
        time_known: true,
        latitude: 4.6,
        longitude: -74.1,
        time_zone: "America/Bogota",
      },
      error: null,
    });
    const res = await POST(fakeRequest({ intention: "abundancia", horizon: "solar_return", profileId: "p1" }));
    expect(res.status).toBe(200);
    expect(profileSelectMock).toHaveBeenCalled();
    expect(profileEqMock).toHaveBeenCalledWith("id", "p1");

    expect(resolveHorizonDateMock).toHaveBeenCalledTimes(1);
    const [horizonArg, natalArg] = resolveHorizonDateMock.mock.calls[0] as [string, unknown, string];
    expect(horizonArg).toBe("solar_return");
    expect(natalArg).not.toBeNull();
  });

  it("solar_return sin profileId: natal es null, no consulta birth_profiles", async () => {
    const res = await POST(fakeRequest({ intention: "abundancia", horizon: "solar_return" }));
    expect(res.status).toBe(200);
    expect(profileSelectMock).not.toHaveBeenCalled();
    const [, natalArg] = resolveHorizonDateMock.mock.calls[0] as [string, unknown, string];
    expect(natalArg).toBeNull();
  });

  it("error de BD al insertar → 500", async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: { message: "boom" } });
    const res = await POST(fakeRequest({ intention: "paz", horizon: "new_moon" }));
    expect(res.status).toBe(500);
  });
});

describe("GET /api/manifestations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authenticateRouteMock.mockResolvedValue({ supabase: { from: fromMock }, user: { id: USER_ID } });
    orderMock.mockResolvedValue({ data: [{ id: "m1" }], error: null });
  });

  it("sin usuario → 401", async () => {
    authenticateRouteMock.mockResolvedValue({ supabase: { from: fromMock }, user: null });
    const res = await GET(fakeGetRequest());
    expect(res.status).toBe(401);
  });

  it("éxito: filtra por user_id de la sesión y ordena por target_date", async () => {
    const res = await GET(fakeGetRequest());
    expect(res.status).toBe(200);
    expect(eqListMock).toHaveBeenCalledWith("user_id", USER_ID);
    expect(orderMock).toHaveBeenCalledWith("target_date", { ascending: true });
    const body = (await res.json()) as { manifestations: unknown[] };
    expect(body.manifestations).toEqual([{ id: "m1" }]);
  });

  it("error de BD → 500", async () => {
    orderMock.mockResolvedValue({ data: null, error: { message: "boom" } });
    const res = await GET(fakeGetRequest());
    expect(res.status).toBe(500);
  });
});
