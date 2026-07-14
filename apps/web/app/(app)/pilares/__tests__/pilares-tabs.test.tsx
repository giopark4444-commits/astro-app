import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";
import { PilaresTabs } from "../pilares-tabs";

function renderTabs(active: Parameters<typeof PilaresTabs>[0]["active"], onSelect = vi.fn()) {
  render(
    <NextIntlClientProvider locale="es" messages={es}>
      <PilaresTabs active={active} onSelect={onSelect} />
    </NextIntlClientProvider>,
  );
  return onSelect;
}

describe("PilaresTabs", () => {
  it("renderiza las 7 tabs y marca la activa", () => {
    renderTabs("nayin");
    expect(screen.getAllByRole("tab")).toHaveLength(7);
    expect(screen.getByRole("tab", { name: es.pilares.nayinTitle }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tab", { name: es.pilares.starsTitle }).getAttribute("aria-selected")).toBe("false");
  });

  it("al tocar una tab llama onSelect con su clave", () => {
    const onSelect = renderTabs("nayin");
    fireEvent.click(screen.getByRole("tab", { name: es.pilares.luckTitle }));
    expect(onSelect).toHaveBeenCalledWith("luck");
  });
});
