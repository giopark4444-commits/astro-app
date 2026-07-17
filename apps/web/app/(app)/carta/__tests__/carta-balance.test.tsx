// apps/web/app/(app)/carta/__tests__/carta-balance.test.tsx
// Tab Balance (elementos/modalidades): las barras se llenan (.bar-fill-in,
// global) y el número CUENTA hasta el valor real (useCountUp, a diferencia
// de numerology-ignite que solo enciende). Con prefers-reduced-motion
// stubeado (mismo patrón que lib/motion/__tests__/use-count-up.test.tsx),
// useCountUp devuelve el target de inmediato — así el test no depende de
// rAF ni de temporización real.

import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Balance } from "../carta-view";

function stubReducedMotion() {
  vi.stubGlobal("matchMedia", (q: string) => ({
    matches: q.includes("prefers-reduced-motion"),
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Balance (tab Balance) — barras + número contando", () => {
  it("con reduced-motion, muestra de inmediato el valor final (no 0) y la barra lleva bar-fill-in", () => {
    stubReducedMotion();
    const entries = [
      { k: "fire", label: "Fuego", n: 3 },
      { k: "earth", label: "Tierra", n: 1 },
      { k: "air", label: "Aire", n: 0 },
      { k: "water", label: "Agua", n: 3 },
    ];
    const { container } = render(
      <Balance title="Elementos" entries={entries} dominant="fire" dominantLabel="Dominante" />,
    );

    expect(screen.getAllByText("3").length).toBe(2); // fuego y agua, ambos n=3
    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.getByText("0")).toBeTruthy();

    const fills = container.querySelectorAll(".bar-fill-in");
    expect(fills.length).toBe(entries.length);
  });

  it("marca el elemento dominante con su etiqueta y clase propia", () => {
    stubReducedMotion();
    const entries = [
      { k: "fire", label: "Fuego", n: 3 },
      { k: "water", label: "Agua", n: 1 },
    ];
    render(<Balance title="Elementos" entries={entries} dominant="fire" dominantLabel="Dominante" />);
    expect(screen.getByText("Fuego · Dominante")).toBeTruthy();
  });
});
