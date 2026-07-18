// Task 4 (maestro-detalle): PilaresView recableada al patrón panel/sheet.
// Harness = molde de meaning-wiring.test.tsx (mock de useProfiles + fetch
// /api/bazi + NextIntl). matchMedia queda en el default del setup (matches
// false = DESKTOP) → el router `select` escribe en el panel derecho, no en el
// bottom-sheet. Verifica los 3 comportamientos del brief:
//   1. aterriza con la Lectura en el panel y responde a la selección
//   2. Modo Pro tiene efecto inmediato en el aterrizaje
//   3. cambiar de perfil resetea la selección
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";
import { PilaresView } from "../pilares-view";
import type { BaZiData } from "../types";

// Holder mutable para poder cambiar el perfil activo entre renders (test 3).
// vi.hoisted lo inicializa ANTES de que corra la factory de vi.mock (que se
// evalúa al importar PilaresView → profiles-provider).
const mockState = vi.hoisted(() => ({ active: null as null | { id: string; name: string } }));
vi.mock("@/lib/profiles/profiles-provider", () => ({
  useProfiles: () => ({ active: mockState.active }),
}));

const FIXTURE_PROFILE = { id: "p1", name: "Fixture" };

// Set determinista: día 甲子 (misma referencia que interpretation-content.test).
const DATA: BaZiData = {
  year: { stem: 5, branch: 3 }, // 己卯
  month: { stem: 2, branch: 0 }, // 丙子
  day: { stem: 0, branch: 0 }, // 甲子 — Maestro del Día 甲
  hour: { stem: 9, branch: 11 }, // 癸亥
  solarYear: 2000,
  timeKnown: true,
  gender: "feminine",
  birthYear: 2000,
  daysToPrevJie: 10,
  daysToNextJie: 20,
};

beforeEach(() => {
  mockState.active = FIXTURE_PROFILE;
  global.fetch = vi.fn(async () => ({
    ok: true,
    json: async () => DATA,
  })) as unknown as typeof fetch;
});

function renderView() {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <PilaresView />
    </NextIntlClientProvider>,
  );
}

const getPanel = (c: HTMLElement) => c.querySelector('[class*="interpPanel"]') as HTMLElement | null;

describe("PilaresView — maestro-detalle (panel/sheet)", () => {
  it("aterriza con la Lectura en el panel y responde a la selección", async () => {
    const { container } = renderView();
    // El panel de interpretación aparece cuando llegan los datos.
    await screen.findByText(es.pilares.interpTitle);
    const panel = getPanel(container)!;
    expect(panel).toBeTruthy();

    // Aterriza en la Lectura: el panel NO muestra aún el detalle de un pilar.
    expect(within(panel).queryByText(es.pilares.dayMaster)).toBeNull();

    // Clic en el label "Día" (grid) → el panel pasa a interpretar el pilar del
    // día: glifo contiguo 甲子 + su rol (Maestro del Día).
    fireEvent.click(screen.getByRole("button", { name: es.pilares.day }));
    expect(within(panel).getByText(/甲子/)).toBeTruthy();
    expect(within(panel).getByText(es.pilares.dayMaster)).toBeTruthy();
  });

  it("Modo Pro tiene efecto inmediato en el aterrizaje", async () => {
    const { container } = renderView();
    await screen.findByText(es.pilares.interpTitle);

    // SIN pro: el panel-lectura no muestra el bloque técnico, y la tab pro-only
    // "Interacciones" no existe en el riel.
    expect(screen.queryByText(es.pilares.interpPillarsTech)).toBeNull();
    expect(screen.queryByRole("tab", { name: es.pilares.interactionsTitle })).toBeNull();

    // Encender Modo Pro.
    fireEvent.click(screen.getAllByRole("button", { name: /Modo Pro/ })[0]!);

    // CON pro: el panel-lectura gana el bloque técnico + los tiers de lectura,
    // y el riel de tabs recupera "Interacciones".
    await screen.findByText(es.pilares.interpPillarsTech);
    expect(screen.getByRole("tab", { name: es.pilares.interactionsTitle })).toBeTruthy();
    const panel = getPanel(container)!;
    expect(within(panel).getByRole("tab", { name: /Esencia/ })).toBeTruthy();
  });

  it("cambiar de perfil resetea la selección", async () => {
    const { container, rerender } = renderView();
    await screen.findByText(es.pilares.interpTitle);

    // Seleccionar el pilar del día.
    fireEvent.click(screen.getByRole("button", { name: es.pilares.day }));
    expect(within(getPanel(container)!).getByText(es.pilares.dayMaster)).toBeTruthy();

    // Cambiar el perfil activo → rerender.
    mockState.active = { id: "p2", name: "Otro" };
    rerender(
      <NextIntlClientProvider locale="es" messages={es}>
        <PilaresView />
      </NextIntlClientProvider>,
    );

    // El panel vuelve a la Lectura (ya no muestra el detalle del pilar del día).
    await waitFor(() => {
      const panel = getPanel(container);
      expect(panel).toBeTruthy();
      expect(within(panel!).queryByText(es.pilares.dayMaster)).toBeNull();
    });
  });

  it("el panel no renderiza si active es null (perfil borrado)", async () => {
    const { container, rerender } = renderView();
    await screen.findByText(es.pilares.interpTitle);

    // Borrar el perfil activo → null.
    mockState.active = null;
    rerender(
      <NextIntlClientProvider locale="es" messages={es}>
        <PilaresView />
      </NextIntlClientProvider>,
    );

    // El componente retorna null: no hay contenido, no hay error.
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });
});
