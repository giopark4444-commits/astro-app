import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor, type RenderResult } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { ThemeProvider } from "@/lib/theme/theme-provider";
import es from "@/messages/es.json";
import { HoroscopoView } from "../horoscopo-view";

// Regresión del MOVE (Fase 3, Task 2): en el monolito original `sign`
// (occidental) y `animal` (oriental) vivían en el componente raíz y
// SOBREVIVÍAN al cambio de pestaña porque router.replace no remonta. Tras el
// split a western-view.tsx/eastern-view.tsx quedaron en cada subvista, que SÍ
// se desmonta al cambiar `trad` — la elección se perdía. Este archivo prueba
// que, tras izarlos al orquestador (mismo patrón que `pro`/`period`), la
// elección persiste.
//
// mockParams: a diferencia de horoscopo-view.test.tsx (searchParams estático),
// aquí necesitamos que cambie DE VERDAD cuando se hace clic en una pestaña —
// mockReplace actualiza el valor y el test fuerza el re-render subsiguiente
// (RTL no re-ejecuta el componente solo porque una ref externa cambió).
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
  sign: "aries", period: "today", tz: "utc",
  range: { fromIso: "2026-07-13T00:00:00Z", toIso: "2026-07-13T23:59:59Z" },
  houses: [{ body: "sun", sign: "cancer", house: 6, retrograde: false }],
  signAspects: [],
  events: [],
  areas: [{ area: "work", score: 62, tone: "high", drivers: [] }],
};

const EASTERN_PAYLOAD = {
  animal: "rat", period: "today", tz: "utc",
  range: { fromIso: "2026-07-13T00:00:00Z", toIso: "2026-07-13T23:59:59Z" },
  solarYear: 2026,
  pillars: { year: { stem: 2, branch: 6, stemHanzi: "丙", branchHanzi: "午", animal: "horse" }, month: null, day: null },
  jieDates: [],
  interactions: [],
  clash: null,
  harmonies: [],
  taiSui: [],
  monthChange: null,
  wuXing: { periodElement: "fire", animalElement: "fire", relation: "same" },
  toneBalance: "tense",
  areas: [
    { area: "work", score: 58, tone: "mixed", drivers: [] },
    { area: "money", score: 58, tone: "mixed", drivers: [] },
    { area: "love", score: 58, tone: "mixed", drivers: [] },
    { area: "health", score: 52, tone: "mixed", drivers: [] },
    { area: "luck", score: 54, tone: "mixed", drivers: [] },
  ],
};

beforeEach(() => {
  mockActive.current = null;
  mockParams.current = new URLSearchParams();
  mockReplace.mockClear();
  // Echoea el sign/animal pedido en vez de devolver siempre el mismo valor
  // fijo: así la elección hecha a mano en el picker no se pisa cuando el
  // fetch posterior resuelve (igual que haría un backend real).
  global.fetch = vi.fn(async (url, init) => {
    const body = JSON.parse((init as RequestInit).body as string);
    if (url === "/api/horoscope/eastern") {
      return { ok: true, json: async () => ({ ...EASTERN_PAYLOAD, animal: body.animal ?? "rat" }) };
    }
    return { ok: true, json: async () => ({ ...WESTERN_PAYLOAD, sign: body.sign ?? "aries" }) };
  }) as unknown as typeof fetch;
});

function renderView() {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <ThemeProvider initialTheme="observatory" initialMode="dark" persist={vi.fn()}>
        <HoroscopoView />
      </ThemeProvider>
    </NextIntlClientProvider>,
  );
}

function rerenderView(rerender: RenderResult["rerender"]) {
  rerender(
    <NextIntlClientProvider locale="es" messages={es}>
      <ThemeProvider initialTheme="observatory" initialMode="dark" persist={vi.fn()}>
        <HoroscopoView />
      </ThemeProvider>
    </NextIntlClientProvider>,
  );
}

describe("Horóscopo — persistencia de sign/animal al cambiar de pestaña", () => {
  it("el signo elegido (occidental) sobrevive un viaje a la pestaña oriental y de vuelta", async () => {
    const { rerender } = renderView();
    await waitFor(() => expect(screen.getAllByRole("radio", { name: /.+/ })).toHaveLength(12));

    const leoChip = screen.getByRole("radio", { name: /Leo/ });
    act(() => { leoChip.click(); });
    await waitFor(() => expect(screen.getByRole("radio", { name: /Leo/ })).toHaveAttribute("aria-checked", "true"));

    // Cambiar a oriental usando el mecanismo real del tab del orquestador.
    act(() => { screen.getByRole("tab", { name: "Oriental" }).click(); });
    rerenderView(rerender);
    await waitFor(() => expect(screen.getByRole("tab", { name: "Oriental" })).toHaveAttribute("aria-selected", "true"));
    await waitFor(() => expect(screen.getAllByRole("radio", { name: /.+/ })).toHaveLength(12));

    // Volver a occidental.
    act(() => { screen.getByRole("tab", { name: "Occidental" }).click(); });
    rerenderView(rerender);
    await waitFor(() => expect(screen.getByRole("tab", { name: "Occidental" })).toHaveAttribute("aria-selected", "true"));

    expect(screen.getByRole("radio", { name: /Leo/ })).toHaveAttribute("aria-checked", "true");
  });

  it("el animal elegido (oriental) sobrevive un viaje a la pestaña occidental y de vuelta", async () => {
    mockParams.current = new URLSearchParams("trad=oriental");
    const { rerender } = renderView();
    await waitFor(() => expect(screen.getAllByRole("radio", { name: /.+/ })).toHaveLength(12));

    const dragonChip = screen.getByRole("radio", { name: /Dragón/ });
    act(() => { dragonChip.click(); });
    await waitFor(() => expect(screen.getByRole("radio", { name: /Dragón/ })).toHaveAttribute("aria-checked", "true"));

    // Cambiar a occidental.
    act(() => { screen.getByRole("tab", { name: "Occidental" }).click(); });
    rerenderView(rerender);
    await waitFor(() => expect(screen.getByRole("tab", { name: "Occidental" })).toHaveAttribute("aria-selected", "true"));
    await waitFor(() => expect(screen.getAllByRole("radio", { name: /.+/ })).toHaveLength(12));

    // Volver a oriental.
    act(() => { screen.getByRole("tab", { name: "Oriental" }).click(); });
    rerenderView(rerender);
    await waitFor(() => expect(screen.getByRole("tab", { name: "Oriental" })).toHaveAttribute("aria-selected", "true"));

    expect(screen.getByRole("radio", { name: /Dragón/ })).toHaveAttribute("aria-checked", "true");
  });
});
