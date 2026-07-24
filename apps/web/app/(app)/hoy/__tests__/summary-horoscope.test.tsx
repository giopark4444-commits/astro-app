import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { ZODIAC_SIGNS, EARTHLY_BRANCHES } from "@aluna/core";
import es from "@/messages/es.json";
import { SummaryHoroscope, type HoroTrad } from "../summary-horoscope";
import type { HoroscopePeriod } from "@/lib/horoscope/western";

// Task 5 + polish (Gio, 2026-07-23): UN componente que fusiona
// occidental+oriental en la MISMA tarjeta ("solo se cambian cuando le das
// click al que quieras" — `trad` es CONTROLADO, IZADO al padre/hub, nunca
// cambia solo). El selector de PERIODO es GLOBAL — vive en hub-view.tsx
// (PeriodSelector), acá solo llega como prop `period`, ya controlado, sin UI
// propia. Sigue reusando la prosa YA compuesta por horoscope-es.ts sin
// reescribirla.
//
// SEGUNDA PASADA (Gio, mismo día): "el titulo no debe decir horoscopo
// occidental sino solo horoscopo" (título único, sin importar la pestaña) +
// "dependiendo mi signo pondas el logo de mi zodiaco Y el de mi animal" (los
// DOS glifos juntos, no uno reemplazando al otro por pestaña) — por eso el
// componente ahora SIEMPRE pide las DOS tradiciones (una para la prosa activa,
// las dos para los glifos): el mock de fetch de acá discrimina por URL en
// TODOS los tests, y las aserciones de conteo cuentan por URL, no por
// posición (las dos llamadas de glifos + la de prosa corren en paralelo, sin
// orden garantizado entre sí).

const ARIES_GLYPH = ZODIAC_SIGNS.find((s) => s.key === "aries")!.glyph;
const RAT_HANZI = EARTHLY_BRANCHES.find((b) => b.animal === "rat")!.hanzi;

function renderSummary(
  trad: HoroTrad,
  onTradChange: (t: HoroTrad) => void = vi.fn(),
  period: HoroscopePeriod = "today",
) {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <SummaryHoroscope profileId="profile-1" trad={trad} onTradChange={onTradChange} period={period} />
    </NextIntlClientProvider>,
  );
}

const WESTERN_FIXTURE = {
  sign: "aries",
  period: "today",
  tz: "utc",
  range: { fromIso: "2026-07-21T00:00:00.000Z", toIso: "2026-07-21T23:59:59.000Z" },
  houses: [],
  signAspects: [],
  events: [],
  areas: [],
};

const EASTERN_FIXTURE = {
  animal: "rat",
  period: "today",
  tz: "utc",
  range: { fromIso: "2026-07-21T00:00:00.000Z", toIso: "2026-07-21T23:59:59.000Z" },
  solarYear: 2026,
  pillars: {},
  jieDates: [],
  interactions: [],
  clash: null,
  harmonies: [],
  taiSui: null,
  monthChange: null,
  wuXing: {},
  toneBalance: "favorable",
  areas: [],
};

/** Mock de fetch que discrimina por URL — SIEMPRE hace falta ahora: el
 *  componente pide las DOS tradiciones (efecto de glifos) sin importar cuál
 *  pestaña esté activa (efecto de prosa, aparte). */
function mockBothFetch(): ReturnType<typeof vi.fn> {
  const fn = vi.fn(async (url: string) => ({
    ok: true,
    json: async () => (url === "/api/horoscope/eastern" ? EASTERN_FIXTURE : WESTERN_FIXTURE),
  }));
  global.fetch = fn as unknown as typeof fetch;
  return fn as unknown as ReturnType<typeof vi.fn>;
}

function callsTo(fetchMock: ReturnType<typeof vi.fn>, url: string) {
  return fetchMock.mock.calls.filter((c) => c[0] === url);
}

describe("SummaryHoroscope — occidental", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = mockBothFetch();
  });

  it("pide /api/horoscope/western con period today y muestra la prosa del signo + CTA a /horoscopo", async () => {
    renderSummary("occidental");

    await waitFor(() =>
      expect(
        screen.getByText(/Tu alma vino a encender el primer fuego/),
      ).toBeInTheDocument(),
    );

    const westernCalls = callsTo(fetchMock, "/api/horoscope/western");
    expect(westernCalls.length).toBeGreaterThan(0);
    const body = JSON.parse((westernCalls[0]![1] as { body: string }).body) as Record<string, unknown>;
    expect(body.profileId).toBe("profile-1");
    expect(body.period).toBe("today");

    expect(screen.getByText(es.hoy.summaryHoroscopeTitle)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: new RegExp(es.hoy.summaryHoroscopeCta) });
    expect(link).toHaveAttribute("href", "/horoscopo");
  });

  it("decora el título con el glifo del signo real del payload (pedido de Gio: 'usa el simbolo')", async () => {
    renderSummary("occidental");
    await waitFor(() => expect(screen.getByText(/Tu alma vino a encender el primer fuego/)).toBeInTheDocument());

    const heading = await screen.findByRole("heading", { level: 2 });
    await waitFor(() => expect(heading.textContent).toContain(ARIES_GLYPH));
  });

  it("muestra AMBOS glifos (signo occidental + animal oriental) juntos, sin importar la pestaña activa (pedido de Gio, segunda pasada)", async () => {
    renderSummary("occidental");
    const heading = await screen.findByRole("heading", { level: 2 });

    await waitFor(() => {
      expect(heading.textContent).toContain(ARIES_GLYPH);
      expect(heading.textContent).toContain(RAT_HANZI);
    });
  });

  it("un fetch fallido no rompe el dashboard: aviso suave + CTA intacto", async () => {
    fetchMock = vi.fn(async () => {
      throw new Error("network");
    }) as unknown as ReturnType<typeof vi.fn>;
    global.fetch = fetchMock as unknown as typeof fetch;

    renderSummary("occidental");

    await waitFor(() => expect(screen.getByText(es.horoscopo.error)).toBeInTheDocument());
    expect(screen.getByRole("link", { name: new RegExp(es.hoy.summaryHoroscopeCta) })).toHaveAttribute(
      "href",
      "/horoscopo",
    );
    // Sin glifos: ambos fetches (occidental/oriental) del efecto de glifos
    // también fallaron — el título queda sin decorar, no revienta nada.
    expect(screen.getByText(es.hoy.summaryHoroscopeTitle)).toBeInTheDocument();
  });

  it("el periodo GLOBAL (prop, no un tab propio) viaja en el body del fetch", async () => {
    renderSummary("occidental", vi.fn(), "week");
    await waitFor(() => expect(callsTo(fetchMock, "/api/horoscope/western").length).toBeGreaterThan(0));

    const body = JSON.parse((callsTo(fetchMock, "/api/horoscope/western")[0]![1] as { body: string }).body) as Record<
      string,
      unknown
    >;
    expect(body.period).toBe("week");
    // Sin selector de periodo propio: eso vive arriba, en hub-view.tsx.
    expect(screen.queryByRole("tab", { name: es.hoy.periodWeek })).not.toBeInTheDocument();
  });

  it("cuando el padre (PeriodSelector global) cambia el periodo, re-fetchea", async () => {
    const { rerender } = renderSummary("occidental", vi.fn(), "today");
    await waitFor(() => expect(callsTo(fetchMock, "/api/horoscope/western").length).toBeGreaterThan(0));
    const callsBefore = callsTo(fetchMock, "/api/horoscope/western").length;

    rerender(
      <NextIntlClientProvider locale="es" messages={es}>
        <SummaryHoroscope profileId="profile-1" trad="occidental" onTradChange={vi.fn()} period="tomorrow" />
      </NextIntlClientProvider>,
    );

    await waitFor(() => expect(callsTo(fetchMock, "/api/horoscope/western").length).toBeGreaterThan(callsBefore));
    const lastCall = callsTo(fetchMock, "/api/horoscope/western").at(-1)!;
    const body = JSON.parse((lastCall[1] as { body: string }).body) as Record<string, unknown>;
    expect(body.period).toBe("tomorrow");
  });
});

describe("SummaryHoroscope — oriental (mismo componente, otra prop)", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = mockBothFetch();
  });

  it("pide /api/horoscope/eastern y muestra la prosa del animal + CTA a /horoscopo?trad=oriental", async () => {
    renderSummary("oriental");

    await waitFor(() =>
      expect(
        screen.getByText(/Tu alma vino con el ingenio de quien llega primero/),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText(/Para hoy, el cielo del Tong Shu se cruza con tu animal/)).toBeInTheDocument();

    expect(callsTo(fetchMock, "/api/horoscope/eastern").length).toBeGreaterThan(0);

    expect(screen.getByText(es.hoy.summaryHoroscopeTitle)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: new RegExp(es.hoy.summaryHoroscopeCta) });
    expect(link).toHaveAttribute("href", "/horoscopo?trad=oriental");
  });

  it("decora el título con el hanzi del animal real del payload", async () => {
    renderSummary("oriental");
    await waitFor(() => expect(screen.getByText(/Tu alma vino con el ingenio de quien llega primero/)).toBeInTheDocument());

    const heading = await screen.findByRole("heading", { level: 2 });
    await waitFor(() => expect(heading.textContent).toContain(RAT_HANZI));
  });
});

describe("SummaryHoroscope — una sola ventana, tab a click (pedido de Gio)", () => {
  beforeEach(() => {
    mockBothFetch();
  });

  it("muestra AMBAS pestañas (Occidental/Oriental) siempre, la activa marcada por aria-selected", async () => {
    renderSummary("occidental");
    await waitFor(() => expect(screen.getByText(/Tu alma vino a encender el primer fuego/)).toBeInTheDocument());

    const western = screen.getByRole("tab", { name: es.hoy.summaryHoroscopeWesternTab });
    const eastern = screen.getByRole("tab", { name: es.hoy.summaryHoroscopeEasternTab });
    expect(western).toHaveAttribute("aria-selected", "true");
    expect(eastern).toHaveAttribute("aria-selected", "false");
  });

  it("clicar la pestaña Oriental NO cambia sola — avisa a onTradChange, y el padre controla el prop `trad`", async () => {
    const onTradChange = vi.fn();
    renderSummary("occidental", onTradChange);
    await waitFor(() => expect(screen.getByText(/Tu alma vino a encender el primer fuego/)).toBeInTheDocument());

    fireEvent.click(screen.getByRole("tab", { name: es.hoy.summaryHoroscopeEasternTab }));
    expect(onTradChange).toHaveBeenCalledWith("oriental");
    // Componente CONTROLADO: sin que el padre baje trad="oriental" de vuelta,
    // el occidental sigue mostrándose (nunca cambia "solo") — la prosa manda,
    // el título ya no distingue (es el mismo "Horóscopo" en ambos casos).
    expect(screen.getByText(/Tu alma vino a encender el primer fuego/)).toBeInTheDocument();
  });

  it("cuando el padre responde subiendo trad='oriental', re-fetchea y muestra el otro lado", async () => {
    const { rerender } = renderSummary("occidental");
    await waitFor(() => expect(screen.getByText(/Tu alma vino a encender el primer fuego/)).toBeInTheDocument());

    rerender(
      <NextIntlClientProvider locale="es" messages={es}>
        <SummaryHoroscope profileId="profile-1" trad="oriental" onTradChange={vi.fn()} period="today" />
      </NextIntlClientProvider>,
    );

    await waitFor(() => expect(screen.getByText(/Tu alma vino con el ingenio de quien llega primero/)).toBeInTheDocument());
    expect(screen.getByRole("tab", { name: es.hoy.summaryHoroscopeEasternTab })).toHaveAttribute("aria-selected", "true");
  });
});
