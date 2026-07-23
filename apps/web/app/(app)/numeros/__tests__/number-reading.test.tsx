// Task 7: selector de modo 🌙/📚/🔭 montado arriba del texto generado en
// NumberReading — cambiarlo re-dispara la MISMA ruta de carga (choose(tier))
// para pedir la lectura en el tono nuevo. Mismo patrón que
// carta/__tests__/body-reading.test.tsx (componente hermano, mismo mecanismo).
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";
import { NumberReading } from "../number-reading";

const BASE = { essence: "Esencia base.", flow: "Don base.", shadow: "Sombra base.", practice: "Práctica base." };

function renderView() {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <NumberReading value={11} position="lifePath" calc="1+9+9+0=19→10→1" profileName="Gio" meaning={BASE} />
    </NextIntlClientProvider>,
  );
}

describe("NumberReading — selector de modo 🌙/📚/🔭 (Task 7)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("se monta arriba del texto generado con los 3 chips de modo", () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {})) as unknown as typeof fetch;
    renderView();
    expect(screen.getByRole("radiogroup", { name: es.settings.voiceModeTitle })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: new RegExp(es.settings.voiceMode_intima) })).toBeInTheDocument();
  });

  it("con una lectura ya pedida (tier Profunda), cambiar de modo vuelve a llamar /api/reading con el voiceMode nuevo", async () => {
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

    fireEvent.click(screen.getByRole("radio", { name: new RegExp(es.settings.voiceMode_pro) }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const secondBody = JSON.parse(fetchMock.mock.calls[1]![1]!.body as string);
    expect(secondBody.voiceMode).toBe("pro");
    expect(secondBody.length).toBe("profunda");
  });

  it("en tier Esencia (nada pedido a la red todavía), cambiar de modo NO dispara ningún fetch", () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    renderView();

    fireEvent.click(screen.getByRole("radio", { name: new RegExp(es.settings.voiceMode_estudio) }));

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
