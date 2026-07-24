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
import { profileToNumerologyInput } from "@/lib/numerology";
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
    expect(screen.getByText(new RegExp(`${es.numerology.lifePath}.*${lifePath.value}`))).toBeInTheDocument();

    const meaning = NUMBER_MEANINGS_ES[lifePath.value];
    if (meaning) {
      expect(screen.getByText(meaning.essence)).toBeInTheDocument();
    } else {
      expect(screen.getByText(es.numerology.proseSoon)).toBeInTheDocument();
    }

    const link = screen.getByRole("link", { name: new RegExp(es.hoy.summaryNumerologyCta) });
    expect(link).toHaveAttribute("href", "/numeros");
  });

  it("no hace ningún fetch (computeNumerology es síncrono, sin red)", () => {
    mockState.active = PROFILE;
    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    renderSummary();

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
