import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";
import { AreaReadingSheet } from "../area-reading-sheet";

// BottomSheet + fetch NO-stream a /api/area-reading (a diferencia del chat/
// chart-reading, la mini-lectura llega completa de una sola vez). Cubre los 4
// estados del patrón del repo: cargando / lista / dormida (available:false) /
// nublada (error).

function renderSheet(props: Partial<Parameters<typeof AreaReadingSheet>[0]> = {}) {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <AreaReadingSheet
        open
        onClose={() => {}}
        area="love"
        label={es.hoy.areaLove}
        score={72}
        toneLabel={es.hoy.toneHigh}
        profileId="profile-1"
        {...props}
      />
    </NextIntlClientProvider>,
  );
}

describe("AreaReadingSheet", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it("nombre del área + score visibles de inmediato, con la frase de carga mientras resuelve", () => {
    fetchMock.mockReturnValue(new Promise(() => {})); // nunca resuelve: queda en "loading"
    renderSheet();

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(es.hoy.areaLove)).toBeInTheDocument();
    expect(screen.getByText("72")).toBeInTheDocument();
    expect(screen.getByText(es.hoy.areaReadingLoading)).toBeInTheDocument();
  });

  it("envía profileId/area/period:'today'/locale al montar", () => {
    fetchMock.mockReturnValue(new Promise(() => {}));
    renderSheet();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/area-reading");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toMatchObject({ profileId: "profile-1", area: "love", period: "today", locale: "es" });
  });

  it("lista: pinta la lectura y el consejo, y el CTA navega a /preguntar?q=", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ available: true, reading: "Una lectura cálida.", tip: "Respira hondo hoy." }),
    });
    renderSheet();

    await waitFor(() => expect(screen.getByText("Una lectura cálida.")).toBeInTheDocument());
    expect(screen.getByText("Respira hondo hoy.")).toBeInTheDocument();
    expect(screen.getByText(es.hoy.areaReadingTipLabel.trim())).toBeInTheDocument();

    const cta = screen.getByRole("link", { name: es.hoy.areaReadingCta });
    expect(cta.getAttribute("href")).toBe(`/preguntar?q=${encodeURIComponent("¿Cómo está mi vida amorosa esta semana?")}`);
  });

  it("dormida: available:false pinta el estado dormido discreto (patrón del repo)", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ available: false }) });
    renderSheet();

    await waitFor(() => expect(screen.getByText(es.hoy.areaReadingDormantTitle)).toBeInTheDocument());
    expect(screen.getByText(es.hoy.areaReadingDormantBody)).toBeInTheDocument();
  });

  it("nublada: fetch que falla (red) muestra 'Algo se nubló…'", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));
    renderSheet();

    await waitFor(() => expect(screen.getByText(es.hoy.areaReadingError)).toBeInTheDocument());
  });

  it("nublada: respuesta no-ok sin available:false también cae a error", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, json: async () => ({ error: "compute" }) });
    renderSheet();

    await waitFor(() => expect(screen.getByText(es.hoy.areaReadingError)).toBeInTheDocument());
  });

  it("area null: no renderiza nada", () => {
    const { container } = renderSheet({ area: null });
    expect(container.firstChild).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refetch al cambiar de área con el sheet ya abierto", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ available: true, reading: "Lectura de amor.", tip: "Consejo de amor." }),
    });
    const { rerender } = renderSheet({ area: "love" });
    await waitFor(() => expect(screen.getByText("Lectura de amor.")).toBeInTheDocument());

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ available: true, reading: "Lectura de dinero.", tip: "Consejo de dinero." }),
    });
    rerender(
      <NextIntlClientProvider locale="es" messages={es}>
        <AreaReadingSheet
          open
          onClose={() => {}}
          area="money"
          label={es.hoy.areaMoney}
          score={40}
          toneLabel={es.hoy.toneLow}
          profileId="profile-1"
        />
      </NextIntlClientProvider>,
    );

    await waitFor(() => expect(screen.getByText("Lectura de dinero.")).toBeInTheDocument());
    expect(screen.queryByText("Lectura de amor.")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
