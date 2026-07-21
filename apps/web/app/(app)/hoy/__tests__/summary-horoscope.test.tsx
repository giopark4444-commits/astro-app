import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";
import { SummaryHoroscope } from "../summary-horoscope";

// Task 5: tarjeta-resumen del horóscopo — UN componente parametrizado por
// `trad` ("occidental"|"oriental"), cada uno pidiendo el payload universal del
// periodo "today" a su endpoint y reusando la prosa YA compuesta por
// horoscope-es.ts (composeWesternProse/composeEasternProse), sin reescribirla.

function renderSummary(trad: "occidental" | "oriental") {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <SummaryHoroscope profileId="profile-1" trad={trad} />
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
});
