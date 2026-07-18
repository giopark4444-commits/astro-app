import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";
import { ChatView } from "../chat-view";
import chatStyles from "../chat.module.css";

// Mismo patrón que horoscopo-view.test.tsx: perfil activo mockeado + control de
// la query `?q=` por test vía vi.hoisted (se necesita ANTES del vi.mock, que se
// iza sobre los imports).
const { mockActive, mockQuery } = vi.hoisted(() => ({
  mockActive: { current: { id: "profile-1" } as { id: string } | null },
  mockQuery: { current: null as string | null },
}));

vi.mock("@/lib/profiles/profiles-provider", () => ({ useProfiles: () => ({ active: mockActive.current }) }));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mockQuery.current ? `q=${encodeURIComponent(mockQuery.current)}` : ""),
}));

/** Respuesta JSON (no-stream) del mock de /api/chat: dispara el estado dormant
 *  cuando `available: false` (sin llave configurada), como en producción. */
function dormantResponse() {
  return { ok: true, headers: { get: () => "application/json" }, json: async () => ({ available: false }) };
}

beforeEach(() => {
  mockActive.current = { id: "profile-1" };
  mockQuery.current = null;
  global.fetch = vi.fn(async () => dormantResponse()) as unknown as typeof fetch;
});

function renderView(props: { embedded?: boolean } = {}) {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <ChatView {...props} />
    </NextIntlClientProvider>,
  );
}

describe("ChatView — modo página (default, sin prop embedded)", () => {
  it("precarga el input desde ?q= sin auto-enviar (comportamiento existente intacto)", () => {
    mockQuery.current = "hola";
    renderView();

    // Precarga: mismo comportamiento documentado en chat-view.tsx desde
    // e693c28 ("NO auto-envía la pregunta") — solo por montar, sin
    // interacción, no debe haber llamada a /api/chat.
    const input = screen.getByPlaceholderText(es.chat.placeholder) as HTMLInputElement;
    expect(input.value).toBe("hola");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("muestra la cabecera de página y usa el contenedor styles.wrap (no wrapEmbedded)", () => {
    renderView();
    expect(screen.getByText(es.chat.title)).toBeInTheDocument();

    const root = screen.getByText(es.chat.title).closest(`.${CSS.escape(chatStyles.wrap!)}`);
    expect(root).not.toBeNull();
  });

  it("el seed de ?q= viaja al enviar (click en Enviar dispara fetch con 'hola')", async () => {
    mockQuery.current = "hola";
    renderView();

    fireEvent.click(screen.getByRole("button", { name: es.chat.send }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]![1]!.body as string);
    expect(body.messages).toEqual([{ role: "user", content: "hola" }]);
  });

  it("dormant visible cuando /api/chat responde available:false", async () => {
    renderView();
    fireEvent.change(screen.getByPlaceholderText(es.chat.placeholder), { target: { value: "algo" } });
    fireEvent.click(screen.getByRole("button", { name: es.chat.send }));

    await waitFor(() => expect(screen.getByText(es.chat.dormantTitle)).toBeInTheDocument());
  });
});

describe("ChatView — modo embebido (<ChatView embedded />)", () => {
  it("ignora ?q= (input arranca vacío) y no auto-envía", () => {
    mockQuery.current = "hola";
    renderView({ embedded: true });

    const input = screen.getByPlaceholderText(es.chat.placeholder) as HTMLInputElement;
    expect(input.value).toBe("");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("no renderiza la cabecera de página; contenedor raíz usa styles.wrapEmbedded", () => {
    const { container } = renderView({ embedded: true });

    expect(screen.queryByText(es.chat.title)).not.toBeInTheDocument();
    expect(container.querySelector(`.${CSS.escape(chatStyles.wrapEmbedded!)}`)).not.toBeNull();
  });

  it("streaming/estados intactos: dormant visible igual que en modo página", async () => {
    renderView({ embedded: true });
    fireEvent.change(screen.getByPlaceholderText(es.chat.placeholder), { target: { value: "algo" } });
    fireEvent.click(screen.getByRole("button", { name: es.chat.send }));

    await waitFor(() => expect(screen.getByText(es.chat.dormantTitle)).toBeInTheDocument());
  });
});
