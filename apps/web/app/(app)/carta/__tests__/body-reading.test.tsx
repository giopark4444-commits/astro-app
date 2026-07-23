// Task 8b: las lentes (chart-reading/area-reading/bazi-reading/horoscope-reading)
// mandan `premium` en el body leyendo el MISMO toggle ✨ global del chat
// (localStorage "aluna:premium", vía readPremiumFlagForRequest). Este test fija
// el contrato para <BodyReadingView> (carta); las otras 3 lentes repiten el
// mismo patrón de una línea en su propio fetch.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";
import { BodyReadingView } from "../body-reading";

const BASE = { essence: "Esencia base.", flow: "Don base.", shadow: "Sombra base." };

function renderView() {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <BodyReadingView
        base={BASE}
        body="sun"
        sign="aries"
        house={1}
        dignity={null}
        profileName="Gio"
      />
    </NextIntlClientProvider>,
  );
}

describe("BodyReadingView — flag premium del toggle global", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    window.localStorage.clear();
    fetchMock = vi.fn().mockReturnValue(new Promise(() => {})); // nunca resuelve: solo nos interesa el body enviado
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it("localStorage aluna:premium ausente → manda premium:false", async () => {
    renderView();
    fireEvent.click(screen.getByRole("tab", { name: es.numerology.reading.tierDeep }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const body = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(body.premium).toBe(false);
  });

  it("localStorage aluna:premium=1 (toggle ✨ encendido en el chat) → manda premium:true", async () => {
    window.localStorage.setItem("aluna:premium", "1");
    renderView();
    fireEvent.click(screen.getByRole("tab", { name: es.numerology.reading.tierDeep }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const body = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(body.premium).toBe(true);
  });
});

// Task 7: selector de modo 🌙/📚/🔭 montado arriba del texto generado —
// cambiarlo re-dispara la MISMA ruta de carga (choose(tier)) para pedir la
// lectura en el tono nuevo; el cache del tier/modo anterior queda intacto
// (misma Map, solo cambia la key con la que se lee/escribe).
describe("BodyReadingView — selector de modo 🌙/📚/🔭 (Task 7)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("se monta arriba del texto generado con los 3 chips de modo", () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {})) as unknown as typeof fetch;
    renderView();
    expect(screen.getByRole("radiogroup", { name: es.settings.voiceModeTitle })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: new RegExp(es.settings.voiceMode_intima) })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: new RegExp(es.settings.voiceMode_estudio) })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: new RegExp(es.settings.voiceMode_pro) })).toBeInTheDocument();
  });

  it("con una lectura ya pedida (tier Profunda), cambiar de modo vuelve a llamar /api/chart-reading con el voiceMode nuevo", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => "application/json" },
      json: async () => ({ available: true, meaning: BASE }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    renderView();

    fireEvent.click(screen.getByRole("tab", { name: es.numerology.reading.tierDeep }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(JSON.parse(fetchMock.mock.calls[0]![1]!.body as string).voiceMode).toBe("intima");

    fireEvent.click(screen.getByRole("radio", { name: new RegExp(es.settings.voiceMode_estudio) }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const secondBody = JSON.parse(fetchMock.mock.calls[1]![1]!.body as string);
    expect(secondBody.voiceMode).toBe("estudio");
    expect(secondBody.length).toBe("profunda"); // el mismo tier de antes, no vuelve a Esencia
  });

  it("en tier Esencia (nada pedido a la red todavía), cambiar de modo NO dispara ningún fetch", () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    renderView();

    fireEvent.click(screen.getByRole("radio", { name: new RegExp(es.settings.voiceMode_pro) }));

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
