import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";
import { SummaryChart } from "../summary-chart";

// Task 5: tarjeta-resumen de /carta — Sol/Luna/Ascendente + el mismo párrafo de
// núcleo narrativo que /carta ya compone (composeCoreReading, reusado). Nunca
// debe romper el dashboard si /api/chart falla.

function renderSummary() {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <SummaryChart profileId="profile-1" />
    </NextIntlClientProvider>,
  );
}

// Sol en Leo casa 5 (sin dignidad), Luna en Cáncer casa 4 en domicilio,
// ascendente en Libra (longitud 200° → floor(200/30)=6 → ZODIAC_SIGNS[6]=libra).
const CHART_FIXTURE = {
  bodies: [
    { body: "sun", sign: "leo", house: 5, dignity: null, degree: 10, minute: 0, second: 0, longitude: 130, speed: 1, retrograde: false, signDegree: 10 },
    { body: "moon", sign: "cancer", house: 4, dignity: "domicile", degree: 3, minute: 0, second: 0, longitude: 93, speed: 12, retrograde: false, signDegree: 3 },
  ],
  // 12 cúspides reales (no []): ChartWheel (mapa compacto, pedido de Gio)
  // indexa las 12 casas para dibujar líneas/números — un chart real de
  // /api/chart siempre trae las 12; [] solo bastaba antes de sumar ChartWheel.
  houses: {
    system: "placidus",
    cusps: Array.from({ length: 12 }, (_, i) => (200 + i * 30) % 360),
    ascendant: 200,
    midheaven: 100,
  },
  aspects: [],
  distribution: {
    elements: { fire: 1, earth: 0, air: 0, water: 1 },
    modalities: { cardinal: 0, fixed: 2, mutable: 0 },
    polarities: { yang: 1, yin: 1 },
    dominantElement: "fire",
    dominantModality: "fixed",
  },
  patterns: [],
  meta: { julianDayUt: 1, julianDayEt: 1, utcHour: 0, zodiac: "tropical" },
};

describe("SummaryChart", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ chart: CHART_FIXTURE, solar: false }),
    })) as unknown as ReturnType<typeof vi.fn>;
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it("pide /api/chart natal del perfil y muestra los chips Sol/Luna/Ascendente + el resumen del núcleo", async () => {
    renderSummary();

    // Resumen: el mismo párrafo compuesto por composeCoreReading (fragmento
    // de Leo, reusado tal cual — no se reescribe prosa). Los fragmentos en
    // negrita ("Sol en Leo"/"Luna en Cáncer"/"Ascendente Libra") son texto
    // único, sin colisión con los chips (que separan glifo/nombre/signo en
    // nodos de texto distintos).
    await waitFor(() => expect(screen.getByText(/Sol en Leo/)).toBeInTheDocument());
    expect(screen.getByText(/Luna en Cáncer/)).toBeInTheDocument();
    expect(screen.getByText(/Ascendente Libra/)).toBeInTheDocument();
    expect(
      screen.getByText(/brillas simplemente por existir con el corazón abierto/),
    ).toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/chart",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ profileId: "profile-1", kind: "natal" }),
      }),
    );

    // Chips: Sol/Luna/Asc con su signo (además del párrafo, que también los menciona).
    expect(screen.getAllByText(/Leo/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Cáncer/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Libra/).length).toBeGreaterThan(0);

    // CTA a la lente completa.
    const link = screen.getByRole("link", { name: new RegExp(es.hoy.summaryChartCta) });
    expect(link).toHaveAttribute("href", "/carta");
  });

  it("pedido de Gio (tercera pasada, 'no se vea tan plano'): el mapa astral compacto (ChartWheel) se ve DE UNA, sin tocar nada", async () => {
    renderSummary();
    await waitFor(() => expect(screen.getByText(/Sol en Leo/)).toBeInTheDocument());

    // Visible por default: el SVG de la rueda ya está ahí sin haber clicado nada.
    expect(screen.getByRole("img", { name: /rueda/i })).toBeInTheDocument();
    const toggle = screen.getByRole("button", { name: es.hoy.summaryChartWheelHide });
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    // El toggle sigue ahí por si alguien prefiere ocultarla — no es un
    // one-way reveal, solo cambió el estado inicial.
    fireEvent.click(toggle);
    expect(screen.queryByRole("img", { name: /rueda/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: es.hoy.summaryChartWheelShow })).toHaveAttribute(
      "aria-expanded",
      "false",
    );

    fireEvent.click(screen.getByRole("button", { name: es.hoy.summaryChartWheelShow }));
    expect(screen.getByRole("img", { name: /rueda/i })).toBeInTheDocument();
  });

  it("un fetch fallido no rompe el dashboard: muestra un aviso suave y conserva el CTA", async () => {
    fetchMock = vi.fn(async () => {
      throw new Error("network");
    }) as unknown as ReturnType<typeof vi.fn>;
    global.fetch = fetchMock as unknown as typeof fetch;

    renderSummary();

    await waitFor(() => expect(screen.getByText(es.carta.errorChart)).toBeInTheDocument());
    expect(screen.getByRole("link", { name: new RegExp(es.hoy.summaryChartCta) })).toHaveAttribute(
      "href",
      "/carta",
    );
  });
});
