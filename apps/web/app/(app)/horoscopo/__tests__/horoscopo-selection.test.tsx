// Integración del maestro-detalle de Horóscopo (Task 4): el orquestador
// recableado al patrón panel/sheet. Harness = molde de sign-animal-persistence
// (mock de useProfiles + next/navigation con params MUTABLES para el cambio de
// pestaña) + numeros-selection (matchMedia + query del panel). El fetch echoea
// el signo/animal pedido para simular un backend real. Verifica los 5
// comportamientos del brief:
//   1. aterriza occidental → el panel muestra la lectura del periodo (prosa)
//   2. clic en una barra de área → el panel muestra el área y sus drivers
//   3. Modo Pro inmediato → el panel-lectura gana los tiers (role tab Esencia)
//   4. cambiar a la pestaña oriental → reset del panel a la lectura (oriental)
//   5. móvil (matchMedia true): clic en un área → bottom-sheet con el detalle
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor, within, type RenderResult } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";
import { HoroscopoView } from "../horoscopo-view";

// Params MUTABLES (como sign-animal-persistence): el cambio de pestaña debe
// mover de verdad el searchParams para que el orquestador remonte la subvista.
const { mockActive, mockParams, mockReplace } = vi.hoisted(() => {
  const mockParams = { current: new URLSearchParams() };
  const mockReplace = vi.fn((url: string) => {
    const q = url.indexOf("?");
    mockParams.current = new URLSearchParams(q >= 0 ? url.slice(q + 1) : "");
  });
  return { mockActive: { current: null as { id: string } | null }, mockParams, mockReplace };
});

vi.mock("@/lib/profiles/profiles-provider", () => ({ useProfiles: () => ({ active: mockActive.current }) }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => mockParams.current,
}));

const WESTERN_PAYLOAD = {
  sign: "aquarius", period: "today", tz: "utc",
  range: { fromIso: "2026-07-13T00:00:00Z", toIso: "2026-07-13T23:59:59Z" },
  houses: [{ body: "sun", sign: "cancer", house: 6, retrograde: false }],
  signAspects: [{ body: "saturn", sign: "aries", aspect: "sextile", harmony: "soft" }],
  events: [{ kind: "lunation", atIso: "2026-07-13T10:00:00Z", phase: "full", sign: "capricorn", longitude: 291, eclipse: null }],
  areas: [{ area: "work", score: 62, tone: "high", drivers: [{ body: "jupiter", house: 10, favorable: true }] }],
};

const EASTERN_PAYLOAD = {
  animal: "horse", period: "today", tz: "utc",
  range: { fromIso: "2026-07-13T00:00:00Z", toIso: "2026-07-13T23:59:59Z" },
  solarYear: 2026,
  pillars: { year: { stem: 2, branch: 6, stemHanzi: "丙", branchHanzi: "午", animal: "horse" }, month: null, day: null },
  jieDates: [],
  interactions: [{ pillar: "year", type: "self_punishment", withBranch: 6, withAnimal: "horse", favorable: false }],
  clash: null,
  harmonies: [],
  taiSui: null,
  monthChange: null,
  wuXing: { periodElement: "fire", animalElement: "fire", relation: "same" },
  toneBalance: "tense",
  areas: [
    { area: "work", score: 58, tone: "mixed", drivers: [] },
    { area: "money", score: 58, tone: "mixed", drivers: [] },
    { area: "love", score: 58, tone: "mixed", drivers: [] },
    { area: "health", score: 52, tone: "mixed", drivers: [{ pillar: "year", type: "self_punishment", withBranch: 6, withAnimal: "horse", favorable: false, delta: -6 }] },
    { area: "luck", score: 54, tone: "mixed", drivers: [] },
  ],
};

/** matchMedia stub: mobile=true → "(max-width: 1079px)" matchea; desktop → "(min-width: 1080px)". */
function setMatchMedia(mobile: boolean) {
  vi.stubGlobal("matchMedia", (q: string) => ({
    matches: q.includes("max-width") ? mobile : !mobile,
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

beforeEach(() => {
  mockActive.current = null;
  mockParams.current = new URLSearchParams();
  mockReplace.mockClear();
  setMatchMedia(false); // desktop por defecto → select escribe el panel derecho
  global.fetch = vi.fn(async (url, init) => {
    const body = JSON.parse((init as RequestInit).body as string);
    if (url === "/api/horoscope/eastern") {
      return { ok: true, json: async () => ({ ...EASTERN_PAYLOAD, animal: body.animal ?? "rat" }) };
    }
    return { ok: true, json: async () => ({ ...WESTERN_PAYLOAD, sign: body.sign ?? "aquarius" }) };
  }) as unknown as typeof fetch;
});

function renderView() {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <HoroscopoView />
    </NextIntlClientProvider>,
  );
}
function rerenderView(rerender: RenderResult["rerender"]) {
  rerender(
    <NextIntlClientProvider locale="es" messages={es}>
      <HoroscopoView />
    </NextIntlClientProvider>,
  );
}

const getPanel = (c: HTMLElement) => c.querySelector('[class*="interpPanel"]') as HTMLElement;
const prosePara = (panel: HTMLElement) => panel.querySelectorAll('[class*="prosePara"]').length;

describe("HoroscopoView — maestro-detalle (panel/sheet)", () => {
  it("aterriza occidental: el panel muestra la lectura del periodo (prosa)", async () => {
    const { container } = renderView();
    const panel = getPanel(container);
    expect(panel).toBeTruthy();
    // El panel arranca en la lectura (selected=null) y, tras cargar el payload,
    // rinde la prosa compuesta del periodo — la prosa deja de vivir en la técnica.
    await waitFor(() => expect(prosePara(panel)).toBeGreaterThan(0));
    expect(within(panel).getByText(es.horoscopo.interpHint)).toBeInTheDocument();
  });

  it("clic en una barra de área → el panel muestra el área y sus drivers", async () => {
    const { container } = renderView();
    const panel = getPanel(container);
    await waitFor(() => expect(screen.getByRole("button", { name: /Trabajo/ })).toBeInTheDocument());

    act(() => { screen.getByRole("button", { name: /Trabajo/ }).click(); });

    // El panel pasa a interpretar el área: su nombre (interpName) y su tono (interpSub).
    expect(within(panel).getByText("Trabajo")).toBeInTheDocument();
    expect(within(panel).getByText("fluida")).toBeInTheDocument(); // tone "high" → hoy.toneHigh
  });

  it("Modo Pro inmediato: el panel-lectura gana los tiers (Esencia/Profunda/Completa)", async () => {
    const { container } = renderView();
    const panel = getPanel(container);
    await waitFor(() => expect(prosePara(panel)).toBeGreaterThan(0));

    // SIN Pro: el panel-lectura no monta el selector de niveles (la prosa mobile
    // sí tiene tiers, pero está fuera del panel → scope con within()).
    expect(within(panel).queryByRole("tab", { name: /Esencia/ })).toBeNull();

    act(() => { screen.getByRole("button", { name: es.horoscopo.pro }).click(); });

    expect(within(panel).getByRole("tab", { name: /Esencia/ })).toBeTruthy();
  });

  it("cambiar a la pestaña oriental resetea el panel a la lectura (oriental)", async () => {
    const { container, rerender } = renderView();
    await waitFor(() => expect(prosePara(getPanel(container))).toBeGreaterThan(0));

    // Seleccionar un área occidental → el panel muestra "Trabajo".
    act(() => { screen.getByRole("button", { name: /Trabajo/ }).click(); });
    expect(within(getPanel(container)).getByText("Trabajo")).toBeInTheDocument();

    // Cambiar a oriental con el mecanismo real del tab.
    act(() => { screen.getByRole("tab", { name: "Oriental" }).click(); });
    rerenderView(rerender);
    await waitFor(() => expect(screen.getByRole("tab", { name: "Oriental" })).toHaveAttribute("aria-selected", "true"));

    // El panel vuelve a la lectura (oriental): ya no muestra el área occidental.
    await waitFor(() => expect(within(getPanel(container)).queryByText("Trabajo")).toBeNull());
    await waitFor(() => expect(prosePara(getPanel(container))).toBeGreaterThan(0));
  });

  it("móvil (matchMedia true): clic en un área abre el bottom-sheet con el detalle", async () => {
    setMatchMedia(true);
    renderView();
    await waitFor(() => expect(screen.getByRole("button", { name: /Trabajo/ })).toBeInTheDocument());

    act(() => { screen.getByRole("button", { name: /Trabajo/ }).click(); });

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Trabajo");
    expect(dialog).toHaveTextContent("fluida");
  });
});
