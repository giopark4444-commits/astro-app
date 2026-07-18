import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
// "tabla Tai Sui del año 丙午" — horse → zhi + zixing). Period-aware (FIX 1):
// la vista año trae SOLO el pilar del año (month/day = null) e interacciones
// exclusivamente del pilar del año (caballo 午 vs año 午 = 自刑).
const PAYLOAD_EASTERN = {
  animal: "horse",
  period: "year",
  tz: "utc",
  range: { fromIso: "2026-02-03T20:02:00Z", toIso: "2027-02-04T02:00:00Z" },
  solarYear: 2026,
  pillars: {
    year: { stem: 2, branch: 6, stemHanzi: "丙", branchHanzi: "午", animal: "horse" },
    month: null,
    day: null,
  },
  jieDates: [{ atIso: "2026-08-07T10:00:00Z", solarLongitude: 135 }],
  interactions: [
    { pillar: "year", type: "self_punishment", withBranch: 6, withAnimal: "horse", favorable: false },
  ],
  clash: null,
  harmonies: [],
  taiSui: [{ kind: "zhi" }, { kind: "zixing" }],
  monthChange: { atIso: "2026-08-07T10:00:00Z" },
  wuXing: { periodElement: "fire", animalElement: "fire", relation: "same" },
  toneBalance: "tense",
  areas: [
    { area: "work", score: 58, tone: "mixed", drivers: [] },
    { area: "money", score: 58, tone: "mixed", drivers: [] },
    { area: "love", score: 58, tone: "mixed", drivers: [] },
    { area: "health", score: 52, tone: "mixed", drivers: [{ pillar: "year", type: "self_punishment", withBranch: 6, withAnimal: "horse", favorable: false, delta: -6 }] },
    { area: "luck", score: 54, tone: "mixed", drivers: [{ pillar: "year", type: "self_punishment", withBranch: 6, withAnimal: "horse", favorable: false, delta: -4 }] },
  ],
};

beforeEach(() => {
  mockActive.current = null;
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => PAYLOAD_EASTERN })) as unknown as typeof fetch;
});

// Los caracteres del pilar (丙/午) y los pares de interacción (子/冲/午) ahora
// se envuelven CADA UNO en su propio <Meaning> (capa de significados, task
// oriental): el texto combinado deja de ser un único nodo de texto, así que
// el matcher exacto/regex de RTL (que solo mira nodos de texto DIRECTOS) ya
// no encuentra el contenedor. Este helper mira el textContent recursivo.
const byNodeText = (re: RegExp) => (_: string, node: Element | null) => re.test(node?.textContent ?? "");

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

  it("con Pro activo, el toggle Ba Zi ↔ Saju cambia los pilares a hangul (spec §5 nota c)", async () => {
    renderView();
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const proBtn = await screen.findByText("Modo Pro");
    act(() => { proBtn.click(); });
    // el toggle de escritura aparece con Pro (mismo contrato que pilares en móvil)
    const sajuBtn = await screen.findByRole("tab", { name: "Saju" });
    act(() => { sajuBtn.click(); });
    // pilar del año 丙午 en hangul: 병 (stem 2) + 오 (branch 6)
    await waitFor(() => expect(screen.getAllByText(byNodeText(/병오/)).length).toBeGreaterThan(0));
    // volver a Ba Zi restaura el hanzi
    const baziBtn = screen.getByRole("tab", { name: "Ba Zi" });
    act(() => { baziBtn.click(); });
    await waitFor(() => expect(screen.getAllByText(byNodeText(/丙午/)).length).toBeGreaterThan(0));
  });

  it("el toggle Pro muestra la tabla completa de interacciones con hanzi", async () => {
    renderView();
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const proBtn = await screen.findByText("Modo Pro");
    act(() => { proBtn.click(); });
    await waitFor(() => expect(screen.getByText("Interacciones completas")).toBeInTheDocument());
    // hanzi del 自刑 del año (午 自刑 午 — la única interacción de la vista año
    // que trae PAYLOAD_EASTERN.interactions[0])
    expect(screen.getAllByText(/自刑/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Zona horaria/)).toBeInTheDocument();
    expect(screen.getByText(/子時/)).toBeInTheDocument();
  });

  it("el subtítulo oriental habla del animal, no del signo (FIX 5)", async () => {
    renderView();
    expect(screen.getByText("El cielo del periodo, leído para tu animal")).toBeInTheDocument();
    expect(screen.queryByText("El cielo del periodo, leído para tu signo")).toBeNull();
  });

  it("pinta el Wu Xing del periodo: elementos y relación (FIX 3, spec §5)", async () => {
    renderView();
    await waitFor(() => expect(screen.getByText(/Wu Xing del periodo/)).toBeInTheDocument());
    // mock: fire vs fire, relation "same" → frase con ambos elementos
    expect(screen.getByText(/Fuego del periodo y Fuego de tu animal/)).toBeInTheDocument();
  });

  it("con natalHits en el payload, aparece la sección de cruce personal con el par en hanzi (FIX 2)", async () => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        ...PAYLOAD_EASTERN,
        natalHits: [
          { natalPillar: "day", periodPillar: "year", type: "clash", natalBranch: 0, withBranch: 6, favorable: false },
        ],
      }),
    })) as unknown as typeof fetch;
    renderView();
    await waitFor(() => expect(screen.getByText("Esto toca tus pilares")).toBeInTheDocument());
    expect(screen.getAllByText(byNodeText(/子 冲 午/)).length).toBeGreaterThan(0);
    expect(screen.getByText(/Choque/)).toBeInTheDocument();
  });

  it("una fila de interacción en 'Esto toca tus pilares' abre el glosario (capa de significados, antes muda)", async () => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        ...PAYLOAD_EASTERN,
        natalHits: [
          { natalPillar: "day", periodPillar: "year", type: "clash", natalBranch: 0, withBranch: 6, favorable: false },
        ],
      }),
    })) as unknown as typeof fetch;
    renderView();
    await waitFor(() => expect(screen.getByText("Esto toca tus pilares")).toBeInTheDocument());
    const triggers = screen.getAllByRole("button", { name: "Choque" });
    expect(triggers.length).toBeGreaterThan(0);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(triggers[0]!);
    // findBy* (no getBy* síncrono): bajo carga de suite completa el diálogo del
    // glosario puede montar un tick después del click — esperamos con timeout
    // explícito en vez de leer el DOM en el mismo tick (endurecimiento flaky).
    const dialog = await screen.findByRole("dialog", {}, { timeout: 4000 });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveTextContent(/Choque/);
    expect(dialog).toHaveTextContent(/冲/);
  });

  it("sin natalHits, la sección de cruce personal NO aparece (FIX 2)", async () => {
    renderView();
    await waitFor(() => expect(screen.getAllByText(byNodeText(/丙午/)).length).toBeGreaterThan(0));
    expect(screen.queryByText("Esto toca tus pilares")).toBeNull();
  });

  it("el pilar del año se enciende con la clase de ignición (movimiento de carga)", async () => {
    renderView();
    const pillarChar = await screen.findByText((_, node) => node?.textContent === "丙午");
    expect(pillarChar.className).toMatch(/ignite/);
  });

  it("con harmonies y monthChange en el payload, Modo Pro pinta las filas de armonías y cambio de mes", async () => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ ...PAYLOAD_EASTERN, harmonies: ["goat"] }),
    })) as unknown as typeof fetch;
    renderView();
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const proBtn = await screen.findByText("Modo Pro");
    act(() => { proBtn.click(); });
    // fila de armonías: título + hint + animal en 六合 (未 Cabra) envuelto en Meaning
    await waitFor(() => expect(screen.getByText("Armonías del periodo")).toBeInTheDocument());
    expect(screen.getByText(/六合 contigo/)).toBeInTheDocument();
    expect(screen.getAllByText(byNodeText(/未 Cabra/)).length).toBeGreaterThan(0);
    // fila de cambio de mes: título + hint + fecha del primer 節 del rango
    expect(screen.getByText("Cambio de mes solar")).toBeInTheDocument();
    expect(screen.getByText(/marca el cambio de energía mensual/)).toBeInTheDocument();
    expect(screen.getAllByText(/節/).length).toBeGreaterThan(0);
  });

  it("sin harmonies en el payload, la fila de armonías del Modo Pro no aparece", async () => {
    renderView();
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const proBtn = await screen.findByText("Modo Pro");
    act(() => { proBtn.click(); });
    await waitFor(() => expect(screen.getByText("Interacciones completas")).toBeInTheDocument());
    expect(screen.queryByText("Armonías del periodo")).toBeNull();
  });

  it("la vista año pinta SOLO el pilar del año: sin celda de Día ni 'Choque del día' (FIX 1)", async () => {
    renderView();
    await waitFor(() => expect(screen.getAllByText(byNodeText(/丙午/)).length).toBeGreaterThan(0));
    // "Día" solo existiría como etiqueta del pilar del día (el selector de
    // periodo dice "Hoy"); con day=null no debe aparecer.
    expect(screen.queryByText("Día")).toBeNull();
    expect(screen.queryByText(/Choque del día/)).toBeNull();
    expect(screen.queryByText(/Armonía del día/)).toBeNull();
  });
});
