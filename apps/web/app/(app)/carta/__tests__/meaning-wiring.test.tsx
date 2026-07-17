// Task 5 (capa de significados): la carta debe ser "tocable" — nombres de
// aspecto, glifos de planeta, signos, casas, dignidades y patrones abren el
// glosario vía <Meaning>. Este test cubre el caso mínimo obligado por el
// brief: en el tab Aspectos, "Trígono" es un botón (Meaning envuelve el
// label) que abre el BottomSheet (role="dialog") con la entrada del glosario.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
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

describe("CartaView — capa de significados (aspectos)", () => {
  it('"Trígono" es un botón que abre el glosario (dialog)', async () => {
    renderView();
    const trigger = await screen.findByRole("button", { name: "Trígono" });
    expect(trigger).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
