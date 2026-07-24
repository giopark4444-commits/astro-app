// Tarjeta-resumen de Numerología del dashboard (pedido de Gio: "te falta
// poner numerología, lo esencial") — a diferencia de summary-chart/-pillars/
// -horoscope (que piden a una API), esta computa client-side y sincrónico
// (computeNumerology es puro), así que no hay fetch que mockear: mismo
// harness que numeros-selection.test.tsx (mock de useProfiles + cómputo real
// en el propio test para no hardcodear un número a mano).
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { computeNumerology } from "@aluna/core";
import { profileToNumerologyInput, formatReduction } from "@/lib/numerology";
import es from "@/messages/es.json";
import { NUMBER_MEANINGS_ES } from "@/lib/content/numerology-es";
import { SummaryNumerology } from "../summary-numerology";

const mockState = vi.hoisted(() => ({
  active: null as null | { id: string; name: string; birth_date: string },
}));
vi.mock("@/lib/profiles/profiles-provider", () => ({
  useProfiles: () => ({ active: mockState.active }),
}));

const PROFILE = { id: "p1", name: "Fixture", birth_date: "1990-02-04" };

function renderSummary() {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <SummaryNumerology />
    </NextIntlClientProvider>,
  );
}

describe("SummaryNumerology", () => {
  it("sin perfil activo, no renderiza nada", () => {
    mockState.active = null;
    const { container } = renderSummary();
    expect(container).toBeEmptyDOMElement();
  });

  it("muestra el Camino de Vida (número + cálculo) + su essence YA escrita + CTA a /numeros", () => {
    mockState.active = PROFILE;
    const lifePath = computeNumerology(profileToNumerologyInput(PROFILE)).core.lifePath;

    renderSummary();

    expect(screen.getByText(es.hoy.summaryNumerologyTitle)).toBeInTheDocument();
    expect(screen.getByText(es.numerology.lifePath)).toBeInTheDocument();

    const meaning = NUMBER_MEANINGS_ES[lifePath.value];
    if (meaning) {
      expect(screen.getByText(meaning.essence)).toBeInTheDocument();
    } else {
      expect(screen.getByText(es.numerology.proseSoon)).toBeInTheDocument();
    }

    const link = screen.getByRole("link", { name: new RegExp(es.hoy.summaryNumerologyCta) });
    expect(link).toHaveAttribute("href", "/numeros");
  });

  it("el número principal es protagonista: anillo grande propio, no un chip chico junto al label (pedido de Gio)", () => {
    mockState.active = PROFILE;
    const lifePath = computeNumerology(profileToNumerologyInput(PROFILE)).core.lifePath;

    const { container } = renderSummary();

    // El número vive SOLO (sin el label pegado) en su propio nodo de texto —
    // ya no es "Camino de Vida · 11" en un chip chico.
    const heroN = screen.getByText(String(lifePath.value));
    expect(heroN).toBeInTheDocument();
    expect(heroN.className).toMatch(/numHeroN/);
    // El anillo que lo envuelve existe (el "protagonismo" visual).
    expect(container.querySelector('[class*="numHeroRing"]')).not.toBeNull();
    // El cálculo (3 → 3 → 5 → 11) sigue presente como caption, no desaparece.
    expect(screen.getByText(formatReduction(lifePath))).toBeInTheDocument();
  });

  it("no hace ningún fetch (computeNumerology es síncrono, sin red)", () => {
    mockState.active = PROFILE;
    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    renderSummary();

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
