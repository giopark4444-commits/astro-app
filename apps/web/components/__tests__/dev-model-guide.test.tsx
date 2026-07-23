import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { DevModelGuide } from "@/components/dev-model-guide";

// La guía es hermana del picker: visible solo si /api/dev-models responde
// enabled; en producción (404) no renderiza nada.

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetch(payload: unknown, ok = true) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok, json: () => Promise.resolve(payload) }),
  );
}

describe("DevModelGuide", () => {
  it("no renderiza nada si la ruta dev responde 404 (producción)", async () => {
    stubFetch(null, false);
    const { container } = render(<DevModelGuide />);
    await waitFor(() => expect(container.innerHTML).toBe(""));
  });

  it("muestra el mapa de rubros con estado de llave por proveedor", async () => {
    stubFetch({
      enabled: true,
      providers: [
        { id: "openai", hasKey: true },
        { id: "gemini", hasKey: true },
        { id: "anthropic", hasKey: false },
        { id: "hermes", hasKey: false },
      ],
    });
    render(<DevModelGuide />);
    await screen.findByTestId("dev-model-guide");
    expect(screen.getByText(/Guía de modelos por rubro/)).toBeTruthy();
    // Rubros clave presentes
    expect(screen.getByText(/Chat \(Pregúntale a Aluna \+ tirada\)/)).toBeTruthy();
    expect(screen.getByText(/Horóscopo diario \+ volumen/)).toBeTruthy();
    // Estado de llaves: openai/gemini listas (chat, lectura, horóscopo, mano-proto)
    // y anthropic/hermes faltantes (mano-prod, tarot, volumen)
    expect(screen.getAllByText("🟢 llave lista").length).toBe(4);
    expect(screen.getAllByText("⚪ falta llave").length).toBe(3);
  });
});
