import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const authenticateRouteMock = vi.fn();
vi.mock("@/lib/supabase/route-auth", () => ({
  authenticateRoute: (...args: unknown[]) => authenticateRouteMock(...args),
}));

const computeChartMock = vi.fn();
const computeDerivedChartMock = vi.fn();
vi.mock("@aluna/ephemeris", () => ({
  computeChart: (...args: unknown[]) => computeChartMock(...args),
  computeDerivedChart: (...args: unknown[]) => computeDerivedChartMock(...args),
  setEphePath: vi.fn(),
}));

const detectAspectsBetweenMock = vi.fn();
const scoreLifeAreasMock = vi.fn();
const scoreToneMock = vi.fn();
const personalCyclesMock = vi.fn();
const dayPillarMock = vi.fn();
vi.mock("@aluna/core", () => ({
  detectAspectsBetween: (...args: unknown[]) => detectAspectsBetweenMock(...args),
  scoreLifeAreas: (...args: unknown[]) => scoreLifeAreasMock(...args),
  scoreTone: (...args: unknown[]) => scoreToneMock(...args),
  personalCycles: (...args: unknown[]) => personalCyclesMock(...args),
  dayPillar: (...args: unknown[]) => dayPillarMock(...args),
  LIFE_AREAS: ["love", "money", "work", "health", "mood", "luck"],
}));

// La receta de pilares natales (native/sweph) y el ensamblador puro se prueban por
// separado; aquí la ruta solo debe llamarlos y devolver los 4 sets.
const computeBaziNatalMock = vi.fn();
vi.mock("@/lib/timeline/bazi-natal", () => ({
  computeBaziNatal: (...args: unknown[]) => computeBaziNatalMock(...args),
}));

const SIX = ["love", "money", "work", "health", "mood", "luck"].map((area) => ({
  area,
  score: 50,
  tone: "neutral",
  drivers: [],
}));
const assembleHoyScoresMock = vi.fn();
vi.mock("@/lib/hoy/scores", () => ({
  assembleHoyScores: (...args: unknown[]) => assembleHoyScoresMock(...args),
}));

const maybeSingleMock = vi.fn();
const eqMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
const selectMock = vi.fn(() => ({ eq: eqMock }));
const fromMock = vi.fn(() => ({ select: selectMock }));

import { POST } from "../route";

const PROFILE = {
  birth_date: "1990-01-01",
  birth_time: "10:00",
  time_known: true,
  latitude: 1,
  longitude: 1,
  time_zone: "UTC",
};

function fakeRequest(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return {
    json: async () => body,
    headers: { get: (k: string) => headers[k.toLowerCase()] ?? null },
  } as unknown as NextRequest;
}

describe("POST /api/scores", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authenticateRouteMock.mockResolvedValue({ supabase: { from: fromMock }, user: null });
    computeChartMock.mockReturnValue({ bodies: [] });
    computeDerivedChartMock.mockReturnValue({ bodies: [] });
    detectAspectsBetweenMock.mockReturnValue([]);
    scoreLifeAreasMock.mockReturnValue([]);
    scoreToneMock.mockReturnValue("neutral");
    personalCyclesMock.mockReturnValue({
      personalYear: { steps: [1], value: 1, isMaster: false },
      personalMonth: { steps: [1], value: 1, isMaster: false },
      personalDay: { steps: [1], value: 1, isMaster: false },
    });
    dayPillarMock.mockReturnValue({ stem: 0, branch: 0 });
    computeBaziNatalMock.mockReturnValue({
      year: { stem: 0, branch: 0 },
      month: { stem: 0, branch: 0 },
      day: { stem: 0, branch: 0 },
      hour: null,
    });
    assembleHoyScoresMock.mockReturnValue({
      general: SIX,
      astros: SIX,
      numeros: SIX,
      pilares: SIX,
    });
  });

  it("400 si falta profileId", async () => {
    const res = await POST(fakeRequest({}));
    expect(res.status).toBe(400);
  });

  it("401 si authenticateRoute no resuelve usuario (sin cookie ni Bearer)", async () => {
    const res = await POST(fakeRequest({ profileId: "profile-1" }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
  });

  it("pasa el request a authenticateRoute (así llega el header Authorization)", async () => {
    const req = fakeRequest({ profileId: "profile-1" }, { authorization: "Bearer token-abc" });
    await POST(req);
    expect(authenticateRouteMock).toHaveBeenCalledWith(req);
  });

  it("404 si el perfil no existe (RLS ya limita al dueño)", async () => {
    authenticateRouteMock.mockResolvedValue({ supabase: { from: fromMock }, user: { id: "user-1" } });
    maybeSingleMock.mockResolvedValue({ data: null });
    const res = await POST(fakeRequest({ profileId: "profile-1" }));
    expect(res.status).toBe(404);
  });

  it("200 con los 4 sets (general/astros/numeros/pilares), 6 áreas cada uno", async () => {
    authenticateRouteMock.mockResolvedValue({ supabase: { from: fromMock }, user: { id: "user-1" } });
    maybeSingleMock.mockResolvedValue({ data: PROFILE });
    const res = await POST(fakeRequest({ profileId: "profile-1" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.period).toBe("today");
    for (const key of ["general", "astros", "numeros", "pilares"] as const) {
      expect(json[key]).toHaveLength(6);
    }
    // "today" reusa los astros del día del ensamblador (no muestrea de nuevo).
    expect(assembleHoyScoresMock).toHaveBeenCalledOnce();
  });

  it("periodo != today: astros se muestrea (6 áreas) pero general/numeros/pilares son del día", async () => {
    authenticateRouteMock.mockResolvedValue({ supabase: { from: fromMock }, user: { id: "user-1" } });
    maybeSingleMock.mockResolvedValue({ data: PROFILE });
    const res = await POST(fakeRequest({ profileId: "profile-1", period: "week" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.period).toBe("week");
    expect(json.astros).toHaveLength(6);
    expect(json.general).toHaveLength(6);
    // week muestrea 7 fechas → scoreLifeAreas se llama al menos por muestra.
    expect(scoreLifeAreasMock.mock.calls.length).toBeGreaterThanOrEqual(7);
  });
});
