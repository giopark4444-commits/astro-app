// "Pregúntale a tu camino" (Camino de vida T6): botón flotante que abre la
// sheet con el chat. Turno-0 lo dispara el propio componente al abrir
// (messages:[] → la IA abre, o {available:false} latente sin llaves) — mismo
// patrón que app/(app)/tarot/__tests__/reading-chat.test.tsx.
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";
import { TimelineChatFab } from "../timeline-chat";

function renderFab() {
  render(
    <NextIntlClientProvider locale="es" messages={es}>
      <TimelineChatFab profileId="profile-1" />
    </NextIntlClientProvider>,
  );
}

describe("TimelineChatFab", () => {
  it("sin profileId no se renderiza", () => {
    render(
      <NextIntlClientProvider locale="es" messages={es}>
        <TimelineChatFab />
      </NextIntlClientProvider>,
    );
    expect(screen.queryByText(es.lifetime.chatFab)).not.toBeInTheDocument();
  });

  it("al tocar el botón abre la sheet y dispara el turno-0", async () => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      json: async () => ({ available: false }),
    })) as unknown as typeof fetch;

    renderFab();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText(es.lifetime.chatFab));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(await screen.findByText(es.lifetime.chatDormantTitle)).toBeInTheDocument();
  });

  it("con proveedor: el turno-0 llega en streaming como primer mensaje de Aluna", async () => {
    const encoder = new TextEncoder();
    global.fetch = vi.fn(async () => {
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encoder.encode("¿Qué recuerdas de 2019?"));
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

    renderFab();
    fireEvent.click(screen.getByText(es.lifetime.chatFab));
    expect(await screen.findByText("¿Qué recuerdas de 2019?")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(es.lifetime.chatPlaceholder)).toBeInTheDocument();
  });

  it("body enviado en el turno-0: profileId + locale presentes, messages vacío", async () => {
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

    renderFab();
    fireEvent.click(screen.getByText(es.lifetime.chatFab));
    await screen.findByText(es.lifetime.chatDormantTitle);
    expect(calls).toHaveLength(1);
    const body = calls[0] as { locale: string; profileId: string; messages: unknown[] };
    expect(body.locale).toBe("es");
    expect(body.profileId).toBe("profile-1");
    expect(body.messages).toEqual([]);
  });
});
