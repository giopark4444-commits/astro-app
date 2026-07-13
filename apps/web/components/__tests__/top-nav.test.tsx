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
  it("renderiza los 6 botones en el orden de Gio", () => {
    renderNav("/hoy");
    const labels = screen.getAllByRole("link").map((a) => a.textContent);
    // horóscopo NO es link (está 'pronto'), así que sale aparte
    expect(labels).toEqual([es.nav.hoy, es.nav.carta, es.nav.numeros, es.nav.pilares, es.nav.perfil]);
    expect(screen.getByText(es.nav.horoscopo).closest("[aria-disabled]")).toBeInTheDocument();
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
});
