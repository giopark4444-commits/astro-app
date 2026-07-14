import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { AreaBars, type BarArea } from "../area-bars";

const AREAS: BarArea[] = [
  {
    key: "money", label: "Dinero", score: 66, tone: "high", toneLabel: "Alta",
    drivers: [{ glyphs: "♃ · 2", text: "Júpiter recorre tu casa 2 solar", favorable: true }],
  },
  { key: "love", label: "Amor", score: 50, tone: "mixed", toneLabel: "Mixta", drivers: [] },
];

describe("AreaBars", () => {
  it("pinta una barra por área con su score", () => {
    render(<AreaBars areas={AREAS} calmText="Cielo en calma" open={null} onToggle={() => {}} />);
    expect(screen.getByText("Dinero")).toBeInTheDocument();
    expect(screen.getByText("66")).toBeInTheDocument();
  });
  it("clic en el header llama a onToggle con la key del área", () => {
    const onToggle = vi.fn();
    render(<AreaBars areas={AREAS} calmText="Cielo en calma" open={null} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("button", { name: /Dinero/ }));
    expect(onToggle).toHaveBeenCalledWith("money");
  });
  it("open=key expande esa área y muestra sus drivers; sin drivers muestra el texto de calma", () => {
    const { rerender } = render(
      <AreaBars areas={AREAS} calmText="Cielo en calma" open="money" onToggle={() => {}} />,
    );
    expect(screen.getByText(/Júpiter recorre tu casa 2 solar/)).toBeInTheDocument();
    rerender(<AreaBars areas={AREAS} calmText="Cielo en calma" open="love" onToggle={() => {}} />);
    expect(screen.getByText("Cielo en calma")).toBeInTheDocument();
  });
  it("el estado de expansión sobrevive si el componente permanece montado tras cambiar props (regression guard)", () => {
    const { rerender } = render(
      <AreaBars areas={AREAS} calmText="Cielo en calma" open="money" onToggle={() => {}} />,
    );
    expect(screen.getByText(/Júpiter recorre tu casa 2 solar/)).toBeInTheDocument();
    // re-render with a NEW areas array reference (simulating fresh fetched data) but same `open` prop
    rerender(<AreaBars areas={[...AREAS]} calmText="Cielo en calma" open="money" onToggle={() => {}} />);
    expect(screen.getByText(/Júpiter recorre tu casa 2 solar/)).toBeInTheDocument();
  });
});
