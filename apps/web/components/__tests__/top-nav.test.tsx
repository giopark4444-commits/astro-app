import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";
import { TopNav } from "../top-nav";

let currentPath = "/hoy";
vi.mock("next/navigation", () => ({
  usePathname: () => currentPath,
}));

function renderNav(path: string) {
  currentPath = path;
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <TopNav />
    </NextIntlClientProvider>,
  );
}

describe("TopNav", () => {
  it("agrupa Carta+Horóscopo en una sola pestaña Astros (→/astros)", () => {
    renderNav("/hoy");
    const labels = screen.getAllByRole("link").map((a) => a.textContent);
    // Carta y Horóscopo se funden en "Astros"; el resto queda igual (6 pestañas)
    expect(labels).toEqual([
      es.nav.hoy, es.nav.astros, es.nav.numeros, es.nav.pilares, es.nav.tarot, es.nav.perfil,
    ]);
    expect(screen.getByRole("link", { name: new RegExp(es.nav.astros) })).toHaveAttribute("href", "/astros");
    // ya no hay pestañas sueltas de Carta ni Horóscopo
    expect(screen.queryByRole("link", { name: es.nav.horoscopo })).toBeNull();
    expect(screen.getByRole("link", { name: new RegExp(es.nav.tarot) })).toHaveAttribute("href", "/tarot");
  });

  it("Astros queda activo en /astros, /carta y /horoscopo", () => {
    for (const path of ["/astros", "/carta", "/horoscopo"]) {
      const { unmount } = renderNav(path);
      expect(screen.getByText(es.nav.astros).closest("a")!.getAttribute("data-on")).toBe("true");
      expect(screen.getByText(es.nav.hoy).closest("a")!.getAttribute("data-on")).toBeNull();
      unmount();
    }
  });

  it("Perfil apunta a /perfil y se activa en /perfil", () => {
    renderNav("/perfil");
    const perfil = screen.getByText(es.nav.perfil).closest("a")!;
    expect(perfil.getAttribute("href")).toBe("/perfil");
    expect(perfil.getAttribute("data-on")).toBe("true");
  });

  it("respeta un `order` custom (panel /admin): Astros toma el lugar de Carta, Perfil al final", () => {
    currentPath = "/hoy";
    render(
      <NextIntlClientProvider locale="es" messages={es}>
        <TopNav order={["tarot", "hoy", "pilares", "carta", "numeros", "horoscopo"]} />
      </NextIntlClientProvider>,
    );
    const labels = screen.getAllByRole("link").map((a) => a.textContent);
    expect(labels).toEqual([
      es.nav.tarot, es.nav.hoy, es.nav.pilares, es.nav.astros, es.nav.numeros, es.nav.perfil,
    ]);
  });
});
