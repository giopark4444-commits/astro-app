import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";
import { TAROT_CARDS_ES } from "@/lib/content/tarot-es";
import { ManualEntry } from "../manual-entry";

// Modo manual (Tarot T3, spec §3): plantilla/libre → selector (sin
// duplicados, toggle invertida) → jumpers (opcional, máx 3) → lectura + chat
// → guardar. La reading-chat que se monta al final responde dormida en estos
// tests (mockFetch no simula proveedor) — el foco es el selector y el flujo.

function mockFetch() {
  global.fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    const u = String(url);
    if (u === "/api/tarot/reading-chat") {
      return {
        ok: true,
        status: 200,
        headers: { get: () => "application/json" },
        json: async () => ({ available: false }),
      } as unknown as Response;
    }
    if (u === "/api/tarot/readings") {
      const body = JSON.parse(String(init?.body));
      return {
        ok: true,
        status: 201,
        headers: { get: () => "application/json" },
        json: async () => ({ reading: { id: "r-manual", ...body } }),
      } as unknown as Response;
    }
    throw new Error(`fetch inesperado: ${u}`);
  }) as unknown as typeof fetch;
}

function renderManual(onClose = vi.fn()) {
  render(
    <NextIntlClientProvider locale="es" messages={es}>
      <ManualEntry onClose={onClose} />
    </NextIntlClientProvider>,
  );
  return onClose;
}

describe("ManualEntry", () => {
  it("plantilla 'Tres cartas': el selector impide duplicados y respeta el límite de 3 posiciones", async () => {
    mockFetch();
    renderManual();
    // "Tres cartas" ya viene activa por defecto.
    fireEvent.click(screen.getByRole("button", { name: es.tarot.manualTemplateContinue }));

    expect(await screen.findByText(es.tarot.manualSelectTitle)).toBeInTheDocument();
    expect(screen.getAllByTestId("manual-card-option").length).toBe(78);

    // Elige "El Loco" (primera del grid, orden canónico del mazo).
    fireEvent.click(screen.getAllByTestId("manual-card-option")[0]!);
    await waitFor(() => {
      // Ya no está disponible para elegir de nuevo: sin duplicados.
      expect(screen.getAllByTestId("manual-card-option").length).toBe(77);
    });
    expect(screen.getByText(TAROT_CARDS_ES.fool!.name)).toBeInTheDocument();

    // Completa las 3 posiciones.
    fireEvent.click(screen.getAllByTestId("manual-card-option")[0]!);
    fireEvent.click(screen.getAllByTestId("manual-card-option")[0]!);

    // Límite respetado: el grid deja de ofrecerse tras llenar las 3 posiciones.
    await waitFor(() => {
      expect(screen.queryAllByTestId("manual-card-option").length).toBe(0);
    });
    expect(screen.getByRole("button", { name: es.tarot.manualContinue })).toBeInTheDocument();
  });

  it("toggle invertida refleja el estado de la carta elegida", async () => {
    mockFetch();
    renderManual();
    fireEvent.click(screen.getByRole("button", { name: es.tarot.manualTemplateContinue }));
    fireEvent.click((await screen.findAllByTestId("manual-card-option"))[0]!);

    const toggle = screen.getByRole("button", { name: es.tarot.manualToggleReversed });
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
  });

  it("tirada libre de 5 cartas llega a la lectura con prosa y el chat dormido al final", async () => {
    mockFetch();
    renderManual();
    fireEvent.click(screen.getByRole("button", { name: es.tarot.manualTemplateFree }));
    // El stepper libre arranca en 3: sube a 5.
    fireEvent.click(screen.getByRole("button", { name: "+" }));
    fireEvent.click(screen.getByRole("button", { name: "+" }));
    expect(screen.getByText(es.tarot.manualFreeCountValue.replace("{n}", "5"))).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: es.tarot.manualTemplateContinue }));

    expect(await screen.findByText(es.tarot.manualSelectTitle)).toBeInTheDocument();
    for (let i = 0; i < 5; i++) {
      fireEvent.click((await screen.findAllByTestId("manual-card-option"))[0]!);
    }
    fireEvent.click(await screen.findByRole("button", { name: es.tarot.manualContinue }));

    // Jumpers: opcional, se salta.
    expect(await screen.findByText(es.tarot.manualJumpersTitle)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: es.tarot.manualJumpersContinue }));

    expect(await screen.findByText(es.tarot.readingTitle)).toBeInTheDocument();
    // Las 5 posiciones libres aparecen como "Carta 1".."Carta 5".
    for (let i = 1; i <= 5; i++) {
      expect(screen.getByText(es.tarot.manualFreePositionLabel.replace("{n}", String(i)))).toBeInTheDocument();
    }
    // El chat de la tirada se montó y respondió dormido (sin llaves en el test).
    expect(await screen.findByText(es.tarot.chatDormantTitle)).toBeInTheDocument();
  });

  it("con jumpers: elegir 1 carta que saltó la incluye en la lectura y la guarda como jumper", async () => {
    mockFetch();
    renderManual();
    fireEvent.click(screen.getByRole("button", { name: es.tarot.manualTemplateContinue }));
    for (let i = 0; i < 3; i++) {
      fireEvent.click((await screen.findAllByTestId("manual-card-option"))[0]!);
    }
    fireEvent.click(await screen.findByRole("button", { name: es.tarot.manualContinue }));

    expect(await screen.findByText(es.tarot.manualJumpersTitle)).toBeInTheDocument();
    fireEvent.click((await screen.findAllByTestId("manual-card-option"))[0]!);
    fireEvent.click(await screen.findByRole("button", { name: es.tarot.manualJumpersContinue }));

    expect(await screen.findByText(es.tarot.readingTitle)).toBeInTheDocument();
    expect(screen.getByText(es.tarot.manualJumpersReadingLabel)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: es.tarot.saveReading }));
    await waitFor(() => expect(screen.getByText(es.tarot.savedOk)).toBeInTheDocument());
  });

  it("'volver al umbral' llama onClose", async () => {
    mockFetch();
    const onClose = renderManual();
    fireEvent.click(screen.getByRole("button", { name: es.tarot.manualTemplateContinue }));
    for (let i = 0; i < 3; i++) {
      fireEvent.click((await screen.findAllByTestId("manual-card-option"))[0]!);
    }
    fireEvent.click(await screen.findByRole("button", { name: es.tarot.manualContinue }));
    fireEvent.click(await screen.findByRole("button", { name: es.tarot.manualJumpersContinue }));
    fireEvent.click(await screen.findByRole("button", { name: es.tarot.readingBack }));
    expect(onClose).toHaveBeenCalled();
  });
});
