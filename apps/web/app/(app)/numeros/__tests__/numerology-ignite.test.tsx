import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";
import { computeNumerology } from "@aluna/core";
import { profileToNumerologyInput } from "@/lib/numerology";
import { ThemeProvider } from "@/lib/theme/theme-provider";
import { NumerologyView } from "../numerology-view";

// Pedido de Gio: los números se ENCIENDEN (ignite: opacity+glow escalonado),
// NUNCA se cambian por otros números — no es un contador. Este test verifica
// las dos cosas a la vez: el valor renderizado es el valor real calculado
// por @aluna/core (nunca alterado), y ese mismo nodo lleva la clase global
// `ignite` con `--i` escalonado (ver app/globals.css: aluna-ignite + .ignite).

const activeProfile = { id: "profile-1", name: "Gio", birth_date: "1990-05-14" };

const { mockActive } = vi.hoisted(() => ({
  mockActive: { current: null as { id: string; name: string; birth_date: string } | null },
}));

vi.mock("@/lib/profiles/profiles-provider", () => ({ useProfiles: () => ({ active: mockActive.current }) }));

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextIntlClientProvider locale="es" messages={es}>
      <ThemeProvider initialTheme="observatory" initialMode="dark" persist={vi.fn()}>
        {children}
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}

function renderView() {
  return render(<NumerologyView />, { wrapper: Providers });
}

describe("NumerologyView — ignición de números (motion, no contador)", () => {
  beforeEach(() => {
    mockActive.current = activeProfile;
    // NumerologyView ahora monta LensChatPanel → ChatView en su interpCol
    // (chat de Aluna bajo la interpretación): dispara fetches best-effort
    // propios al montar (retomar hilo, accesos rápidos, catálogo de modelos
    // de prueba). Sin mockear fetch, el fetch real de Node rechaza URLs
    // relativas y el catch/finally corre fuera de act() cuando el test ya
    // terminó — ruido en stderr sin ningún fallo real; una respuesta
    // genérica inmediata lo evita.
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({}) })) as unknown as typeof fetch;
  });

  it("el número héroe (Camino de Vida) muestra el valor real y se enciende sin stagger (--i 0)", () => {
    const result = computeNumerology(profileToNumerologyInput(activeProfile));
    const { container } = renderView();

    const heroButton = screen.getByText(es.numerology.lifePath).closest("button")!;
    const heroN = heroButton.querySelector(".ignite")!;
    expect(heroN).not.toBeNull();
    expect(heroN.textContent).toBe(String(result.core.lifePath.value));
    expect(heroN.classList.contains("ignite")).toBe(true);
    expect(heroN.getAttribute("style")).toContain("--i: 0");
    expect(container).toBeTruthy();
  });

  it("las 5 lentes del núcleo muestran sus valores reales, escalonadas --i 1..5", () => {
    const result = computeNumerology(profileToNumerologyInput(activeProfile));
    renderView();

    const coreItems: Array<{ key: "expression" | "soulUrge" | "personality" | "birthday" | "maturity"; value: number }> = [
      { key: "expression", value: result.core.expression.value },
      { key: "soulUrge", value: result.core.soulUrge.value },
      { key: "personality", value: result.core.personality.value },
      { key: "birthday", value: result.core.birthday.value },
      { key: "maturity", value: result.core.maturity.value },
    ];

    coreItems.forEach((item, idx) => {
      const label = es.numerology[item.key];
      const lensButton = screen.getByText(label).closest("button")!;
      const lzN = lensButton.querySelector(".ignite")!;
      expect(lzN).not.toBeNull();
      expect(lzN.textContent).toBe(String(item.value));
      expect(lzN.getAttribute("style")).toContain(`--i: ${idx + 1}`);
    });
  });

  it("Modo Pro: al activar el toggle, los números de ciclos se encienden escalonados sin alterar su valor", () => {
    const result = computeNumerology(profileToNumerologyInput(activeProfile));
    renderView();

    // Antes de activar Pro, la lámina no existe.
    expect(screen.queryByText(es.numerology.personalYear)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: es.numerology.pro }));

    const yearRow = screen.getByText(es.numerology.personalYear).closest("div")!;
    const yearN = yearRow.querySelector(".ignite")!;
    expect(yearN.textContent).toBe(String(result.cycles.personalYear.value));
    expect(yearN.getAttribute("style")).toContain("--i: 0");

    const monthRow = screen.getByText(es.numerology.personalMonth).closest("div")!;
    const monthN = monthRow.querySelector(".ignite")!;
    expect(monthN.textContent).toBe(String(result.cycles.personalMonth.value));
    expect(monthN.getAttribute("style")).toContain("--i: 1");

    const dayRow = screen.getByText(es.numerology.personalDay).closest("div")!;
    const dayN = dayRow.querySelector(".ignite")!;
    expect(dayN.textContent).toBe(String(result.cycles.personalDay.value));
    expect(dayN.getAttribute("style")).toContain("--i: 2");
  });
});
