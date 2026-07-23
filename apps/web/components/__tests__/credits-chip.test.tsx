// Chip de saldo (✦ N) junto al avatar de Ajustes (Task 4). Fail-safe total:
// null mientras carga, en error, o sin sesión (401); se refresca al recuperar
// foco la ventana; SIN polling continuo.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";
import { CreditsChip } from "../credits-chip";

function renderChip() {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <CreditsChip />
    </NextIntlClientProvider>,
  );
}

function jsonResponse(body: unknown, ok = true) {
  return { ok, headers: { get: () => "application/json" }, json: async () => body };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("CreditsChip", () => {
  it("no renderiza nada mientras el fetch está en curso", () => {
    global.fetch = vi.fn(() => new Promise(() => {})) as unknown as typeof fetch; // nunca resuelve
    const { container } = renderChip();
    expect(container).toBeEmptyDOMElement();
  });

  it("muestra ✦ {balance} tras un fetch exitoso, con link a /ajustes y aria-label de Créditos", async () => {
    global.fetch = vi.fn(async () => jsonResponse({ balance: 42 })) as unknown as typeof fetch;
    renderChip();

    const link = await screen.findByRole("link", { name: es.credits.title });
    expect(link).toHaveAttribute("href", "/ajustes");
    expect(link.textContent).toContain("42");
    expect(link.textContent).toContain("✦");
  });

  it("401 (sin sesión) → no renderiza nada", async () => {
    global.fetch = vi.fn(async () => jsonResponse({ error: "unauthorized" }, false)) as unknown as typeof fetch;
    const { container } = renderChip();

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    expect(container).toBeEmptyDOMElement();
  });

  it("fetch roto (red caída) → no renderiza nada, sin lanzar", async () => {
    global.fetch = vi.fn(async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    const { container } = renderChip();

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    expect(container).toBeEmptyDOMElement();
  });

  it("balance no-numérico en la respuesta → no renderiza nada", async () => {
    global.fetch = vi.fn(async () => jsonResponse({})) as unknown as typeof fetch;
    const { container } = renderChip();

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    expect(container).toBeEmptyDOMElement();
  });

  it("re-fetchea al recuperar foco la ventana y refleja el saldo nuevo", async () => {
    let call = 0;
    global.fetch = vi.fn(async () => {
      call += 1;
      return jsonResponse({ balance: call === 1 ? 10 : 7 });
    }) as unknown as typeof fetch;

    renderChip();
    await screen.findByText(/10/);

    window.dispatchEvent(new Event("focus"));
    await waitFor(() => expect(screen.getByRole("link")).toHaveTextContent("7"));
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("sin polling: tras el fetch inicial, dejar pasar tiempo no dispara llamadas nuevas", async () => {
    global.fetch = vi.fn(async () => jsonResponse({ balance: 5 })) as unknown as typeof fetch;
    renderChip();
    // Deja resolver el fetch inicial con timers REALES antes de instalar los
    // falsos — mezclar fake timers con el polling interno de waitFor cuelga.
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    vi.useFakeTimers();
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    vi.useRealTimers();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
