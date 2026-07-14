import { describe, expect, it } from "vitest";
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
    render(<AreaBars areas={AREAS} calmText="Cielo en calma" />);
    expect(screen.getByText("Dinero")).toBeInTheDocument();
    expect(screen.getByText("66")).toBeInTheDocument();
  });
  it("expandir muestra los drivers; sin drivers muestra el texto de calma", () => {
    render(<AreaBars areas={AREAS} calmText="Cielo en calma" />);
    fireEvent.click(screen.getByRole("button", { name: /Dinero/ }));
    expect(screen.getByText(/Júpiter recorre tu casa 2 solar/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Amor/ }));
    expect(screen.getByText("Cielo en calma")).toBeInTheDocument();
  });
});
