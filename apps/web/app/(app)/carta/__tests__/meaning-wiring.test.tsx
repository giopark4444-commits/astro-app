// Capa de significados tras el maestro-detalle. Con el recableado (T4) la carta
// tiene DOS gestos distintos sobre la columna técnica:
//   1. Selección — las celdas de la tabla de posiciones y las filas del
//      aspectario son <button> que eligen qué leer en el panel/sheet. YA NO
//      abren el mini-glosario <Meaning> celda-a-celda.
//   2. Glosario — lo que queda envuelto en <Meaning> (etiquetas de
//      elemento/modalidad de las barras de Balance) sigue abriendo la hoja del
//      glosario (role="dialog").
// Este test fija ambos contratos para que no regresen.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { BodyPosition, ChartResult } from "@aluna/core";
import es from "@/messages/es.json";
import { CartaView } from "../carta-view";

const FIXTURE_PROFILE = {
  id: "p1",
  name: "Fixture",
  birth_date: "1990-01-01",
  birth_time: "12:00",
  time_known: true,
  place_name: "Bogotá",
  latitude: 4.7,
  longitude: -74.1,
  time_zone: "America/Bogota",
  gender: "x",
};

vi.mock("@/lib/profiles/profiles-provider", () => ({ useProfiles: () => ({ active: FIXTURE_PROFILE }) }));

function body(overrides: Partial<BodyPosition> & { body: string }): BodyPosition {
  return {
    longitude: 0, signDegree: 0, degree: 0, minute: 0, second: 0,
    speed: 1, retrograde: false, house: 1, dignity: null, sign: "aries",
    ...overrides,
  };
}

function makeChart(overrides: Partial<ChartResult> = {}): ChartResult {
  return {
    bodies: [
      body({ body: "sun", sign: "leo", house: 5, dignity: "domicile" }),
      body({ body: "moon", sign: "cancer", house: 4, dignity: "domicile" }),
    ],
    houses: {
      system: "placidus",
      cusps: [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330],
      ascendant: 0,
      midheaven: 270,
    },
    aspects: [{ a: "sun", b: "moon", aspect: "trine", angle: 120, orb: 2.1, applying: true, harmony: "soft" }],
    distribution: {
      elements: { fire: 3, earth: 1, air: 0, water: 3 },
      modalities: { cardinal: 2, fixed: 3, mutable: 2 },
      polarities: { yang: 4, yin: 3 },
      dominantElement: "fire",
      dominantModality: "fixed",
    },
    patterns: [],
    meta: { julianDayUt: 2451545, julianDayEt: 2451545.0007, utcHour: 12, zodiac: "tropical" },
    ...overrides,
  };
}

const CHART = makeChart();

beforeEach(() => {
  global.fetch = vi.fn(async () => ({
    ok: true,
    json: async () => ({ chart: CHART, solar: false, transitAspects: [] }),
  })) as unknown as typeof fetch;
});

function renderView() {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <CartaView />
    </NextIntlClientProvider>,
  );
}

describe("CartaView — capa de significados y selección", () => {
  it("la fila del aspectario es un botón de selección, no un <Meaning> de glosario", async () => {
    renderView();
    const aspSection = (await screen.findByRole("heading", { name: "Aspectos", level: 3 })).closest("section") as HTMLElement;
    // "Trígono" vive dentro de la fila del aspectario, que es un <button>.
    const row = within(aspSection).getByRole("button", { name: /Trígono/ });
    expect(row.tagName).toBe("BUTTON");
    // Seleccionar NO abre el glosario (eso es del <Meaning>): sin diálogo.
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(row);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("las celdas de la tabla de posiciones son botones de selección", async () => {
    renderView();
    const posSection = (await screen.findByRole("heading", { name: "Posiciones", level: 3 })).closest("section") as HTMLElement;
    // Cuerpo, signo y casa del Sol son tres botones seleccionables (no <Meaning>).
    expect(within(posSection).getByRole("button", { name: /Sol/ }).tagName).toBe("BUTTON");
    expect(within(posSection).getByRole("button", { name: /Leo/ }).tagName).toBe("BUTTON");
    expect(within(posSection).getByRole("button", { name: "Casa 5" }).tagName).toBe("BUTTON");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it('las barras de Balance conservan <Meaning>: "Fuego" abre el glosario (dialog)', async () => {
    renderView();
    // La etiqueta de elemento "Fuego" sigue envuelta en <Meaning> (aparece en
    // el núcleo y en el pane de balance): tomamos la primera.
    const trigger = (await screen.findAllByRole("button", { name: "Fuego" }))[0]!;
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
