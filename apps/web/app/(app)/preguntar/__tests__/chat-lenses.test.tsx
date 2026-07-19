import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";
import { ChatLenses, type ChatLensesValue } from "../chat-lenses";

// ChatLenses es CONTROLADO: el padre inyecta `value` y recibe `onChange`. Los
// tests inyectan el estado y espían onChange (mismo espíritu que chat-view.test).
function renderLenses(value: ChatLensesValue) {
  const onChange = vi.fn();
  const utils = render(
    <NextIntlClientProvider locale="es" messages={es}>
      <ChatLenses value={value} onChange={onChange} />
    </NextIntlClientProvider>,
  );
  return { onChange, ...utils };
}

const L = es.chat;

describe("ChatLenses — palancas base (astros/numeros/pilares)", () => {
  it("NO apaga la última encendida: click en la única activa no llama onChange", () => {
    const { onChange } = renderLenses({ lenses: ["astros"], tarotCard: null });
    fireEvent.click(screen.getByRole("button", { name: L.lensAstros }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("apaga una base cuando hay más de una activa (preserva tarotCard)", () => {
    const { onChange } = renderLenses({ lenses: ["astros", "numeros"], tarotCard: null });
    fireEvent.click(screen.getByRole("button", { name: L.lensNumeros }));
    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0]![0] as ChatLensesValue;
    expect(next.lenses).toEqual(["astros"]);
    expect(next.tarotCard).toBeNull();
  });

  it("enciende una base apagada", () => {
    const { onChange } = renderLenses({ lenses: ["astros", "numeros"], tarotCard: null });
    fireEvent.click(screen.getByRole("button", { name: L.lensPilares }));
    const next = onChange.mock.calls[0]![0] as ChatLensesValue;
    expect(next.lenses).toContain("pilares");
    expect(next.lenses).toContain("astros");
    expect(next.lenses).toContain("numeros");
  });

  it("aria-pressed refleja el estado activo", () => {
    renderLenses({ lenses: ["astros"], tarotCard: null });
    expect(screen.getByRole("button", { name: L.lensAstros })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: L.lensNumeros })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: L.lensTarot })).toHaveAttribute("aria-pressed", "false");
  });
});

describe("ChatLenses — flujo de tarot", () => {
  it("activar Tarot abre el mini-flujo choose SIN llamar onChange (aún no activa)", () => {
    const { onChange } = renderLenses({ lenses: ["astros", "numeros", "pilares"], tarotCard: null });
    fireEvent.click(screen.getByRole("button", { name: L.lensTarot }));
    // choose visible: ambos botones
    expect(screen.getByRole("button", { name: L.tarotDraw })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: L.tarotManual })).toBeInTheDocument();
    // no activa todavía
    expect(onChange).not.toHaveBeenCalled();
  });

  it("'Sacar carta' → onChange con tarotCard no-null y 'tarot' en lenses", () => {
    const { onChange } = renderLenses({ lenses: ["astros", "numeros", "pilares"], tarotCard: null });
    fireEvent.click(screen.getByRole("button", { name: L.lensTarot }));
    fireEvent.click(screen.getByRole("button", { name: L.tarotDraw }));

    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0]![0] as ChatLensesValue;
    expect(next.tarotCard).not.toBeNull();
    expect(typeof next.tarotCard!.id).toBe("string");
    expect(next.tarotCard!.id.length).toBeGreaterThan(0);
    expect(typeof next.tarotCard!.reversed).toBe("boolean");
    expect(next.lenses).toContain("tarot");
  });

  it("'Tengo mi carta' → picker; elegir una carta → onChange con esa carta y 'tarot'", () => {
    const { onChange } = renderLenses({ lenses: ["astros"], tarotCard: null });
    fireEvent.click(screen.getByRole("button", { name: L.lensTarot }));
    fireEvent.click(screen.getByRole("button", { name: L.tarotManual }));

    // Buscador filtra por nombre
    fireEvent.change(screen.getByPlaceholderText(L.tarotSearchPlaceholder), { target: { value: "loco" } });
    const grid = screen.getByTestId("lens-picker-grid");
    fireEvent.click(within(grid).getByRole("button", { name: /El Loco/ }));

    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0]![0] as ChatLensesValue;
    expect(next.tarotCard).toEqual({ id: "fool", reversed: false });
    expect(next.lenses).toContain("tarot");
  });

  it("picker con toggle 'Invertida' activo → la carta se elige invertida", () => {
    const { onChange } = renderLenses({ lenses: ["astros"], tarotCard: null });
    fireEvent.click(screen.getByRole("button", { name: L.lensTarot }));
    fireEvent.click(screen.getByRole("button", { name: L.tarotManual }));

    fireEvent.click(screen.getByRole("button", { name: L.tarotReversed }));
    fireEvent.change(screen.getByPlaceholderText(L.tarotSearchPlaceholder), { target: { value: "loco" } });
    const grid = screen.getByTestId("lens-picker-grid");
    fireEvent.click(within(grid).getByRole("button", { name: /El Loco/ }));

    const next = onChange.mock.calls[0]![0] as ChatLensesValue;
    expect(next.tarotCard).toEqual({ id: "fool", reversed: true });
  });

  it("Cancelar cierra el flujo sin tocar lenses ni llamar onChange", () => {
    const { onChange } = renderLenses({ lenses: ["astros"], tarotCard: null });
    fireEvent.click(screen.getByRole("button", { name: L.lensTarot }));
    fireEvent.click(screen.getByRole("button", { name: L.tarotCancel }));

    expect(onChange).not.toHaveBeenCalled();
    // flujo cerrado: ya no hay botón "Sacar carta"
    expect(screen.queryByRole("button", { name: L.tarotDraw })).not.toBeInTheDocument();
  });
});

describe("ChatLenses — carta fijada", () => {
  const pinned: ChatLensesValue = { lenses: ["astros", "tarot"], tarotCard: { id: "fool", reversed: true } };

  it("muestra nombre + 'invertida' + botón 'otra carta'", () => {
    renderLenses(pinned);
    expect(screen.getByText("El Loco")).toBeInTheDocument();
    expect(screen.getByText(L.tarotReversed)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: L.tarotAnother })).toBeInTheDocument();
    // Tarot activa
    expect(screen.getByRole("button", { name: L.lensTarot })).toHaveAttribute("aria-pressed", "true");
  });

  it("'otra carta' reabre el flujo choose", () => {
    renderLenses(pinned);
    fireEvent.click(screen.getByRole("button", { name: L.tarotAnother }));
    expect(screen.getByRole("button", { name: L.tarotDraw })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: L.tarotManual })).toBeInTheDocument();
  });

  it("click en Tarot activo → apaga y limpia tarotCard", () => {
    const { onChange } = renderLenses(pinned);
    fireEvent.click(screen.getByRole("button", { name: L.lensTarot }));
    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0]![0] as ChatLensesValue;
    expect(next.lenses).not.toContain("tarot");
    expect(next.tarotCard).toBeNull();
  });
});
