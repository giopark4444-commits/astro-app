// Task 8: toggle premium ✨ + chip de saldo + avisos en el chat. Sigue el
// estilo de chat-view.test.tsx (mismo hoisted mockActive/mockQuery, mismo
// helper postCalls) — este archivo cubre SOLO lo nuevo de créditos; el resto
// del comportamiento de ChatView ya está cubierto ahí.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";
import { ChatView } from "../chat-view";

const { mockActive } = vi.hoisted(() => ({
  mockActive: { current: { id: "profile-1" } as { id: string } | null },
}));

vi.mock("@/lib/profiles/profiles-provider", () => ({ useProfiles: () => ({ active: mockActive.current }) }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));

/** Respuesta del GET /api/chat/thread (retomar): sin hilo, para no interferir
 *  con estos tests (mismo helper que chat-view.test.tsx). */
function emptyThreadResponse() {
  return { ok: true, headers: { get: () => "application/json" }, json: async () => ({ threadId: null, messages: [] }) };
}

/** Respuesta JSON no-stream de /api/credits: saldo fijo. */
function creditsResponse(balance: number) {
  return { ok: true, headers: { get: () => "application/json" }, json: async () => ({ balance, ledger: [] }) };
}

/** Respuesta streaming de /api/chat con headers configurables (x-aluna-premium,
 *  x-aluna-model, x-thread-id) — mismo patrón que timeline-chat.test.tsx. */
function streamResponse(text: string, headers: Record<string, string> = {}) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
  return {
    ok: true,
    status: 200,
    headers: { get: (k: string) => (k === "content-type" ? "text/plain; charset=utf-8" : headers[k] ?? null) },
    body: stream,
  };
}

/** 429 daily_cap: JSON no-stream con status 429. */
function dailyCapResponse(cap: number) {
  return {
    ok: false,
    status: 429,
    headers: { get: () => "application/json" },
    json: async () => ({ error: "daily_cap", cap }),
  };
}

function postCalls() {
  return (global.fetch as ReturnType<typeof vi.fn>).mock.calls.filter(
    ([url, init]) => typeof url === "string" && url.includes("/api/chat") && !url.includes("/thread") && (init as RequestInit | undefined)?.method === "POST",
  );
}

function creditsCalls() {
  return (global.fetch as ReturnType<typeof vi.fn>).mock.calls.filter(([url]) => typeof url === "string" && url.includes("/api/credits"));
}

function renderView() {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <ChatView />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  mockActive.current = { id: "profile-1" };
  window.localStorage.clear();
});

describe("ChatView — toggle premium ✨", () => {
  it("arranca apagado; click lo enciende (aria-pressed=true) y lo persiste en localStorage", async () => {
    global.fetch = vi.fn(async (url: unknown) =>
      typeof url === "string" && url.includes("/api/chat/thread") ? emptyThreadResponse() : dailyCapResponse(5),
    ) as unknown as typeof fetch;

    renderView();
    const toggle = screen.getByRole("button", { name: es.chat.premiumToggle });
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(window.localStorage.getItem("aluna:premium")).toBe("1");
  });

  it("con el toggle encendido, sendText manda premium:true en el body del POST", async () => {
    global.fetch = vi.fn(async (url: unknown) =>
      typeof url === "string" && url.includes("/api/chat/thread") ? emptyThreadResponse() : streamResponse("hola", { "x-aluna-premium": "off" }),
    ) as unknown as typeof fetch;

    renderView();
    fireEvent.click(screen.getByRole("button", { name: es.chat.premiumToggle }));

    fireEvent.change(screen.getByPlaceholderText(es.chat.placeholder), { target: { value: "hola" } });
    fireEvent.click(screen.getByRole("button", { name: es.chat.send }));

    await waitFor(() => expect(postCalls()).toHaveLength(1));
    const body = JSON.parse(postCalls()[0]![1]!.body as string);
    expect(body.premium).toBe(true);
  });

  it("con el toggle apagado, sendText manda premium:false", async () => {
    global.fetch = vi.fn(async (url: unknown) =>
      typeof url === "string" && url.includes("/api/chat/thread") ? emptyThreadResponse() : streamResponse("hola", { "x-aluna-premium": "off" }),
    ) as unknown as typeof fetch;

    renderView();
    fireEvent.change(screen.getByPlaceholderText(es.chat.placeholder), { target: { value: "hola" } });
    fireEvent.click(screen.getByRole("button", { name: es.chat.send }));

    await waitFor(() => expect(postCalls()).toHaveLength(1));
    const body = JSON.parse(postCalls()[0]![1]!.body as string);
    expect(body.premium).toBe(false);
  });
});

describe("ChatView — aviso de fallback (sin créditos)", () => {
  it("respuesta con header x-aluna-premium:fallback muestra el aviso premiumOut con link a /ajustes", async () => {
    global.fetch = vi.fn(async (url: unknown) =>
      typeof url === "string" && url.includes("/api/chat/thread") ? emptyThreadResponse() : streamResponse("hola", { "x-aluna-premium": "fallback" }),
    ) as unknown as typeof fetch;

    renderView();
    fireEvent.click(screen.getByRole("button", { name: es.chat.premiumToggle }));
    fireEvent.change(screen.getByPlaceholderText(es.chat.placeholder), { target: { value: "una pregunta" } });
    fireEvent.click(screen.getByRole("button", { name: es.chat.send }));

    const link = await screen.findByRole("link", { name: /ajustes/i });
    expect(link).toHaveAttribute("href", "/ajustes");
  });

  it("una respuesta posterior SIN fallback hace desaparecer el aviso (no persistente)", async () => {
    // OJO: el montaje también dispara fetches propios de QuickQuestions
    // (/api/quick-questions) y DevModelPicker (/api/dev-models) — el contador
    // de turnos de chat solo debe avanzar con la llamada EXACTA a "/api/chat"
    // (POST), no con cualquier URL no reconocida (mismo criterio que el
    // catch-all `dormantResponse()` de chat-view.test.tsx, pero acá con
    // contador propio hay que ser explícitos para no descontarlo).
    let chatCall = 0;
    global.fetch = vi.fn(async (url: unknown) => {
      if (typeof url === "string" && url.includes("/api/chat/thread")) return emptyThreadResponse();
      if (typeof url === "string" && url.includes("/api/credits")) return creditsResponse(10);
      if (url === "/api/chat") {
        chatCall += 1;
        return chatCall === 1 ? streamResponse("uno", { "x-aluna-premium": "fallback" }) : streamResponse("dos", { "x-aluna-premium": "off" });
      }
      return { ok: true, headers: { get: () => "application/json" }, json: async () => ({}) };
    }) as unknown as typeof fetch;

    renderView();
    fireEvent.click(screen.getByRole("button", { name: es.chat.premiumToggle }));
    fireEvent.change(screen.getByPlaceholderText(es.chat.placeholder), { target: { value: "uno" } });
    fireEvent.click(screen.getByRole("button", { name: es.chat.send }));
    await screen.findByRole("link", { name: /ajustes/i });

    fireEvent.change(screen.getByPlaceholderText(es.chat.placeholder), { target: { value: "otra" } });
    fireEvent.click(screen.getByRole("button", { name: es.chat.send }));

    await waitFor(() => expect(screen.getByText("dos")).toBeInTheDocument());
    expect(screen.queryByRole("link", { name: /ajustes/i })).not.toBeInTheDocument();
  });
});

describe("ChatView — 429 daily_cap", () => {
  it("responde con el aviso dailyCap({cap}) y vuelve a idle (no error)", async () => {
    global.fetch = vi.fn(async (url: unknown) =>
      typeof url === "string" && url.includes("/api/chat/thread") ? emptyThreadResponse() : dailyCapResponse(5),
    ) as unknown as typeof fetch;

    renderView();
    fireEvent.change(screen.getByPlaceholderText(es.chat.placeholder), { target: { value: "hola" } });
    fireEvent.click(screen.getByRole("button", { name: es.chat.send }));

    await waitFor(() => expect(screen.getByText(es.chat.dailyCap.replace("{cap}", "5"))).toBeInTheDocument());
    expect(screen.queryByText(es.chat.error)).not.toBeInTheDocument();
  });
});

describe("ChatView — chip de saldo (✨ N)", () => {
  it("con el toggle encendido, pide /api/credits y muestra el saldo", async () => {
    global.fetch = vi.fn(async (url: unknown) => {
      if (typeof url === "string" && url.includes("/api/chat/thread")) return emptyThreadResponse();
      if (typeof url === "string" && url.includes("/api/credits")) return creditsResponse(42);
      return dailyCapResponse(5);
    }) as unknown as typeof fetch;

    renderView();
    expect(creditsCalls()).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: es.chat.premiumToggle }));

    await waitFor(() => expect(screen.getByText("✨ 42")).toBeInTheDocument());
  });

  it("con el toggle apagado, nunca pide /api/credits ni muestra el chip", () => {
    global.fetch = vi.fn(async (url: unknown) =>
      typeof url === "string" && url.includes("/api/chat/thread") ? emptyThreadResponse() : dailyCapResponse(5),
    ) as unknown as typeof fetch;

    renderView();
    expect(creditsCalls()).toHaveLength(0);
    expect(screen.queryByText(/^✨ \d/)).not.toBeInTheDocument();
  });

  it("si /api/credits responde 401 (sin sesión), oculta el chip sin romper", async () => {
    global.fetch = vi.fn(async (url: unknown) => {
      if (typeof url === "string" && url.includes("/api/chat/thread")) return emptyThreadResponse();
      if (typeof url === "string" && url.includes("/api/credits")) {
        return { ok: false, status: 401, headers: { get: () => "application/json" }, json: async () => ({ error: "unauthorized" }) };
      }
      return dailyCapResponse(5);
    }) as unknown as typeof fetch;

    renderView();
    fireEvent.click(screen.getByRole("button", { name: es.chat.premiumToggle }));

    await waitFor(() => expect(creditsCalls().length).toBeGreaterThan(0));
    expect(screen.queryByText(/^✨ \d/)).not.toBeInTheDocument();
  });

  it("tras una respuesta con header x-aluna-premium:used, refresca el saldo", async () => {
    let creditsCallCount = 0;
    global.fetch = vi.fn(async (url: unknown) => {
      if (typeof url === "string" && url.includes("/api/chat/thread")) return emptyThreadResponse();
      if (typeof url === "string" && url.includes("/api/credits")) {
        creditsCallCount += 1;
        return creditsResponse(creditsCallCount === 1 ? 10 : 9);
      }
      return streamResponse("hola", { "x-aluna-premium": "used" });
    }) as unknown as typeof fetch;

    renderView();
    fireEvent.click(screen.getByRole("button", { name: es.chat.premiumToggle }));
    await waitFor(() => expect(screen.getByText("✨ 10")).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText(es.chat.placeholder), { target: { value: "hola" } });
    fireEvent.click(screen.getByRole("button", { name: es.chat.send }));

    await waitFor(() => expect(screen.getByText("✨ 9")).toBeInTheDocument());
  });
});

describe("ChatView — modo embebido: toggle sigue disponible, compacto (solo ícono)", () => {
  it("el botón premium se renderiza también embebido, sin texto visible (solo el glifo ✨)", () => {
    global.fetch = vi.fn(async (url: unknown) =>
      typeof url === "string" && url.includes("/api/chat/thread") ? emptyThreadResponse() : dailyCapResponse(5),
    ) as unknown as typeof fetch;

    render(
      <NextIntlClientProvider locale="es" messages={es}>
        <ChatView embedded />
      </NextIntlClientProvider>,
    );
    const toggle = screen.getByRole("button", { name: es.chat.premiumToggle });
    expect(toggle.textContent?.trim()).toBe("✨");
  });
});
