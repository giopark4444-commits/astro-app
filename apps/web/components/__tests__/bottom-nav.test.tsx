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
  // Review Fable (fix del default `order`): sin prop `order`, BottomNav debe
  // renderizar su propio orden histórico (carta, números, hoy, pilares — el
  // de ITEMS arriba), NUNCA el de NAV_KEYS/DEFAULT_NAV_ORDER (que empieza en
  // "hoy" y rompía este orden apenas se aplicaba la migración 0015, sin que
  // nadie tocara /admin).
  it("sin `order`, renderiza el orden histórico de ITEMS (carta, números, hoy, pilares)", () => {
    renderNav("/hoy");
    const labels = screen.getAllByRole("link").map((a) => a.textContent);
    expect(labels).toEqual([es.nav.carta, es.nav.numeros, es.nav.hoy, es.nav.pilares]);
  });

  it("marca activo el mundo actual", () => {
    renderNav("/carta");
    expect(screen.getByText(es.nav.carta).closest("a")).not.toBeNull();
  });

  it("respeta un `order` custom (panel /admin) manteniendo solo el subconjunto propio", () => {
    currentPath = "/hoy";
    render(
      <NextIntlClientProvider locale="es" messages={es}>
        <BottomNav order={["pilares", "hoy", "carta", "numeros", "horoscopo", "tarot"]} />
      </NextIntlClientProvider>,
    );
    const labels = screen.getAllByRole("link").map((a) => a.textContent);
    expect(labels).toEqual([es.nav.pilares, es.nav.hoy, es.nav.carta, es.nav.numeros]);
  });
});
