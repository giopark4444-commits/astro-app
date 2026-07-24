import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { AreaDriver, LifeArea, ScoreTone } from "@aluna/core";
import es from "@/messages/es.json";
import { EnergyPanel } from "../energy-panel";

// HD4: el panel de energía gana palancas de DISCIPLINA (general/astros/números/
// pilares) — cambiar de disciplina solo reindexa datos ya en memoria, sin refetch.
// El selector de PERIODO no vive DENTRO de este panel (eso no cambió — ver el test
// "el toggle de periodo ya no vive en el dashboard" abajo), pero sí vuelve a
// afectarlo desde AFUERA: Gio pidió un selector GLOBAL arriba de este panel
// (PeriodSelector en hub-view.tsx, "debe afectar todas las ventanas") que baja acá
// como prop `period` y viaja a /api/scores (donde solo mueve `astros`, igual que
// antes de HD4) y a AreaReadingSheet.

interface AreaScoreFixture {
  area: LifeArea;
  score: number;
  tone: ScoreTone;
  drivers: AreaDriver[];
}

// Solo `astros` trae drivers reales (ver lib/hoy/scores.ts); general/numeros/
// pilares siempre drivers: [] — así que uso valores distintos por disciplina
// para poder aserir cuál set está pintado, y dejo intactos los drivers vacíos
// donde el ensamblador real los deja vacíos.
const GENERAL_AREAS: AreaScoreFixture[] = [
  { area: "love", score: 55, tone: "mixed", drivers: [] },
  { area: "money", score: 60, tone: "high", drivers: [] },
];
const ASTROS_AREAS: AreaScoreFixture[] = [
  {
    area: "love",
    score: 70,
    tone: "high",
    drivers: [{ transit: "jupiter", natal: "venus", aspect: "trine", favorable: true }],
  },
  { area: "money", score: 66, tone: "high", drivers: [] },
];
const NUMEROS_AREAS: AreaScoreFixture[] = [
  { area: "love", score: 40, tone: "low", drivers: [] },
  { area: "money", score: 45, tone: "low", drivers: [] },
];
const PILARES_AREAS: AreaScoreFixture[] = [
  { area: "love", score: 80, tone: "high", drivers: [] },
  { area: "money", score: 35, tone: "low", drivers: [] },
];

function driverText(transit: string, aspect: string, natal: string): string {
  const bodies: Record<string, string> = { jupiter: "Júpiter", venus: "Venus" };
  const aspects: Record<string, string> = { trine: "Trígono" };
  return `${bodies[transit]} ${aspects[aspect]} ${es.carta.yourPossessive} ${bodies[natal]}`;
}
const LOVE_DRIVER_TEXT = driverText("jupiter", "trine", "venus");

function renderPanel(period?: "yesterday" | "today" | "tomorrow" | "week" | "month" | "year") {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      {/* exactOptionalPropertyTypes: spread condicional en vez de period={period}
          (pasar `undefined` explícito no es lo mismo que omitir la prop). */}
      <EnergyPanel profileId="profile-1" {...(period ? { period } : {})} />
    </NextIntlClientProvider>,
  );
}

describe("EnergyPanel — palancas de disciplina (general/astros/números/pilares)", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // reduced-motion: useCountUp devuelve el target de inmediato (mismo patrón
    // que area-bars.test.tsx), sin lo cual el score tardaría frames en asentar.
    vi.stubGlobal("matchMedia", (q: string) => ({
      matches: q.includes("prefers-reduced-motion"),
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    // Discrimina por URL: /api/area-reading es el fetch NUEVO que dispara la
    // mini-lectura al tocar una barra (ver AreaReadingSheet) — se le responde
    // `available:false` (estado dormido, inerte) para no interferir con las
    // aserciones existentes sobre el fetch de /api/scores.
    fetchMock = vi.fn(async (url: unknown) => {
      if (typeof url === "string" && url.includes("/api/area-reading")) {
        return { ok: true, json: async () => ({ available: false }) };
      }
      return {
        ok: true,
        json: async () => ({
          period: "today",
          general: GENERAL_AREAS,
          astros: ASTROS_AREAS,
          numeros: NUMEROS_AREAS,
          pilares: PILARES_AREAS,
        }),
      };
    }) as unknown as ReturnType<typeof vi.fn>;
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  /** Solo las llamadas a /api/scores — tocar una barra dispara ADEMÁS un fetch
   *  a /api/area-reading (la mini-lectura del sheet), que estas aserciones no
   *  quieren contar. */
  function scoresCallCount(): number {
    return fetchMock.mock.calls.filter(([url]) => typeof url === "string" && url.includes("/api/scores")).length;
  }

  it("sin prop `period`, /api/scores recibe 'today' (comportamiento previo intacto)", async () => {
    renderPanel();
    await waitFor(() => expect(scoresCallCount()).toBe(1));
    const call = fetchMock.mock.calls.find(([url]) => typeof url === "string" && url.includes("/api/scores"))!;
    const body = JSON.parse((call[1] as RequestInit).body as string);
    expect(body.period).toBe("today");
  });

  it("con prop `period` (selector GLOBAL, hub-view.tsx), /api/scores la recibe — pedido de Gio: 'debe afectar todas las ventanas'", async () => {
    renderPanel("week");
    await waitFor(() => expect(scoresCallCount()).toBe(1));
    const call = fetchMock.mock.calls.find(([url]) => typeof url === "string" && url.includes("/api/scores"))!;
    const body = JSON.parse((call[1] as RequestInit).body as string);
    expect(body.period).toBe("week");
  });

  it("cambiar de periodo SÍ refetchea /api/scores (a diferencia de cambiar de disciplina)", async () => {
    const { rerender } = renderPanel("today");
    await waitFor(() => expect(scoresCallCount()).toBe(1));

    rerender(
      <NextIntlClientProvider locale="es" messages={es}>
        <EnergyPanel profileId="profile-1" period="month" />
      </NextIntlClientProvider>,
    );

    await waitFor(() => expect(scoresCallCount()).toBe(2));
    const call = fetchMock.mock.calls[1]!;
    const body = JSON.parse((call[1] as RequestInit).body as string);
    expect(body.period).toBe("month");
  });

  it("muestra General por defecto, con las 4 disciplinas como pestañas", async () => {
    renderPanel();

    await waitFor(() => expect(screen.getByText(es.hoy.areaLove)).toBeInTheDocument());
    expect(screen.getByText("55")).toBeInTheDocument(); // score de "love" en general

    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      es.hoy.disciplineGeneral,
      es.hoy.disciplineAstros,
      es.hoy.disciplineNumeros,
      es.hoy.disciplinePilares,
    ]);
    expect(screen.getByRole("tab", { name: es.hoy.disciplineGeneral }).getAttribute("aria-selected")).toBe(
      "true",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("cambia a Números sin volver a pedir datos al servidor", async () => {
    renderPanel();
    await waitFor(() => expect(screen.getByText("55")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("tab", { name: es.hoy.disciplineNumeros }));

    // El set de "numeros" (love=40) reemplaza al de "general" (love=55) sin un
    // segundo fetch: los 4 sets ya viven en memoria desde la carga inicial.
    await waitFor(() => expect(screen.getByText("40")).toBeInTheDocument());
    expect(screen.queryByText("55")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("tab", { name: es.hoy.disciplineNumeros }).getAttribute("aria-selected")).toBe(
      "true",
    );
  });

  it("solo astros trae el 'por qué'; las demás disciplinas no rompen sin drivers", async () => {
    renderPanel();
    await waitFor(() => expect(screen.getByText("55")).toBeInTheDocument());

    // Expande "Amor" en General (sin drivers) → texto genérico, no el de astros.
    fireEvent.click(screen.getByRole("button", { name: new RegExp(es.hoy.areaLove) }));
    await waitFor(() => expect(screen.getByText(es.hoy.calmGeneric)).toBeInTheDocument());
    expect(screen.queryByText(es.hoy.calm)).not.toBeInTheDocument();

    // Sin volver a hacer clic en la tarjeta: cambia a Astros. El estado
    // "expandido" (elevado a EnergyPanel, componente controlado) sobrevive el
    // cambio de disciplina — ahora sí hay drivers para "love" y deben verse.
    fireEvent.click(screen.getByRole("tab", { name: es.hoy.disciplineAstros }));
    await waitFor(() => expect(screen.getByText(LOVE_DRIVER_TEXT)).toBeInTheDocument());
    expect(screen.queryByText(es.hoy.calmGeneric)).not.toBeInTheDocument();
    // Un solo fetch a /api/scores (tocar la barra de arriba dispara ADEMÁS un
    // fetch aparte a /api/area-reading para la mini-lectura — ver beforeEach).
    expect(scoresCallCount()).toBe(1);
  });

  it("tocar una barra abre el BottomSheet de la mini-lectura, con el nombre y el score del área", async () => {
    renderPanel();
    await waitFor(() => expect(screen.getByText("55")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: new RegExp(es.hoy.areaLove) }));

    const dialog = await screen.findByRole("dialog", { name: `${es.hoy.areaLove} · 55` });
    expect(within(dialog).getByText(es.hoy.areaLove)).toBeInTheDocument();
    // El fetch a /api/area-reading viaja con el área tocada y el period QUE
    // LE LLEGÓ A ESTE PANEL (default "today" al no pasar prop, ver renderPanel).
    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([url]) => typeof url === "string" && url.includes("/api/area-reading"));
      expect(call).toBeDefined();
      const sentBody = JSON.parse((call![1] as RequestInit).body as string);
      expect(sentBody).toMatchObject({ profileId: "profile-1", area: "love", period: "today", locale: "es" });
    });
  });

  it("un periodo != today llega también a AreaReadingSheet (no se queda pegado en 'today')", async () => {
    renderPanel("week");
    await waitFor(() => expect(screen.getByText("55")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: new RegExp(es.hoy.areaLove) }));
    await screen.findByRole("dialog", { name: `${es.hoy.areaLove} · 55` });

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([url]) => typeof url === "string" && url.includes("/api/area-reading"));
      expect(call).toBeDefined();
      const sentBody = JSON.parse((call![1] as RequestInit).body as string);
      expect(sentBody.period).toBe("week");
    });
  });

  it("el toggle de periodo NO vive DENTRO de este panel (el selector global vive arriba, en hub-view.tsx)", async () => {
    renderPanel();
    await waitFor(() => expect(screen.getByText("55")).toBeInTheDocument());
    expect(screen.queryByRole("tab", { name: es.hoy.periodWeek })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: es.hoy.periodMonth })).not.toBeInTheDocument();
    // Y el header de la sección saluda, no anuncia "periodo".
    expect(within(screen.getByRole("heading", { level: 2 })).getByText(es.hoy.energyTitle)).toBeInTheDocument();
  });
});
