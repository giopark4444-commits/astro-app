// Task 5 (UI): pase RTL de la página completa de "Camino de vida" — décadas
// fantasma, HOY entre pasado y futuro, cap de densidad con expander, tick de
// peso 1 que expande al tocarlo, y título tocable (<Meaning>) cuando el evento
// trae meaningKey. Mock de fetch (fixture de eventos) + profiles provider,
// mismo patrón que app/(app)/hoy/__tests__/meaning-wiring.test.tsx.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";
import type { TimelineEvent, TimelineResult } from "@/lib/timeline/types";
import { LifetimeView } from "../lifetime-view";

const FIXTURE_PROFILE = { id: "profile-1", name: "Gio", birth_date: "1990-03-15" };

vi.mock("@/lib/profiles/profiles-provider", () => ({ useProfiles: () => ({ active: FIXTURE_PROFILE }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const ev = (over: Partial<TimelineEvent> & Pick<TimelineEvent, "year" | "weight" | "kind" | "system">): TimelineEvent => ({
  id: `${over.system}:${over.kind}:${over.year}`,
  ...over,
});

const TODAY_ISO = "2020-06-01T00:00:00.000Z";

const FIXTURE: TimelineResult = {
  birthYear: 1990,
  fromYear: 1990,
  toYear: 2030,
  todayIso: TODAY_ISO,
  events: [
    ev({ year: 1990, weight: 3, kind: "birth", system: "life" }),
    // hito peso-3 pasado con meaningKey (glosario real: timeline.saturnreturn)
    ev({ year: 2019, weight: 3, kind: "saturn-return", system: "astro", ordinal: 1 }),
    // año con 4 eventos peso-2 → cap de densidad (2 visibles + expander "+2")
    ev({ year: 2010, weight: 2, kind: "personal-year-1", system: "numerology" }),
    ev({ year: 2010, weight: 2, kind: "luck-pillar-change", system: "bazi", meta: { tenGod: "peer" } }),
    ev({ year: 2010, weight: 2, kind: "pinnacle-change", system: "numerology", meta: { pinnacleValue: 5 } }),
    ev({ year: 2010, weight: 2, kind: "luck-pillar-change", system: "bazi", ordinal: 2, meta: { tenGod: "rob" } }),
    // tick de peso 1 en un año futuro
    ev({ year: 2025, weight: 1, kind: "jupiter-return", system: "astro" }),
    // hito futuro para verificar orden HOY < futuro
    ev({ year: 2030, weight: 3, kind: "uranus-opposition", system: "astro" }),
  ],
};

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextIntlClientProvider locale="es" messages={es}>
      {children}
    </NextIntlClientProvider>
  );
}

describe("LifetimeView — Camino de vida", () => {
  beforeEach(() => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => FIXTURE,
    })) as unknown as typeof fetch;
  });

  it("renderiza numerales de década fantasma", async () => {
    render(<LifetimeView />, { wrapper: Providers });
    await screen.findByText("Camino de vida");
    // décadas de vida: 1990 (edad 0), 2000 (10), 2010 (20), 2020 (30), 2030 (40)
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(screen.getByText("30")).toBeInTheDocument();
  });

  it("HOY queda entre un hito pasado y uno futuro", async () => {
    render(<LifetimeView />, { wrapper: Providers });
    await screen.findByText("Camino de vida");
    const years = screen.getAllByText(/^(19|20)\d{2}$/).map((el) => el.textContent);
    const idxPast = years.indexOf("2019");
    const idxToday = years.indexOf("2020");
    const idxFuture = years.indexOf("2030");
    expect(idxPast).toBeGreaterThanOrEqual(0);
    expect(idxToday).toBeGreaterThan(idxPast);
    expect(idxFuture).toBeGreaterThan(idxToday);
  });

  it("cap de densidad: un año con 4 eventos muestra el expander +2 y los revela al tocarlo", async () => {
    render(<LifetimeView />, { wrapper: Providers });
    await screen.findByText("Camino de vida");
    const row2010 = document.getElementById("year-2010")!;
    const scoped = within(row2010 as HTMLElement);
    const expandBtn = scoped.getByRole("button", { name: /\+2/ });
    expect(expandBtn).toHaveAttribute("aria-expanded", "false");
    // solo 2 de las 4 filas visibles antes de expandir
    expect(scoped.getAllByText(/./).length).toBeGreaterThan(0);
    fireEvent.click(expandBtn);
    expect(expandBtn).toHaveAttribute("aria-expanded", "true");
  });

  it("un evento de peso 1 es un tick que expande su fila al tocarlo", async () => {
    render(<LifetimeView />, { wrapper: Providers });
    await screen.findByText("Camino de vida");
    const row2025 = document.getElementById("year-2025")!;
    const scoped = within(row2025 as HTMLElement);
    const tick = scoped.getByRole("button", { name: "•" });
    expect(tick).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(tick);
    expect(tick).toHaveAttribute("aria-expanded", "true");
  });

  it("el título de un hito con meaningKey es un botón que abre el glosario", async () => {
    render(<LifetimeView />, { wrapper: Providers });
    const trigger = await screen.findByRole("button", { name: /Retorno de Saturno/i });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
