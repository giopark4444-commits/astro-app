import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { AreaDriver, LifeArea, ScoreTone } from "@aluna/core";
import es from "@/messages/es.json";
import { EnergyPanel } from "../energy-panel";

// Regresión T6 (review gap): AreaBars por sí sola quedó como componente
// controlado y no puede reproducir el bug original (vivía en la interacción
// entre el ternario de carga de EnergyPanel -que desmonta/remonta AreaBars al
// cambiar de periodo- y el estado "qué área está abierta"). Esta prueba monta
// EnergyPanel de verdad, con fetch mockeado, y ejercita ese camino completo.

interface AreaScoreFixture {
  area: LifeArea;
  score: number;
  tone: ScoreTone;
  drivers: AreaDriver[];
}

const TODAY_AREAS: AreaScoreFixture[] = [
  {
    area: "money",
    score: 66,
    tone: "high",
    drivers: [{ transit: "jupiter", natal: "venus", aspect: "trine", favorable: true }],
  },
  { area: "love", score: 50, tone: "mixed", drivers: [] },
];

const WEEK_AREAS: AreaScoreFixture[] = [
  {
    area: "money",
    score: 40,
    tone: "low",
    drivers: [{ transit: "saturn", natal: "venus", aspect: "square", favorable: false }],
  },
  { area: "love", score: 50, tone: "mixed", drivers: [] },
];

// Texto exacto que arma EnergyPanel para un driver: `${L.bodies[transit]}
// ${L.aspects[aspect]} ${t("carta.yourPossessive")} ${L.bodies[natal]}` (ver
// energy-panel.tsx). Lo recalculamos aquí desde los mismos mensajes es.json
// para no hardcodear traducciones que puedan cambiar por su cuenta.
function driverText(transit: string, aspect: string, natal: string): string {
  const bodies: Record<string, string> = {
    jupiter: "Júpiter",
    saturn: "Saturno",
    venus: "Venus",
  };
  const aspects: Record<string, string> = { trine: "Trígono", square: "Cuadratura" };
  return `${bodies[transit]} ${aspects[aspect]} ${es.carta.yourPossessive} ${bodies[natal]}`;
}

const TODAY_MONEY_DRIVER = driverText("jupiter", "trine", "venus");
const WEEK_MONEY_DRIVER = driverText("saturn", "square", "venus");

function renderPanel() {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <EnergyPanel profileId="profile-1" />
    </NextIntlClientProvider>,
  );
}

describe("EnergyPanel — la expansión sobrevive un cambio de periodo (T6 review gap)", () => {
  beforeEach(() => {
    global.fetch = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { period?: string };
      const areas = body.period === "week" ? WEEK_AREAS : TODAY_AREAS;
      return {
        ok: true,
        json: async () => ({ areas }),
      } as unknown as Response;
    }) as unknown as typeof fetch;
  });

  it("mantiene la tarjeta de Dinero expandida al cambiar de 'hoy' a 'semana'", async () => {
    renderPanel();

    // 1. Carga inicial ("hoy"): expande la tarjeta de Dinero y confirma que
    // muestra el driver de ESTE periodo.
    await waitFor(() => expect(screen.getByText(es.hoy.areaMoney)).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /Dinero/ }));
    await waitFor(() => expect(screen.getByText(TODAY_MONEY_DRIVER)).toBeInTheDocument());

    // 2. Cambia de periodo. Esto dispara un nuevo fetch: EnergyPanel pone
    // areas=null (muestra el estado de carga, desmontando AreaBars) y luego
    // remonta AreaBars con los datos de la semana. EnergyPanel mismo nunca se
    // desmonta, así que `open` (elevado a EnergyPanel tras el fix) debe
    // sobrevivir intacto.
    fireEvent.click(screen.getByRole("tab", { name: es.hoy.periodWeek }));

    // 3. Sin volver a hacer clic en la tarjeta: una vez cargan los datos de la
    // semana, el driver de Dinero de la NUEVA data debe estar visible. Esta es
    // exactamente la propiedad que la regresión original rompía.
    await waitFor(() => expect(screen.getByText(WEEK_MONEY_DRIVER)).toBeInTheDocument());
    expect(screen.queryByText(TODAY_MONEY_DRIVER)).not.toBeInTheDocument();

    // La pestaña "Semana" queda marcada activa y la de "Hoy" ya no.
    expect(screen.getByRole("tab", { name: es.hoy.periodWeek }).getAttribute("aria-selected")).toBe(
      "true",
    );
  });
});
