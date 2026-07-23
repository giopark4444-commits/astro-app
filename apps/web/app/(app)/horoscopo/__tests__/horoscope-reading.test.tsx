// Task 7: selector de modo 🌙/📚/🔭 montado arriba del texto generado en
// HoroscopeReading. A diferencia de body/number/bazi-reading (que disparan la
// carga con un `choose()` imperativo), acá el fetch vive en un useEffect
// reactivo a `tier` — el onChange bumpea un contador (modeReloadKey) que es
// dependencia extra del efecto, re-ejecutándolo con getVoiceMode() actualizado.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";
import { HoroscopeReading } from "../horoscope-reading";

function renderView() {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <HoroscopeReading sign="aquarius" period="today" tz="utc" essence={["Frase base uno.", "Frase base dos."]} />
    </NextIntlClientProvider>,
  );
}

describe("HoroscopeReading — selector de modo 🌙/📚/🔭 (Task 7)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("se monta arriba del texto generado con los 3 chips de modo", () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {})) as unknown as typeof fetch;
    renderView();
    expect(screen.getByRole("radiogroup", { name: es.settings.voiceModeTitle })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: new RegExp(es.settings.voiceMode_intima) })).toBeInTheDocument();
  });

  it("con una lectura ya pedida (tier Profunda), cambiar de modo vuelve a llamar /api/horoscope-reading con el voiceMode nuevo", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => "application/json" },
      json: async () => ({ available: true, meaning: { reading: "Lectura tejida." } }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    renderView();

    fireEvent.click(screen.getByRole("tab", { name: es.numerology.reading.tierDeep }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(JSON.parse(fetchMock.mock.calls[0]![1]!.body as string).voiceMode).toBe("intima");
    await screen.findByText("Lectura tejida.");

    fireEvent.click(screen.getByRole("radio", { name: new RegExp(es.settings.voiceMode_pro) }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const secondBody = JSON.parse(fetchMock.mock.calls[1]![1]!.body as string);
    expect(secondBody.voiceMode).toBe("pro");
    expect(secondBody.length).toBe("profunda"); // el mismo tier de antes
  });

  it("en tier Esencia (nada pedido a la red todavía), cambiar de modo NO dispara ningún fetch", () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    renderView();

    fireEvent.click(screen.getByRole("radio", { name: new RegExp(es.settings.voiceMode_estudio) }));

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
