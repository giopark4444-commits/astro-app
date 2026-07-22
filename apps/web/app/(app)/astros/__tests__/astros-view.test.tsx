import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";

let trad: string | null = null;
vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: () => trad }),
  usePathname: () => "/astros",
}));
// Las vistas reales son pesadas (fetch, providers): se mockean para probar solo
// el ruteo de pestañas de AstrosView.
vi.mock("../../carta/carta-view", () => ({ CartaView: () => <div>CARTA_MOCK</div> }));
vi.mock("../../horoscopo/horoscopo-view", () => ({ HoroscopoView: () => <div>HORO_MOCK</div> }));

import { AstrosView } from "../astros-view";

function renderView(t: string | null) {
  trad = t;
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <AstrosView />
    </NextIntlClientProvider>,
  );
}

describe("AstrosView", () => {
  it("sin trad: abre la Carta astral y su pestaña queda activa (→/astros)", () => {
    renderView(null);
    expect(screen.getByText("CARTA_MOCK")).toBeInTheDocument();
    expect(screen.queryByText("HORO_MOCK")).toBeNull();
    const cartaTab = screen.getByRole("tab", { name: es.astros.cartaTitle });
    expect(cartaTab.getAttribute("aria-selected")).toBe("true");
    expect(cartaTab.getAttribute("href")).toBe("/astros");
  });

  it("trad=oriental: muestra el horóscopo con la pestaña Oriental activa (→/astros?trad=oriental)", () => {
    renderView("oriental");
    expect(screen.getByText("HORO_MOCK")).toBeInTheDocument();
    expect(screen.queryByText("CARTA_MOCK")).toBeNull();
    const orientalTab = screen.getByRole("tab", { name: es.astros.horoscopoOriental });
    expect(orientalTab.getAttribute("aria-selected")).toBe("true");
    expect(orientalTab.getAttribute("href")).toBe("/astros?trad=oriental");
  });

  it("trad=occidental: muestra el horóscopo con la pestaña Occidental activa", () => {
    renderView("occidental");
    expect(screen.getByText("HORO_MOCK")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: es.astros.horoscopoOccidental }).getAttribute("aria-selected")).toBe("true");
  });
});
