import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import es from "@/messages/es.json";
import { ChartControls } from "../chart-controls";

function I18nEs({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale="es" messages={es}>
      {children}
    </NextIntlClientProvider>
  );
}

describe("ChartControls", () => {
  it("renderiza los 6 sistemas de casas y los 2 zodiacos, marca el activo", () => {
    render(
      <ChartControls houseSystem="placidus" onHouseSystem={vi.fn()} zodiac="tropical" onZodiac={vi.fn()} />,
      { wrapper: I18nEs },
    );
    expect(screen.getByRole("tab", { name: es.carta.houseSystems.koch })).toBeInTheDocument();
    expect(screen.getAllByRole("tab")).toHaveLength(8);
  });

  it("labeled muestra los rótulos del mockup y marca el activo", () => {
    render(
      <ChartControls houseSystem="placidus" onHouseSystem={vi.fn()} zodiac="tropical" onZodiac={vi.fn()} labeled />,
      { wrapper: I18nEs },
    );
    expect(screen.getByText("Casas")).toBeInTheDocument();
    expect(screen.getByText("Zodiaco")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: es.carta.houseSystems.placidus, selected: true })).toBeInTheDocument();
  });

  it("sin labeled no muestra los rótulos", () => {
    render(
      <ChartControls houseSystem="placidus" onHouseSystem={vi.fn()} zodiac="tropical" onZodiac={vi.fn()} />,
      { wrapper: I18nEs },
    );
    expect(screen.queryByText("Casas")).not.toBeInTheDocument();
  });

  it("proToggle se coloca al final de la fila zodiaco", () => {
    render(
      <ChartControls
        houseSystem="placidus" onHouseSystem={vi.fn()} zodiac="tropical" onZodiac={vi.fn()}
        proToggle={<button>Modo Pro</button>}
      />,
      { wrapper: I18nEs },
    );
    expect(screen.getByRole("button", { name: "Modo Pro" })).toBeInTheDocument();
  });
});
