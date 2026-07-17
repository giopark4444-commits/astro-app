import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";
import { HoroscopoView } from "../horoscopo-view";

// Mismo patrón de mocks que horoscopo-view.test.tsx (occidental): perfil y
// navegación mockeados, `trad=oriental` fijo vía useSearchParams.
const { mockActive } = vi.hoisted(() => ({ mockActive: { current: null as { id: string } | null } }));

vi.mock("@/lib/profiles/profiles-provider", () => ({ useProfiles: () => ({ active: mockActive.current }) }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams("trad=oriental"),
}));

// Payload realista (丙午 = 2026, animal consultado = "horse"): mismos números
// que el motor real produce para year/丙午 (ver lib/horoscope/__tests__/eastern.test.ts
// "tabla Tai Sui del año 丙午" — horse → zhi + zixing).
const PAYLOAD_EASTERN = {
  animal: "horse",
  period: "year",
  tz: "utc",
  range: { fromIso: "2026-02-03T20:02:00Z", toIso: "2027-02-04T02:00:00Z" },
  solarYear: 2026,
  pillars: {
    year: { stem: 2, branch: 6, stemHanzi: "丙", branchHanzi: "午", animal: "horse" },
    month: { stem: 4, branch: 8, stemHanzi: "戊", branchHanzi: "申", animal: "monkey" },
    day: { stem: 0, branch: 0, stemHanzi: "甲", branchHanzi: "子", animal: "rat" },
  },
  jieDates: [{ atIso: "2026-08-07T10:00:00Z", solarLongitude: 135 }],
  interactions: [
    { pillar: "day", type: "clash", withBranch: 0, withAnimal: "rat", favorable: false },
    { pillar: "month", type: "harm", withBranch: 8, withAnimal: "monkey", favorable: false },
  ],
  clash: { withAnimal: "rat" },
  harmonies: [],
  taiSui: [{ kind: "zhi" }, { kind: "zixing" }],
  monthChange: { atIso: "2026-08-07T10:00:00Z" },
  wuXing: { periodElement: "fire", animalElement: "fire", relation: "same" },
  toneBalance: "tense",
  areas: [
    { area: "work", score: 51, tone: "mixed", drivers: [{ pillar: "day", type: "clash", withBranch: 0, withAnimal: "rat", favorable: false, delta: -21 }] },
    { area: "money", score: 58, tone: "mixed", drivers: [] },
    { area: "love", score: 58, tone: "mixed", drivers: [] },
    { area: "health", score: 43, tone: "low", drivers: [{ pillar: "day", type: "clash", withBranch: 0, withAnimal: "rat", favorable: false, delta: -15 }] },
    { area: "luck", score: 54, tone: "mixed", drivers: [{ pillar: "year", type: "self_punishment", withBranch: 6, withAnimal: "horse", favorable: false, delta: -4 }] },
  ],
};

beforeEach(() => {
  mockActive.current = null;
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => PAYLOAD_EASTERN })) as unknown as typeof fetch;
});

function renderView() {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <HoroscopoView />
    </NextIntlClientProvider>,
  );
}

describe("HoroscopoView — tab Oriental", () => {
  it("pinta los 12 chips de animales y carga el payload", async () => {
    renderView();
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(screen.getAllByRole("radio", { name: /.+/ })).toHaveLength(12);
    // hanzi de la rama del animal por defecto (Rata) visible (chip + pilar del día)
    expect(screen.getAllByText(/子/).length).toBeGreaterThan(0);
  });

  it("sin perfil, arranca en Rata (animal por defecto) y pide al backend con esa clave", async () => {
    renderView();
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.find(
      (c) => c[0] === "/api/horoscope/eastern",
    )!;
    const body = JSON.parse(call[1]!.body as string);
    expect(body.animal).toBe("rat");
    expect(body.period).toBe("today");
  });

  it("cambiar de animal dispara un refetch con el nuevo animal en el body", async () => {
    renderView();
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const dragonChip = screen.getByRole("radio", { name: /Dragón/ });
    act(() => { dragonChip.click(); });
    await waitFor(() => {
      const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.filter(
        (c) => c[0] === "/api/horoscope/eastern",
      );
      const last = calls[calls.length - 1]!;
      const body = JSON.parse(last[1]!.body as string);
      expect(body.animal).toBe("dragon");
    });
  });

  it("renderiza las 5 barras de áreas", async () => {
    renderView();
    await waitFor(() => expect(screen.getByText("Trabajo")).toBeInTheDocument());
    expect(screen.getByText("Dinero")).toBeInTheDocument();
    expect(screen.getByText("Amor")).toBeInTheDocument();
    expect(screen.getByText("Salud")).toBeInTheDocument();
    expect(screen.getByText("Suerte")).toBeInTheDocument();
  });

  it("la nota anti-funa de Lichun está visible cuando el payload trae period=year (sin necesitar Modo Pro)", async () => {
    renderView();
    await waitFor(() => expect(screen.getByText(/Lichun a Lichun/)).toBeInTheDocument());
  });

  it("el toggle Pro muestra la tabla completa de interacciones con hanzi", async () => {
    renderView();
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const proBtn = await screen.findByText("Modo Pro");
    act(() => { proBtn.click(); });
    await waitFor(() => expect(screen.getByText("Interacciones completas")).toBeInTheDocument());
    // hanzi del choque día (甲子 vs 午 del animal consultado por defecto: Rata,
    // rama 子 — el mismo choque que trae PAYLOAD_EASTERN.interactions[0])
    expect(screen.getAllByText(/冲/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Zona horaria/)).toBeInTheDocument();
    expect(screen.getByText(/子時/)).toBeInTheDocument();
  });
});
