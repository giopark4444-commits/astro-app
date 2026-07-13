import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";
import { ChartTabs } from "../chart-tabs";

function renderTabs(active: Parameters<typeof ChartTabs>[0]["active"], onSelect = vi.fn()) {
  render(
    <NextIntlClientProvider locale="es" messages={es}>
      <ChartTabs active={active} onSelect={onSelect} />
    </NextIntlClientProvider>,
  );
  return onSelect;
}

describe("ChartTabs", () => {
  it("renderiza los 4 tabs y marca el activo", () => {
    renderTabs("nucleo");
    expect(screen.getByRole("tab", { name: es.carta.tabNucleo }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tab", { name: es.carta.tabBalance }).getAttribute("aria-selected")).toBe("false");
  });

  it("al tocar un tab llama onSelect con su clave", () => {
    const onSelect = renderTabs("nucleo");
    fireEvent.click(screen.getByRole("tab", { name: es.carta.tabAspectos }));
    expect(onSelect).toHaveBeenCalledWith("aspectos");
  });
});
