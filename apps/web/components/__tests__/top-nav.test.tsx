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
  it("renderiza los 7 botones en el orden de Gio", () => {
    renderNav("/hoy");
    const labels = screen.getAllByRole("link").map((a) => a.textContent);
    // horóscopo ya es un link activo (T8); tarot entra tras pilares, antes de perfil (T4)
    expect(labels).toEqual([
      es.nav.hoy, es.nav.carta, es.nav.horoscopo, es.nav.numeros, es.nav.pilares, es.nav.tarot, es.nav.perfil,
    ]);
    expect(screen.getByRole("link", { name: new RegExp(es.nav.horoscopo) })).toHaveAttribute("href", "/horoscopo");
    expect(screen.getByRole("link", { name: new RegExp(es.nav.tarot) })).toHaveAttribute("href", "/tarot");
  });

  it("marca activo el mundo actual (y subrutas)", () => {
    renderNav("/carta");
    expect(screen.getByText(es.nav.carta).closest("a")!.getAttribute("data-on")).toBe("true");
    expect(screen.getByText(es.nav.hoy).closest("a")!.getAttribute("data-on")).toBeNull();
  });

  it("Perfil apunta a /perfil y se activa en /perfil", () => {
    renderNav("/perfil");
    const perfil = screen.getByText(es.nav.perfil).closest("a")!;
    expect(perfil.getAttribute("href")).toBe("/perfil");
    expect(perfil.getAttribute("data-on")).toBe("true");
  });

  it("respeta un `order` custom (panel /admin) y deja Perfil siempre al final", () => {
    currentPath = "/hoy";
    render(
      <NextIntlClientProvider locale="es" messages={es}>
        <TopNav order={["tarot", "hoy", "pilares", "carta", "numeros", "horoscopo"]} />
      </NextIntlClientProvider>,
    );
    const labels = screen.getAllByRole("link").map((a) => a.textContent);
    expect(labels).toEqual([
      es.nav.tarot, es.nav.hoy, es.nav.pilares, es.nav.carta, es.nav.numeros, es.nav.horoscopo, es.nav.perfil,
    ]);
  });
});
