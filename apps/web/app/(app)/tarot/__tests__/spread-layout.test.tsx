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

  it("llama a renderSlot una vez por posición con la posición y el índice correctos", () => {
    const spread = spreadById("three")!;
    const renderSlot = vi.fn((position: TarotSpreadPosition) => <span>{position.key}</span>);
    render(<SpreadLayout spread={spread} renderSlot={renderSlot} />);

    expect(renderSlot).toHaveBeenCalledTimes(spread.positions.length);
    spread.positions.forEach((position, index) => {
      expect(renderSlot).toHaveBeenNthCalledWith(index + 1, position, index);
    });
  });

  it("celtic-cross: la posición 'crossing' lleva rotate(90deg) en su transform", () => {
    const spread = spreadById("celtic-cross")!;
    render(<SpreadLayout spread={spread} renderSlot={(position) => <span>{position.key}</span>} />);

    const crossing = spread.positions.find((p) => p.key === "crossing")!;
    const label = screen.getByText("crossing");
    const wrapper = label.parentElement as HTMLElement;
    expect(wrapper.style.left).toBe(`${crossing.layout.x * 100}%`);
    expect(wrapper.style.top).toBe(`${crossing.layout.y * 100}%`);
    expect(wrapper.style.transform).toContain("rotate(90deg)");
  });

  it("celtic-cross: renderiza un wrapper posicionado por cada una de las 10 posiciones", () => {
    const spread = spreadById("celtic-cross")!;
    const { container } = render(<SpreadLayout spread={spread} renderSlot={(position) => <span>{position.key}</span>} />);

    const wrappers = container.querySelectorAll("[data-position-key]");
    expect(wrappers).toHaveLength(10);
  });

  it("una posición sin rotate cae en rotate(0deg) en el transform", () => {
    const spread = spreadById("three")!;
    render(<SpreadLayout spread={spread} renderSlot={(position) => <span>{position.key}</span>} />);

    const label = screen.getByText("past");
    const wrapper = label.parentElement as HTMLElement;
    expect(wrapper.style.transform).toContain("translate(-50%, -50%)");
    expect(wrapper.style.transform).toContain("rotate(0deg)");
  });
});
