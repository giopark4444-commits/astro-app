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
  it("renderiza las 4 pestañas: Astros · Tarot · Otras lecturas · Perfil", () => {
    renderNav("/hoy");
    const labels = screen.getAllByRole("link").map((a) => a.textContent);
    expect(labels).toEqual([es.nav.astros, es.nav.tarot, es.nav.otrasLecturas, es.nav.perfil]);
    expect(screen.getByRole("link", { name: new RegExp(es.nav.astros) })).toHaveAttribute("href", "/astros");
    expect(screen.getByRole("link", { name: new RegExp(es.nav.otrasLecturas) })).toHaveAttribute("href", "/otras-lecturas");
    expect(screen.getByRole("link", { name: new RegExp(es.nav.tarot) })).toHaveAttribute("href", "/tarot");
    // ya no hay pestañas sueltas de Carta, Horóscopo, Números, Pilares ni Hoy
    for (const gone of [es.nav.carta, es.nav.horoscopo, es.nav.numeros, es.nav.pilares, es.nav.hoy]) {
      expect(screen.queryByRole("link", { name: gone })).toBeNull();
    }
  });

  it("Astros agrupa Carta+Horóscopo: activo en /astros, /carta y /horoscopo", () => {
    for (const path of ["/astros", "/carta", "/horoscopo"]) {
      const { unmount } = renderNav(path);
      expect(screen.getByText(es.nav.astros).closest("a")!.getAttribute("data-on")).toBe("true");
      expect(screen.getByText(es.nav.otrasLecturas).closest("a")!.getAttribute("data-on")).toBeNull();
      unmount();
    }
  });

  it("Otras lecturas agrupa Números+Pilares: activo en /otras-lecturas, /numeros y /pilares", () => {
    for (const path of ["/otras-lecturas", "/numeros", "/pilares"]) {
      const { unmount } = renderNav(path);
      expect(screen.getByText(es.nav.otrasLecturas).closest("a")!.getAttribute("data-on")).toBe("true");
      expect(screen.getByText(es.nav.astros).closest("a")!.getAttribute("data-on")).toBeNull();
      unmount();
    }
  });

  it("Perfil apunta a /perfil y se activa en /perfil", () => {
    renderNav("/perfil");
    const perfil = screen.getByText(es.nav.perfil).closest("a")!;
    expect(perfil.getAttribute("href")).toBe("/perfil");
    expect(perfil.getAttribute("data-on")).toBe("true");
  });

  it("respeta un `order` custom (panel /admin): Perfil siempre al final", () => {
    currentPath = "/hoy";
    render(
      <NextIntlClientProvider locale="es" messages={es}>
        <TopNav order={["tarot", "otrasLecturas", "astros"]} />
      </NextIntlClientProvider>,
    );
    const labels = screen.getAllByRole("link").map((a) => a.textContent);
    expect(labels).toEqual([es.nav.tarot, es.nav.otrasLecturas, es.nav.astros, es.nav.perfil]);
  });
});
