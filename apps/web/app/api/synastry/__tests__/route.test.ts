import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const authenticateRouteMock = vi.fn();
vi.mock("@/lib/supabase/route-auth", () => ({
  authenticateRoute: (...args: unknown[]) => authenticateRouteMock(...args),
}));

const computeChartMock = vi.fn();
vi.mock("@aluna/ephemeris", () => ({
  computeChart: (...args: unknown[]) => computeChartMock(...args),
  setEphePath: vi.fn(),
}));

const synastryReportMock = vi.fn();
vi.mock("@aluna/core", () => ({
  synastryReport: (...args: unknown[]) => synastryReportMock(...args),
}));

const inMock = vi.fn();
const selectMock = vi.fn(() => ({ in: inMock }));
const fromMock = vi.fn(() => ({ select: selectMock }));

import { POST } from "../route";

const PROFILE_A = { id: "profile-a", birth_date: "1990-01-01", birth_time: "10:00", time_known: true, latitude: 1, longitude: 1, time_zone: "UTC" };
const PROFILE_B = { id: "profile-b", birth_date: "1992-06-15", birth_time: "08:30", time_known: true, latitude: 2, longitude: 2, time_zone: "UTC" };

function fakeRequest(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return {
    json: async () => body,
    headers: { get: (k: string) => headers[k.toLowerCase()] ?? null },
  } as unknown as NextRequest;
}

describe("POST /api/synastry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authenticateRouteMock.mockResolvedValue({ supabase: { from: fromMock }, user: null });
    computeChartMock.mockReturnValue({ bodies: [] });
    synastryReportMock.mockReturnValue({ overall: 78, tone: "high", themes: [], aspects: [] });
  });

  it("401 si authenticateRoute no resuelve usuario (sin cookie ni Bearer)", async () => {
    const res = await POST(fakeRequest({ profileIdA: "a", profileIdB: "b" }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
  });

  it("pasa el request a authenticateRoute (así llega el header Authorization)", async () => {
    const req = fakeRequest({ profileIdA: "a", profileIdB: "b" }, { authorization: "Bearer token-abc" });
    await POST(req);
    expect(authenticateRouteMock).toHaveBeenCalledWith(req);
  });

  it("400 si profileIdA y profileIdB son iguales", async () => {
    authenticateRouteMock.mockResolvedValue({ supabase: { from: fromMock }, user: { id: "user-1" } });
    const res = await POST(fakeRequest({ profileIdA: "same", profileIdB: "same" }));
    expect(res.status).toBe(400);
  });

  it("404 si no vuelven las dos filas de birth_profiles (RLS ya limita al dueño)", async () => {
    authenticateRouteMock.mockResolvedValue({ supabase: { from: fromMock }, user: { id: "user-1" } });
    inMock.mockResolvedValue({ data: [PROFILE_A] });
    const res = await POST(fakeRequest({ profileIdA: "profile-a", profileIdB: "profile-b" }));
    expect(res.status).toBe(404);
  });

  it("200 con el reporte cuando ambos perfiles se validan y el cómputo resuelve", async () => {
    authenticateRouteMock.mockResolvedValue({ supabase: { from: fromMock }, user: { id: "user-1" } });
    inMock.mockResolvedValue({ data: [PROFILE_A, PROFILE_B] });
    const res = await POST(fakeRequest({ profileIdA: "profile-a", profileIdB: "profile-b" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ overall: 78, tone: "high", themes: [], aspects: [] });
    expect(synastryReportMock).toHaveBeenCalled();
  });
});
