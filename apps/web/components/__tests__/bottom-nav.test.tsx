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
  it("renderiza las mismas 6 pestañas que TopNav: Hoy · Astros · Tarot · Otras lecturas · Chat · Perfil", () => {
    renderNav("/hoy");
    const labels = screen.getAllByRole("link").map((a) => a.textContent);
    expect(labels).toEqual([es.nav.hoy, es.nav.astros, es.nav.tarot, es.nav.otrasLecturas, es.nav.chat, es.nav.perfil]);
  });

  it("Astros presente y con href /astros; activo en su ruta heredada /carta", () => {
    renderNav("/carta");
    const astros = screen.getByText(es.nav.astros).closest("a")!;
    expect(astros.getAttribute("href")).toBe("/astros");
  });

  it("Chat presente, con href /chat, justo antes de Perfil", () => {
    renderNav("/hoy");
    const chat = screen.getByText(es.nav.chat).closest("a")!;
    expect(chat.getAttribute("href")).toBe("/chat");
    const labels = screen.getAllByRole("link").map((a) => a.textContent);
    expect(labels.indexOf(es.nav.chat)).toBe(labels.indexOf(es.nav.perfil) - 1);
  });

  it("respeta un `order` custom (panel /admin) con Chat y Perfil al final", () => {
    currentPath = "/hoy";
    render(
      <NextIntlClientProvider locale="es" messages={es}>
        <BottomNav order={["otrasLecturas", "tarot", "hoy", "astros"]} />
      </NextIntlClientProvider>,
    );
    const labels = screen.getAllByRole("link").map((a) => a.textContent);
    expect(labels).toEqual([es.nav.otrasLecturas, es.nav.tarot, es.nav.hoy, es.nav.astros, es.nav.chat, es.nav.perfil]);
  });
});
