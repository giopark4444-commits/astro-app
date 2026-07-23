import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";
import { CreditsCard } from "../credits-card";

// Task 9: sección "Créditos" de /ajustes — saldo, compra de packs (checkout
// Dodo) e historial. Hermana de plan-card.tsx: mismos estados loading/error.

function renderCard(props: Partial<{ checkoutCredits: boolean }> = {}) {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <CreditsCard {...props} />
    </NextIntlClientProvider>,
  );
}

const LEDGER_FIXTURE = [
  { delta: 60, kind: "refill", created_at: "2026-07-12T00:00:00Z" },
  { delta: -3, kind: "spend", created_at: "2026-07-10T00:00:00Z" },
];

describe("CreditsCard", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ balance: 42, ledger: LEDGER_FIXTURE }),
    })) as unknown as ReturnType<typeof vi.fn>;
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  // Formato de fecha real: el componente usa Intl.DateTimeFormat(locale, ...)
  // SIN timeZone explícito (mismo criterio que plan-card/essence-view), así
  // que "día numérico" depende del huso horario de la máquina que corre el
  // test — se calcula acá con la misma llamada en vez de asumir UTC.
  const dateFmt = new Intl.DateTimeFormat("es", { day: "numeric", month: "short" });

  it("pide /api/credits y muestra el saldo, los 3 packs y el historial", async () => {
    renderCard();

    await waitFor(() => expect(screen.getByText(/42/)).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith("/api/credits");

    expect(screen.getByRole("button", { name: es.credits.pack100 })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: es.credits.pack300 })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: es.credits.pack1000 })).toBeInTheDocument();

    const rows = screen.getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent(`+60 · Recarga mensual · ${dateFmt.format(new Date(LEDGER_FIXTURE[0]!.created_at))}`);
    expect(rows[1]).toHaveTextContent(`-3 · Uso · ${dateFmt.format(new Date(LEDGER_FIXTURE[1]!.created_at))}`);
  });

  it("al hacer click en un pack, llama al checkout con el pack correcto y redirige", async () => {
    const checkoutMock = vi.fn(async (url: string) => {
      if (url === "/api/credits") return { ok: true, json: async () => ({ balance: 10, ledger: [] }) };
      return { ok: true, json: async () => ({ checkoutUrl: "https://checkout.dodopayments.com/session_x" }) };
    });
    global.fetch = checkoutMock as unknown as typeof fetch;
    // jsdom no implementa navegación real — solo se verifica que se intentó
    // asignar window.location.href, no que la navegación ocurra de verdad
    // (mismo criterio que cualquier test de startCheckout en plan-card).
    delete (window as unknown as { location?: unknown }).location;
    (window as unknown as { location: { href: string } }).location = { href: "" };

    renderCard();
    await waitFor(() => expect(screen.getByText(es.credits.balanceLabel).closest("p")).toHaveTextContent("10"));

    fireEvent.click(screen.getByRole("button", { name: es.credits.pack100 }));

    await waitFor(() => expect(window.location.href).toBe("https://checkout.dodopayments.com/session_x"));
    expect(checkoutMock).toHaveBeenCalledWith(
      "/api/billing/checkout",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ pack: "pack100" }),
      }),
    );
  });

  it("fetch fallido → card de error, pero los 3 botones de pack siguen visibles", async () => {
    fetchMock = vi.fn(async () => {
      throw new Error("network");
    }) as unknown as ReturnType<typeof vi.fn>;
    global.fetch = fetchMock as unknown as typeof fetch;

    renderCard();

    await waitFor(() => expect(screen.getByText(es.credits.error)).toBeInTheDocument());
    expect(screen.getByRole("button", { name: es.credits.pack100 })).toBeInTheDocument();
  });

  it("401 (sin sesión) → misma card de error", async () => {
    fetchMock = vi.fn(async () => ({ ok: false, json: async () => ({ error: "unauthorized" }) })) as unknown as ReturnType<
      typeof vi.fn
    >;
    global.fetch = fetchMock as unknown as typeof fetch;

    renderCard();

    await waitFor(() => expect(screen.getByText(es.credits.error)).toBeInTheDocument());
  });

  it("ledger vacío → mensaje de historial vacío", async () => {
    fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ balance: 0, ledger: [] }),
    })) as unknown as ReturnType<typeof vi.fn>;
    global.fetch = fetchMock as unknown as typeof fetch;

    renderCard();

    await waitFor(() => expect(screen.getByText(es.credits.empty)).toBeInTheDocument());
  });

  it("?checkout=credits muestra el mensajito de agradecimiento", async () => {
    renderCard({ checkoutCredits: true });
    await waitFor(() => expect(screen.getByText(es.credits.purchaseThanks)).toBeInTheDocument());
  });

  it("historial se corta a los últimos 10 aunque la API mande hasta 20", async () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({
      delta: 1,
      kind: "grant",
      created_at: `2026-07-${String(i + 1).padStart(2, "0")}T00:00:00Z`,
    }));
    fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ balance: 20, ledger: rows }),
    })) as unknown as ReturnType<typeof vi.fn>;
    global.fetch = fetchMock as unknown as typeof fetch;

    renderCard();

    await waitFor(() => expect(screen.getAllByText(/Regalo/).length).toBeGreaterThan(0));
    expect(screen.getAllByText(/Regalo/)).toHaveLength(10);
  });
});
