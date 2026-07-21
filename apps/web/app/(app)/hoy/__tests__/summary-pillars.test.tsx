import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";
import { SummaryPillars } from "../summary-pillars";

// Task 5: tarjeta-resumen de /pilares — pide /api/bazi y reusa la esencia YA
// compuesta por composeBaziReading (client-safe, @aluna/core), sin reescribirla.

function renderSummary() {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <SummaryPillars profileId="profile-1" />
    </NextIntlClientProvider>,
  );
}

// Los 4 pilares en jia/zi (甲子): Maestro del Día = jia (Madera yang), rama de
// día = zi (la Rata). Con año/mes/día repitiendo el mismo par, el elemento
// dominante del conjunto también es Madera (empate wood/water resuelto por el
// orden canónico wood→...→water en dominantElement, packages/core/bazi/reading.ts).
const PILLARS_FIXTURE = {
  year: { stem: 0, branch: 0 },
  month: { stem: 0, branch: 0 },
  day: { stem: 0, branch: 0 },
  hour: null,
};

describe("SummaryPillars", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => PILLARS_FIXTURE,
    })) as unknown as ReturnType<typeof vi.fn>;
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it("pide /api/bazi y muestra la esencia de composeBaziReading + CTA a /pilares", async () => {
    renderSummary();

    await waitFor(() =>
      expect(
        screen.getByText(/Roble al amanecer: creces derecho aunque el viento diga otra cosa/),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText(/domina el elemento Madera/)).toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/bazi",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ profileId: "profile-1" }),
      }),
    );

    expect(screen.getByText(es.hoy.summaryPillarsTitle)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: new RegExp(es.hoy.summaryPillarsCta) });
    expect(link).toHaveAttribute("href", "/pilares");
  });

  it("un fetch fallido no rompe el dashboard: aviso suave + CTA intacto", async () => {
    fetchMock = vi.fn(async () => {
      throw new Error("network");
    }) as unknown as ReturnType<typeof vi.fn>;
    global.fetch = fetchMock as unknown as typeof fetch;

    renderSummary();

    await waitFor(() => expect(screen.getByText(es.pilares.error)).toBeInTheDocument());
    expect(screen.getByRole("link", { name: new RegExp(es.hoy.summaryPillarsCta) })).toHaveAttribute(
      "href",
      "/pilares",
    );
  });
});
