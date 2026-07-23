import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";
import { DeckManager } from "../deck-manager";

// Sección "Tu mazo" (Tarot T4 Task 5): la subida es LATENTE sin Supabase
// Storage — GET /api/tarot/deck responde {available:false} hasta que exista
// SUPABASE_SERVICE_ROLE_KEY. Estos tests cubren que la UI maneje ese estado
// con gracia (nota + controles deshabilitados), sin romperse, y que el
// toggle "usar mi mazo" quede deshabilitado sin contenido incluso cuando
// el manifiesto SÍ está disponible.

function renderManager() {
  render(
    <NextIntlClientProvider locale="es" messages={es}>
      <DeckManager />
    </NextIntlClientProvider>,
  );
}

function mockFetchOnce(body: unknown, ok = true) {
  global.fetch = vi.fn(async () => ({ ok, json: async () => body })) as unknown as typeof fetch;
}

describe("DeckManager", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("estado latente ({available:false}): muestra la nota y deshabilita el toggle sin romperse", async () => {
    mockFetchOnce({ available: false });
    renderManager();

    await waitFor(() => expect(screen.getByText(es.settings.deckLatentNote)).toBeInTheDocument());

    const toggleButtons = screen.getAllByRole("button", { name: /^(Encendido|Apagado)$/ });
    expect(toggleButtons.length).toBeGreaterThan(0);
    for (const btn of toggleButtons) expect(btn).toBeDisabled();
  });

  it("manifiesto disponible pero sin cartas ni reverso: el toggle 'usar mi mazo' sigue deshabilitado y no muestra la nota latente", async () => {
    mockFetchOnce({ available: true, active: false, cardIds: [], backKind: "none", backUrl: null });
    renderManager();

    await waitFor(() => expect(screen.queryByText(es.settings.deckLatentNote)).not.toBeInTheDocument());

    const toggleButtons = screen.getAllByRole("button", { name: /^(Encendido|Apagado)$/ });
    for (const btn of toggleButtons) expect(btn).toBeDisabled();
  });

  it("un fallo de red se trata igual que el estado latente (no rompe la UI)", async () => {
    global.fetch = vi.fn(async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;
    renderManager();

    await waitFor(() => expect(screen.getByText(es.settings.deckLatentNote)).toBeInTheDocument());
  });

  it("renderiza las 78 miniaturas del mazo RWS por defecto", async () => {
    mockFetchOnce({ available: true, active: false, cardIds: [], backKind: "none", backUrl: null });
    renderManager();

    await waitFor(() => expect(screen.queryByText(es.settings.deckLatentNote)).not.toBeInTheDocument());
    const thumbs = screen.getAllByRole("img");
    expect(thumbs.length).toBe(78);
  });
});
