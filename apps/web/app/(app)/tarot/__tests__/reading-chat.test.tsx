import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";
import { ReadingChat } from "../reading-chat";

// "Conversa esta tirada" (Tarot T3): el turno-0 lo dispara el propio
// componente al montar (messages:[] → la IA abre, o {available:false}
// latente sin llaves). Estos tests cubren ambos caminos del brief.

function renderChat() {
  render(
    <NextIntlClientProvider locale="es" messages={es}>
      <ReadingChat spreadId="daily" cards={[{ cardId: "fool", reversed: false, position: "day" }]} />
    </NextIntlClientProvider>,
  );
}

describe("ReadingChat", () => {
  it("sin llaves: el turno-0 responde available:false y se muestra la nota dormida", async () => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      json: async () => ({ available: false }),
    })) as unknown as typeof fetch;

    renderChat();
    expect(await screen.findByText(es.tarot.chatDormantTitle)).toBeInTheDocument();
    expect(screen.getByText(es.tarot.chatDormantBody)).toBeInTheDocument();
    // El estado dormido no ofrece composer.
    expect(screen.queryByPlaceholderText(es.tarot.chatPlaceholder)).not.toBeInTheDocument();
  });

  it("con proveedor: el turno-0 llega en streaming como el primer mensaje de Aluna", async () => {
    const encoder = new TextEncoder();
    global.fetch = vi.fn(async () => {
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encoder.encode("¿Qué sientes con esta carta?"));
          controller.close();
        },
      });
      return {
        ok: true,
        status: 200,
        headers: { get: (k: string) => (k === "content-type" ? "text/plain; charset=utf-8" : null) },
        body: stream,
      } as unknown as Response;
    }) as unknown as typeof fetch;

    renderChat();
    expect(await screen.findByText("¿Qué sientes con esta carta?")).toBeInTheDocument();
    // El composer ya está disponible tras el turno-0.
    expect(screen.getByPlaceholderText(es.tarot.chatPlaceholder)).toBeInTheDocument();
  });

  it("body enviado en el turno-0: messages vacío, locale/spreadId/cards presentes", async () => {
    const calls: unknown[] = [];
    global.fetch = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      calls.push(JSON.parse(String(init?.body)));
      return {
        ok: true,
        status: 200,
        headers: { get: () => "application/json" },
        json: async () => ({ available: false }),
      } as unknown as Response;
    }) as unknown as typeof fetch;

    renderChat();
    await screen.findByText(es.tarot.chatDormantTitle);
    expect(calls).toHaveLength(1);
    const body = calls[0] as { locale: string; spreadId: string; cards: unknown[]; messages: unknown[] };
    expect(body.locale).toBe("es");
    expect(body.spreadId).toBe("daily");
    expect(body.cards).toEqual([{ cardId: "fool", reversed: false, position: "day" }]);
    expect(body.messages).toEqual([]);
  });
});
