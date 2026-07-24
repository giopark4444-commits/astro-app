import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";
import { PeriodSelector } from "../period-selector";
import type { HoroscopePeriod } from "@/lib/horoscope/western";

// Selector de periodo GLOBAL (pedido de Gio, corrigiendo un malentendido: "lo
// de ayer hoy manana semana mes ano va arriba de la ventana de las barras, y
// debe afectar todas las ventanas") — mismos 6 valores + i18n `hoy.period*`
// que /horoscopo (PERIODS/PERIOD_KEY en horoscopo-shared.ts), sin duplicar la
// lista. Componente CONTROLADO: nunca cambia solo, solo avisa via onChange.

function renderSelector(period: HoroscopePeriod, onChange = vi.fn()) {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <PeriodSelector period={period} onChange={onChange} />
    </NextIntlClientProvider>,
  );
}

describe("PeriodSelector", () => {
  it("muestra los 6 periodos en el orden ayer/hoy/mañana/semana/mes/año", () => {
    renderSelector("today");
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((el) => el.textContent)).toEqual([
      es.hoy.periodYesterday,
      es.hoy.periodToday,
      es.hoy.periodTomorrow,
      es.hoy.periodWeek,
      es.hoy.periodMonth,
      es.hoy.periodYear,
    ]);
  });

  it("marca aria-selected en el periodo activo, y solo en ese", () => {
    renderSelector("month");
    expect(screen.getByRole("tab", { name: es.hoy.periodMonth })).toHaveAttribute("aria-selected", "true");
    for (const key of ["periodYesterday", "periodToday", "periodTomorrow", "periodWeek", "periodYear"] as const) {
      expect(screen.getByRole("tab", { name: es.hoy[key] })).toHaveAttribute("aria-selected", "false");
    }
  });

  it("clicar un periodo avisa a onChange con ese valor — no cambia solo (componente controlado)", () => {
    const onChange = vi.fn();
    renderSelector("today", onChange);

    fireEvent.click(screen.getByRole("tab", { name: es.hoy.periodWeek }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("week");
    // Controlado: sin que el padre baje period="week" de vuelta, sigue "Hoy".
    expect(screen.getByRole("tab", { name: es.hoy.periodToday })).toHaveAttribute("aria-selected", "true");
  });

  it("tiene un aria-label de tablist para lectores de pantalla", () => {
    renderSelector("today");
    expect(screen.getByRole("tablist", { name: es.hoy.periodSelectorAria })).toBeInTheDocument();
  });
});
