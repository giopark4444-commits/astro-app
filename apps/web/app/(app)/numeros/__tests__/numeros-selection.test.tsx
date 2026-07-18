// Integración del maestro-detalle de Números: la vista recableada al patrón
// panel/sheet. Harness = molde de carta/pilares-selection (mock de useProfiles
// con perfil de fecha fija + matchMedia). Números NO hace fetch (computeNumerology
// es síncrono), así que no hay mock de fetch. Verifica los 5 comportamientos del
// brief (Task 3):
//   1. aterriza con Camino de Vida en el panel (número + cálculo)
//   2. clic en la lente Expresión → el panel cambia al número de expresión
//   3. Modo Pro inmediato → el panel gana los tiers y la izquierda revela las lecciones
//   4. cambiar de perfil resetea la selección al Camino de Vida
//   5. móvil (matchMedia true): clic en la lente → dialog con tiers AUN sin Pro
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { computeNumerology } from "@aluna/core";
import { profileToNumerologyInput, formatReduction } from "@/lib/numerology";
import es from "@/messages/es.json";
import { NumerologyView } from "../numerology-view";

// Holder mutable para cambiar el perfil activo entre renders (test 4).
const mockState = vi.hoisted(() => ({
  active: null as null | { id: string; name: string; birth_date: string },
}));
vi.mock("@/lib/profiles/profiles-provider", () => ({
  useProfiles: () => ({ active: mockState.active }),
}));

const PROFILE_A = { id: "p1", name: "Fixture", birth_date: "1990-02-04" };
const PROFILE_B = { id: "p2", name: "Otra Persona", birth_date: "1985-11-27" };

const resultOf = (p: { name: string; birth_date: string }) =>
  computeNumerology(profileToNumerologyInput(p));

function renderView() {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <NumerologyView />
    </NextIntlClientProvider>,
  );
}

const getPanel = (c: HTMLElement) => c.querySelector('[class*="interpPanel"]') as HTMLElement | null;
const panelN = (panel: HTMLElement) => panel.querySelector('[class*="sheetN"]')?.textContent ?? "";
const panelCalc = (panel: HTMLElement) => panel.querySelector('[class*="calcMini"]')?.textContent ?? "";

beforeEach(() => {
  mockState.active = PROFILE_A;
  // Default: desktop → el router escribe el panel derecho (setSelected), no el sheet.
  vi.stubGlobal("matchMedia", (q: string) => ({
    matches: false,
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
});

describe("NumerologyView — maestro-detalle (panel/sheet)", () => {
  it("aterriza con Camino de Vida en el panel (número + cálculo)", () => {
    const r = resultOf(PROFILE_A);
    const { container } = renderView();

    const panel = getPanel(container)!;
    expect(panel).toBeTruthy();
    // Sin selección aún, el panel deriva el default = Camino de Vida.
    expect(panelN(panel)).toBe(String(r.core.lifePath.value));
    expect(panelCalc(panel)).toContain(es.numerology.yourCalc);
    expect(panelCalc(panel)).toContain(formatReduction(r.core.lifePath));
  });

  it("clic en la lente Expresión → el panel cambia al número de expresión", () => {
    const r = resultOf(PROFILE_A);
    const { container } = renderView();
    const panel = getPanel(container)!;

    // Aterriza en Camino de Vida.
    expect(panelCalc(panel)).toContain(formatReduction(r.core.lifePath));

    // Clic en la lente "Expresión" (botón del núcleo).
    fireEvent.click(screen.getByRole("button", { name: /Expresión/ }));

    // El panel pasa a interpretar la expresión: su número y su cálculo.
    expect(panelN(panel)).toBe(String(r.core.expression.value));
    expect(panelCalc(panel)).toContain(formatReduction(r.core.expression));
  });

  it("Modo Pro inmediato → el panel gana los tiers y la izquierda revela las lecciones", () => {
    const { container } = renderView();
    const panel = getPanel(container)!;

    // SIN Pro: el panel-Camino de Vida no muestra el selector de niveles, y la
    // izquierda no monta el bloque de lecciones kármicas.
    expect(within(panel).queryByRole("tab", { name: /Esencia/ })).toBeNull();
    expect(screen.queryByText(es.numerology.karmicLessons)).toBeNull();

    // Encender Modo Pro (un solo toggle, visible en ambos viewports).
    fireEvent.click(screen.getByRole("button", { name: es.numerology.pro }));

    // CON Pro: el panel gana los tiers (NumberReading) y la izquierda revela
    // las lecciones kármicas.
    expect(within(panel).getByRole("tab", { name: /Esencia/ })).toBeTruthy();
    expect(screen.getByText(es.numerology.karmicLessons)).toBeTruthy();
  });

  it("cambiar de perfil resetea la selección al Camino de Vida", async () => {
    const rA = resultOf(PROFILE_A);
    const rB = resultOf(PROFILE_B);
    const { container, rerender } = renderView();
    const panel = getPanel(container)!;

    // Seleccionar la Expresión del perfil A.
    fireEvent.click(screen.getByRole("button", { name: /Expresión/ }));
    expect(panelCalc(panel)).toContain(formatReduction(rA.core.expression));

    // Cambiar el perfil activo → rerender.
    mockState.active = PROFILE_B;
    rerender(
      <NextIntlClientProvider locale="es" messages={es}>
        <NumerologyView />
      </NextIntlClientProvider>,
    );

    // El panel vuelve al Camino de Vida (del nuevo perfil), ya no la expresión
    // stale del perfil A.
    await waitFor(() => {
      const p = getPanel(container)!;
      expect(panelCalc(p)).toContain(formatReduction(rB.core.lifePath));
    });
  });

  it("móvil (matchMedia true): clic en la lente → dialog con tiers AUN sin Pro", async () => {
    // matches:true para "(max-width: 1079px)" = móvil → el router abre el sheet.
    vi.stubGlobal("matchMedia", (q: string) => ({
      matches: q.includes("max-width: 1079px"),
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    renderView();

    // Clic en la lente "Expresión" → abre el bottom-sheet (sin encender Pro).
    fireEvent.click(screen.getByRole("button", { name: /Expresión/ }));

    const dialog = await screen.findByRole("dialog");
    // El sheet fija pro=true → NumberReading completo con selector de niveles,
    // aunque el toggle de Pro esté apagado (regresión-cero del sheet de hoy).
    expect(within(dialog).getByRole("tab", { name: /Esencia/ })).toBeTruthy();
    // Y su título es la posición seleccionada.
    expect(within(dialog).getByText(es.numerology.expression)).toBeTruthy();
  });
});
