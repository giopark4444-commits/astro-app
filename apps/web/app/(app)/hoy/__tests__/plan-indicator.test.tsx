import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";
import { PlanIndicator } from "../plan-indicator";

// Pedido de Gio (2026-07-24): la columna derecha de Hoy no tenía nada
// equivalente al PeriodSelector de la izquierda como primera fila — eso
// desalineaba el arranque de las dos columnas. PlanIndicator ocupa ese lugar
// mostrando Básico/Core/Plus con el mismo primitivo .seg que el
// PeriodSelector (misma altura). "Core" es un nombre para un plan que aún NO
// existe en el backend (binario Básico/Plus, ver isRequesterPlus) — se
// muestra como etiqueta pero JAMÁS se enciende con un dato inventado.

function renderIndicator() {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <PlanIndicator />
    </NextIntlClientProvider>,
  );
}

describe("PlanIndicator", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ balance: 0, ledger: [], isPlus: false }),
    })) as unknown as ReturnType<typeof vi.fn>;
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it("muestra las 3 etiquetas Básico/Core/Plus, en ese orden", async () => {
    renderIndicator();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/credits"));

    const group = screen.getByRole("group", { name: es.hoy.planIndicatorAria });
    expect(group.textContent).toBe([es.hoy.planBasico, es.hoy.planCore, es.hoy.planPlus].join(""));
  });

  it("isPlus:false (respuesta real de /api/credits) enciende Básico, no Core ni Plus", async () => {
    renderIndicator();

    await waitFor(() => expect(screen.getByText(es.hoy.planBasico)).toHaveAttribute("aria-current", "true"));
    expect(screen.getByText(es.hoy.planCore)).not.toHaveAttribute("aria-current");
    expect(screen.getByText(es.hoy.planPlus)).not.toHaveAttribute("aria-current");
  });

  it("isPlus:true enciende Plus, no Básico ni Core — Core nunca se enciende (no existe todavía)", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ balance: 5, ledger: [], isPlus: true }) });
    renderIndicator();

    await waitFor(() => expect(screen.getByText(es.hoy.planPlus)).toHaveAttribute("aria-current", "true"));
    expect(screen.getByText(es.hoy.planBasico)).not.toHaveAttribute("aria-current");
    expect(screen.getByText(es.hoy.planCore)).not.toHaveAttribute("aria-current");
  });

  it("fetch fallido: no rompe, y no adivina un plan (nada encendido)", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));
    renderIndicator();

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    for (const label of [es.hoy.planBasico, es.hoy.planCore, es.hoy.planPlus]) {
      expect(screen.getByText(label)).not.toHaveAttribute("aria-current");
    }
  });
});
