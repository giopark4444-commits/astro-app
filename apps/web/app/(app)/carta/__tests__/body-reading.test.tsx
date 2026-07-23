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
