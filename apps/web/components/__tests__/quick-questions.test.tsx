import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "../../messages/es.json";
import { DEFAULT_QUICK_QUESTIONS } from "../../lib/quick-questions";

const saveMock = vi.fn().mockResolvedValue(undefined);
vi.mock("../../app/(app)/actions", () => ({ saveQuickQuestions: (p: string[][]) => saveMock(p) }));

import { QuickQuestions } from "../../app/(app)/preguntar/quick-questions";

function renderQ(onSend = vi.fn()) {
  render(
    <NextIntlClientProvider locale="es" messages={es}>
      <QuickQuestions onSend={onSend} />
    </NextIntlClientProvider>,
  );
  return onSend;
}

beforeEach(() => {
  saveMock.mockClear();
  // fetch falla → el componente se queda con los defaults ES (comportamiento probado aquí)
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
});

describe("QuickQuestions", () => {
  it("muestra los 6 chips de la página 1 y tocar uno llama onSend con su texto", async () => {
    const onSend = renderQ();
    const first = DEFAULT_QUICK_QUESTIONS.es[0]![0]!;
    const chip = await screen.findByRole("button", { name: first });
    fireEvent.click(chip);
    expect(onSend).toHaveBeenCalledWith(first);
  });

  it("paginar a la página 2 muestra las otras 6 preguntas", async () => {
    renderQ();
    await screen.findByRole("button", { name: DEFAULT_QUICK_QUESTIONS.es[0]![0]! });
    // el segundo punto de paginación (aria-label "Página 2 de 2")
    fireEvent.click(screen.getByRole("button", { name: "Página 2 de 2" }));
    expect(screen.getByRole("button", { name: DEFAULT_QUICK_QUESTIONS.es[1]![0]! })).toBeInTheDocument();
  });

  it("el lápiz convierte los chips en inputs; Guardar persiste 2×6", async () => {
    renderQ();
    await screen.findByRole("button", { name: DEFAULT_QUICK_QUESTIONS.es[0]![0]! });
    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    const input = screen.getByRole("textbox", { name: "Pregunta 1" }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Mi pregunta propia" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(saveMock).toHaveBeenCalledTimes(1));
    const saved = saveMock.mock.calls[0]![0] as string[][];
    expect(saved).toHaveLength(2);
    expect(saved[0]).toHaveLength(6);
    expect(saved[0]![0]).toBe("Mi pregunta propia");
  });

  it("Restaurar vuelve los inputs a los defaults", async () => {
    renderQ();
    await screen.findByRole("button", { name: DEFAULT_QUICK_QUESTIONS.es[0]![0]! });
    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    const input = screen.getByRole("textbox", { name: "Pregunta 1" }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "cambiado" } });
    fireEvent.click(screen.getByRole("button", { name: "Restaurar" }));
    const restored = screen.getByRole("textbox", { name: "Pregunta 1" }) as HTMLInputElement;
    expect(restored.value).toBe(DEFAULT_QUICK_QUESTIONS.es[0]![0]);
  });
});
