import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";
import { BottomNav } from "../bottom-nav";

let currentPath = "/hoy";
vi.mock("next/navigation", () => ({
  usePathname: () => currentPath,
}));

function renderNav(path: string) {
  currentPath = path;
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <BottomNav />
    </NextIntlClientProvider>,
  );
}

describe("BottomNav", () => {
  it("renderiza las mismas 5 pestañas que TopNav: Hoy · Astros · Tarot · Otras lecturas · Perfil", () => {
    renderNav("/hoy");
    const labels = screen.getAllByRole("link").map((a) => a.textContent);
    expect(labels).toEqual([es.nav.hoy, es.nav.astros, es.nav.tarot, es.nav.otrasLecturas, es.nav.perfil]);
  });

  it("Astros presente y con href /astros; activo en su ruta heredada /carta", () => {
    renderNav("/carta");
    const astros = screen.getByText(es.nav.astros).closest("a")!;
    expect(astros.getAttribute("href")).toBe("/astros");
  });

  it("respeta un `order` custom (panel /admin) con Perfil al final", () => {
    currentPath = "/hoy";
    render(
      <NextIntlClientProvider locale="es" messages={es}>
        <BottomNav order={["otrasLecturas", "tarot", "hoy", "astros"]} />
      </NextIntlClientProvider>,
    );
    const labels = screen.getAllByRole("link").map((a) => a.textContent);
    expect(labels).toEqual([es.nav.otrasLecturas, es.nav.tarot, es.nav.hoy, es.nav.astros, es.nav.perfil]);
  });
});
