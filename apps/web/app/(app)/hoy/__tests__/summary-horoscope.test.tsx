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
// cambia solo) + un glifo/hanzi decorativo derivado del payload real. El
// selector de PERIODO es GLOBAL (Gio, corrigiendo un malentendido: "va arriba
// de la ventana de las barras, y debe afectar todas las ventanas") — vive en
// hub-view.tsx (PeriodSelector), acá solo llega como prop `period`, ya
// controlado, sin UI propia. Sigue reusando la prosa YA compuesta por
// horoscope-es.ts sin reescribirla.

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

describe("SummaryHoroscope — occidental", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => WESTERN_FIXTURE,
    })) as unknown as ReturnType<typeof vi.fn>;
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it("pide /api/horoscope/western con period today y muestra la prosa del signo + CTA a /horoscopo", async () => {
    renderSummary("occidental");

    await waitFor(() =>
      expect(
        screen.getByText(/Tu alma vino a encender el primer fuego/),
      ).toBeInTheDocument(),
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/horoscope/western");
    const body = JSON.parse((init as { body: string }).body) as Record<string, unknown>;
    expect(body.profileId).toBe("profile-1");
    expect(body.period).toBe("today");

    expect(screen.getByText(es.hoy.summaryHoroscopeWesternTitle)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: new RegExp(es.hoy.summaryHoroscopeCta) });
    expect(link).toHaveAttribute("href", "/horoscopo");
  });

  it("decora el título con el glifo del signo real del payload (pedido de Gio: 'usa el simbolo')", async () => {
    renderSummary("occidental");
    await waitFor(() => expect(screen.getByText(/Tu alma vino a encender el primer fuego/)).toBeInTheDocument());

    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading.textContent).toContain(ARIES_GLYPH);
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
  });

  it("el periodo GLOBAL (prop, no un tab propio) viaja en el body del fetch", async () => {
    renderSummary("occidental", vi.fn(), "week");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse((init as { body: string }).body) as Record<string, unknown>;
    expect(body.period).toBe("week");
    // Sin selector de periodo propio: eso vive arriba, en hub-view.tsx.
    expect(screen.queryByRole("tab", { name: es.hoy.periodWeek })).not.toBeInTheDocument();
  });

  it("cuando el padre (PeriodSelector global) cambia el periodo, re-fetchea", async () => {
    const { rerender } = renderSummary("occidental", vi.fn(), "today");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    rerender(
      <NextIntlClientProvider locale="es" messages={es}>
        <SummaryHoroscope profileId="profile-1" trad="occidental" onTradChange={vi.fn()} period="tomorrow" />
      </NextIntlClientProvider>,
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const [, init] = fetchMock.mock.calls[1]!;
    const body = JSON.parse((init as { body: string }).body) as Record<string, unknown>;
    expect(body.period).toBe("tomorrow");
  });
});

describe("SummaryHoroscope — oriental (mismo componente, otra prop)", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => EASTERN_FIXTURE,
    })) as unknown as ReturnType<typeof vi.fn>;
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it("pide /api/horoscope/eastern y muestra la prosa del animal + CTA a /horoscopo?trad=oriental", async () => {
    renderSummary("oriental");

    await waitFor(() =>
      expect(
        screen.getByText(/Tu alma vino con el ingenio de quien llega primero/),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText(/Para hoy, el cielo del Tong Shu se cruza con tu animal/)).toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/horoscope/eastern");

    expect(screen.getByText(es.hoy.summaryHoroscopeEasternTitle)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: new RegExp(es.hoy.summaryHoroscopeCta) });
    expect(link).toHaveAttribute("href", "/horoscopo?trad=oriental");
  });

  it("decora el título con el hanzi del animal real del payload", async () => {
    renderSummary("oriental");
    await waitFor(() => expect(screen.getByText(/Tu alma vino con el ingenio de quien llega primero/)).toBeInTheDocument());

    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading.textContent).toContain(RAT_HANZI);
  });
});

describe("SummaryHoroscope — una sola ventana, tab a click (pedido de Gio)", () => {
  beforeEach(() => {
    global.fetch = vi.fn(async (url: string) => ({
      ok: true,
      json: async () => (url === "/api/horoscope/eastern" ? EASTERN_FIXTURE : WESTERN_FIXTURE),
    })) as unknown as typeof fetch;
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
    // el occidental sigue mostrándose (nunca cambia "solo").
    expect(screen.getByText(es.hoy.summaryHoroscopeWesternTitle)).toBeInTheDocument();
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
