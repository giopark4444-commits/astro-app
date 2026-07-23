// apps/web/app/(app)/tarot/__tests__/spread-layout.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { spreadById, type TarotSpreadPosition } from "@aluna/core";
import { SpreadLayout } from "../spread-layout";

describe("SpreadLayout", () => {
  it("posiciona cada carta de la tirada de 3 según su layout x/y", () => {
    const spread = spreadById("three")!;
    render(<SpreadLayout spread={spread} renderSlot={(position) => <span>{position.key}</span>} />);

    spread.positions.forEach((position) => {
      const label = screen.getByText(position.key);
      const wrapper = label.parentElement as HTMLElement;
      expect(wrapper.style.left).toBe(`${position.layout.x * 100}%`);
      expect(wrapper.style.top).toBe(`${position.layout.y * 100}%`);
    });
  });

  it("llama a renderSlot una vez por posición con la posición, el índice y el rotate correctos", () => {
    const spread = spreadById("three")!;
    const renderSlot = vi.fn((position: TarotSpreadPosition) => <span>{position.key}</span>);
    render(<SpreadLayout spread={spread} renderSlot={renderSlot} />);

    expect(renderSlot).toHaveBeenCalledTimes(spread.positions.length);
    spread.positions.forEach((position, index) => {
      expect(renderSlot).toHaveBeenNthCalledWith(index + 1, position, index, position.layout.rotate ?? 0);
    });
  });

  // I3: el wrapper (el div posicionado por x/y) ya NO rota — si rotara, el
  // label/reveal-body de la posición (ej. celtic "crossing") quedaría de
  // lado. El rotate ahora es responsabilidad del llamador (3er arg de
  // renderSlot), que lo aplica solo a la caja/imagen de la carta.
  it("celtic-cross: la posición 'crossing' pasa rotate=90 a renderSlot, y el wrapper NO rota", () => {
    const spread = spreadById("celtic-cross")!;
    const renderSlot = vi.fn((position: TarotSpreadPosition, _index: number, _rotate: number) => (
      <span>{position.key}</span>
    ));
    render(<SpreadLayout spread={spread} renderSlot={renderSlot} />);

    const crossing = spread.positions.find((p) => p.key === "crossing")!;
    const label = screen.getByText("crossing");
    const wrapper = label.parentElement as HTMLElement;
    expect(wrapper.style.left).toBe(`${crossing.layout.x * 100}%`);
    expect(wrapper.style.top).toBe(`${crossing.layout.y * 100}%`);
    expect(wrapper.style.transform).toBe("translate(-50%, -50%)");

    const crossingCall = renderSlot.mock.calls.find(([position]) => position.key === "crossing")!;
    expect(crossingCall[2]).toBe(90);
  });

  it("celtic-cross: renderiza un wrapper posicionado por cada una de las 10 posiciones", () => {
    const spread = spreadById("celtic-cross")!;
    const { container } = render(<SpreadLayout spread={spread} renderSlot={(position) => <span>{position.key}</span>} />);

    const wrappers = container.querySelectorAll("[data-position-key]");
    expect(wrappers).toHaveLength(10);
  });

  it("una posición sin rotate en spreads.ts recibe rotate=0 en renderSlot y el wrapper solo translada", () => {
    const spread = spreadById("three")!;
    const renderSlot = vi.fn((position: TarotSpreadPosition, _index: number, _rotate: number) => (
      <span>{position.key}</span>
    ));
    render(<SpreadLayout spread={spread} renderSlot={renderSlot} />);

    const label = screen.getByText("past");
    const wrapper = label.parentElement as HTMLElement;
    expect(wrapper.style.transform).toBe("translate(-50%, -50%)");

    const pastCall = renderSlot.mock.calls.find(([position]) => position.key === "past")!;
    expect(pastCall[2]).toBe(0);
  });
});
