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

/** Respuesta del GET /api/chat/thread (Fase 1B, retomar): sin hilo por
 *  defecto, para que ningún test existente vea la conversación precargada. */
function emptyThreadResponse() {
  return { ok: true, headers: { get: () => "application/json" }, json: async () => ({ threadId: null, messages: [] }) };
}

/** Solo las llamadas POST (a /api/chat) — el mount de ChatView SIEMPRE dispara
 *  además un GET a /api/chat/thread (retomar), que estos helpers ignoran. */
function postCalls() {
  return (global.fetch as ReturnType<typeof vi.fn>).mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method === "POST");
}

beforeEach(() => {
  mockActive.current = { id: "profile-1" };
  mockQuery.current = null;
  global.fetch = vi.fn(async (url: unknown) =>
    typeof url === "string" && url.includes("/api/chat/thread") ? emptyThreadResponse() : dormantResponse(),
  ) as unknown as typeof fetch;
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
    // interacción, no debe haber llamada a /api/chat (el único fetch del
    // montaje es el GET de retomar, /api/chat/thread — ver postCalls()).
    const input = screen.getByPlaceholderText(es.chat.placeholder) as HTMLInputElement;
    expect(input.value).toBe("hola");
    expect(postCalls()).toHaveLength(0);
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

    await waitFor(() => expect(postCalls()).toHaveLength(1));
    const body = JSON.parse(postCalls()[0]![1]!.body as string);
    expect(body.messages).toEqual([{ role: "user", content: "hola" }]);
  });

  it("dormant visible cuando /api/chat responde available:false", async () => {
    renderView();
    fireEvent.change(screen.getByPlaceholderText(es.chat.placeholder), { target: { value: "algo" } });
    fireEvent.click(screen.getByRole("button", { name: es.chat.send }));

    await waitFor(() => expect(screen.getByText(es.chat.dormantTitle)).toBeInTheDocument());
  });
});

describe("ChatView — auto-scroll del hilo (no arrastra la ventana)", () => {
  // Bug: scrollIntoView con block:"start" (default) escala hasta el scroll de
  // la VENTANA. En /hoy (chat embebido en un panel bajo el header) esto hacía
  // que la página cargara ya scrolleada, tapando el encabezado. El fix
  // scrollea el CONTENEDOR del hilo (styles.thread) por scrollTop, sin tocar
  // la ventana — verificado acá espiando window.scrollTo/scrollIntoView.
  it("pega el hilo a su fondo por scrollTop, sin llamar scrollIntoView ni scrollTo de la ventana", async () => {
    const scrollToSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    // jsdom no implementa scrollIntoView (por eso el código original la
    // invocaba con optional chaining) — se lo stubeamos para poder espiarlo.
    if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};
    const scrollIntoViewSpy = vi.spyOn(Element.prototype, "scrollIntoView").mockImplementation(() => {});

    const { container } = renderView();
    const thread = container.querySelector(`.${CSS.escape(chatStyles.thread!)}`) as HTMLDivElement;
    expect(thread).not.toBeNull();
    // jsdom no calcula layout: scrollHeight es siempre 0. Lo mockeamos para
    // poder verificar que el efecto lo usa como destino de scrollTop.
    Object.defineProperty(thread, "scrollHeight", { value: 1234, configurable: true });
    thread.scrollTop = 0;

    fireEvent.change(screen.getByPlaceholderText(es.chat.placeholder), { target: { value: "hola" } });
    fireEvent.click(screen.getByRole("button", { name: es.chat.send }));

    await waitFor(() => expect(screen.getByText(es.chat.dormantTitle)).toBeInTheDocument());

    expect(thread.scrollTop).toBe(1234);
    expect(scrollToSpy).not.toHaveBeenCalled();
    expect(scrollIntoViewSpy).not.toHaveBeenCalled();

    scrollToSpy.mockRestore();
    scrollIntoViewSpy.mockRestore();
  });
});

describe("ChatView — palancas de enfoque (CT3: montaje + POST)", () => {
  it("monta ChatLenses sobre el hilo en modo página", () => {
    renderView();
    expect(screen.getByTestId("chat-lenses")).toBeInTheDocument();
  });

  it("monta ChatLenses sobre el hilo también en modo embebido", () => {
    renderView({ embedded: true });
    expect(screen.getByTestId("chat-lenses")).toBeInTheDocument();
  });

  it("el POST a /api/chat incluye lenses (default astros/numeros/pilares) y tarotCard:null", async () => {
    renderView();
    fireEvent.change(screen.getByPlaceholderText(es.chat.placeholder), { target: { value: "hola" } });
    fireEvent.click(screen.getByRole("button", { name: es.chat.send }));

    await waitFor(() => expect(postCalls()).toHaveLength(1));
    const body = JSON.parse(postCalls()[0]![1]!.body as string);
    expect(body.lenses).toEqual(["astros", "numeros", "pilares"]);
    expect(body.tarotCard).toBeNull();
  });

  it("apagar una palanca antes de enviar viaja reflejado en el body del POST", async () => {
    renderView();
    fireEvent.click(screen.getByRole("button", { name: es.chat.lensNumeros }));

    fireEvent.change(screen.getByPlaceholderText(es.chat.placeholder), { target: { value: "hola" } });
    fireEvent.click(screen.getByRole("button", { name: es.chat.send }));

    await waitFor(() => expect(postCalls()).toHaveLength(1));
    const body = JSON.parse(postCalls()[0]![1]!.body as string);
    expect(body.lenses).toEqual(["astros", "pilares"]);
  });

  it("sacar una carta de tarot antes de enviar viaja tarotCard en el body del POST", async () => {
    renderView();
    fireEvent.click(screen.getByRole("button", { name: es.chat.lensTarot }));
    fireEvent.click(screen.getByRole("button", { name: es.chat.tarotDraw }));

    fireEvent.change(screen.getByPlaceholderText(es.chat.placeholder), { target: { value: "hola" } });
    fireEvent.click(screen.getByRole("button", { name: es.chat.send }));

    await waitFor(() => expect(postCalls()).toHaveLength(1));
    const body = JSON.parse(postCalls()[0]![1]!.body as string);
    expect(body.lenses).toContain("tarot");
    expect(body.tarotCard).not.toBeNull();
    expect(typeof body.tarotCard.id).toBe("string");
  });
});

describe("ChatView — retomar el hilo (Fase 1B)", () => {
  it("precarga la conversación del hilo reciente al montar, sin pisar el ?q=", async () => {
    mockQuery.current = "hola de nuevo";
    global.fetch = vi.fn(async (url: unknown) =>
      typeof url === "string" && url.includes("/api/chat/thread")
        ? {
            ok: true,
            headers: { get: () => "application/json" },
            json: async () => ({
              threadId: "thread-1",
              messages: [
                { role: "user", content: "¿qué significa mi luna?" },
                { role: "assistant", content: "Tu luna habla de tu mundo emocional." },
              ],
            }),
          }
        : dormantResponse(),
    ) as unknown as typeof fetch;

    renderView();

    await waitFor(() => expect(screen.getByText("¿qué significa mi luna?")).toBeInTheDocument());
    expect(screen.getByText("Tu luna habla de tu mundo emocional.")).toBeInTheDocument();
    // El ?q= sigue precargado en el input — retomar no lo pisa.
    const input = screen.getByPlaceholderText(es.chat.placeholder) as HTMLInputElement;
    expect(input.value).toBe("hola de nuevo");
  });

  it("sin hilo previo, arranca vacío como hoy (sin romper por el fetch de retomar)", () => {
    renderView();
    expect(screen.getByText(es.chat.greeting)).toBeInTheDocument();
  });

  it("el threadId retomado viaja en el siguiente POST a /api/chat", async () => {
    global.fetch = vi.fn(async (url: unknown, init?: RequestInit) => {
      if (typeof url === "string" && url.includes("/api/chat/thread")) {
        return {
          ok: true,
          headers: { get: () => "application/json" },
          json: async () => ({ threadId: "thread-1", messages: [{ role: "user", content: "hola" }] }),
        };
      }
      void init;
      return dormantResponse();
    }) as unknown as typeof fetch;

    renderView();
    await waitFor(() => expect(screen.getByText("hola")).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText(es.chat.placeholder), { target: { value: "otra pregunta" } });
    fireEvent.click(screen.getByRole("button", { name: es.chat.send }));

    await waitFor(() => expect(postCalls()).toHaveLength(1));
    const body = JSON.parse(postCalls()[0]![1]!.body as string);
    expect(body.threadId).toBe("thread-1");
  });
});

describe("ChatView — modo embebido (<ChatView embedded />)", () => {
  it("ignora ?q= (input arranca vacío) y no auto-envía", () => {
    mockQuery.current = "hola";
    renderView({ embedded: true });

    const input = screen.getByPlaceholderText(es.chat.placeholder) as HTMLInputElement;
    expect(input.value).toBe("");
    expect(postCalls()).toHaveLength(0);
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
