import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";
import { ChatLibraryView } from "../chat-library-view";

// El panel derecho ahora SIEMPRE incluye <LensChatPanel/> (ChatView
// embebido) — mismo baseline "sin sesión de router / sin perfil" que
// tarot-view.test.tsx: estos tests no ejercitan ese chat en sí, solo
// necesitan que no truene por falta de <ProfilesProvider>/router.
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(""),
}));
vi.mock("@/lib/profiles/profiles-provider", () => ({ useProfiles: () => ({ active: null }) }));

interface FetchCall {
  url: string;
  init: RequestInit | undefined;
}

const THREADS = [
  {
    id: "t-tarot", surface: "tarot" as const, lens: "tarot" as const, profileId: "p1", pinned: true,
    createdAt: "2026-07-01T00:00:00.000Z", lastMessageAt: "2026-07-02T00:00:00.000Z",
    preview: "¿Qué significa El Mago invertido?",
  },
  {
    id: "t-chat", surface: "chat" as const, lens: "astros" as const, profileId: null, pinned: false,
    createdAt: "2026-07-03T00:00:00.000Z", lastMessageAt: "2026-07-04T00:00:00.000Z",
    preview: "¿Cómo está mi energía hoy?",
  },
  {
    id: "t-general", surface: "chat" as const, lens: null, profileId: null, pinned: false,
    createdAt: "2026-07-05T00:00:00.000Z", lastMessageAt: "2026-07-05T00:00:00.000Z",
    preview: "¿Qué me recomiendas?",
  },
];

function mockFetch(threads: unknown[] = THREADS): { calls: FetchCall[] } {
  const calls: FetchCall[] = [];
  global.fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    const u = String(url);
    calls.push({ url: u, init });
    const method = init?.method ?? "GET";
    if (u === "/api/chat/threads" && method === "GET") {
      return { ok: true, json: async () => ({ threads }) } as unknown as Response;
    }
    if (u.startsWith("/api/chat/threads/") && method === "GET") {
      const id = u.split("/").pop();
      const found = (threads as Array<{ id: string; surface: string; lens: string | null }>).find((x) => x.id === id);
      return {
        ok: true,
        json: async () => ({
          id, surface: found?.surface ?? "chat", lens: found?.lens ?? null, pinned: id === "t-tarot",
          messages: [
            { id: "m1", role: "user", content: "hola", created_at: "2026-07-01T00:00:00.000Z" },
            { id: "m2", role: "assistant", content: "hola, ¿cómo estás?", created_at: "2026-07-01T00:01:00.000Z" },
          ],
        }),
      } as unknown as Response;
    }
    if (u.startsWith("/api/chat/threads/") && method === "PATCH") {
      return { ok: true, json: async () => ({ ok: true }) } as unknown as Response;
    }
    if (u.startsWith("/api/chat/threads/") && method === "DELETE") {
      return { ok: true, json: async () => ({ ok: true }) } as unknown as Response;
    }
    // Cualquier otro fetch (LensChatPanel/ChatView: /api/chat/thread,
    // /api/quick-questions, /api/credits, /api/dev-models...): 404
    // best-effort, ese chat no es lo que estos tests ejercitan.
    return { ok: false, status: 404, json: async () => ({}) } as unknown as Response;
  }) as unknown as typeof fetch;
  return { calls };
}

function renderView() {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <ChatLibraryView />
    </NextIntlClientProvider>,
  );
}

describe("ChatLibraryView", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("carga y lista los hilos: fijado primero, con tag/vista previa/fecha", async () => {
    mockFetch();
    renderView();

    const rows = await screen.findAllByText(/¿Qué significa El Mago invertido\?|¿Cómo está mi energía hoy\?/);
    expect(rows).toHaveLength(2);
    // Fijado (t-tarot) va primero en el DOM.
    expect(rows[0]!.textContent).toContain("El Mago");
    // Tag: "tarot" reusa nav.tarot, "astros" reusa nav.astros — mismo texto
    // que ya usan en el menú, no una etiqueta nueva.
    expect(screen.getByText(es.nav.tarot)).toBeInTheDocument();
    expect(screen.getByText(es.nav.astros)).toBeInTheDocument();
  });

  it("hilo sin lens (general, o creado antes de la etiqueta): tag cae a 'General'", async () => {
    mockFetch();
    renderView();

    expect(await screen.findByText(es.chatLibrary.tagGeneral)).toBeInTheDocument();
  });

  it("estado vacío: sin hilos, muestra el mensaje de biblioteca vacía", async () => {
    mockFetch([]);
    renderView();

    expect(await screen.findByText(es.chatLibrary.empty)).toBeInTheDocument();
  });

  it("error de carga: muestra el mensaje + botón reintentar, que vuelve a pedir la lista", async () => {
    global.fetch = vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })) as unknown as typeof fetch;
    renderView();

    expect(await screen.findByText(es.chatLibrary.loadError)).toBeInTheDocument();

    const { calls } = mockFetch();
    fireEvent.click(screen.getByRole("button", { name: es.chatLibrary.retry }));
    await waitFor(() => expect(calls.some((c) => c.url === "/api/chat/threads")).toBe(true));
    expect(await screen.findByText(/¿Qué significa El Mago invertido\?/)).toBeInTheDocument();
  });

  it("antes de elegir nada, el panel derecho muestra la pista de selección — y el chat de siempre debajo", async () => {
    mockFetch();
    renderView();
    await screen.findByText(/¿Qué significa El Mago invertido\?/);

    expect(screen.getByText(es.chatLibrary.selectHint)).toBeInTheDocument();
    // <LensChatPanel/> SIEMPRE montado (Gio: "la ventana del chat no es la
    // que nosotro ya disenamos" — ahora es literalmente el mismo componente).
    expect(screen.getByText(es.chat.lensChatTitle)).toBeInTheDocument();
  });

  it("elegir un hilo carga su detalle (mensajes) en el panel derecho, con el tag correcto", async () => {
    const { calls } = mockFetch();
    renderView();
    const preview = await screen.findByText(/¿Cómo está mi energía hoy\?/);
    fireEvent.click(preview.closest("button")!);

    await waitFor(() => expect(calls.some((c) => c.url === "/api/chat/threads/t-chat")).toBe(true));
    expect(await screen.findByText("hola, ¿cómo estás?")).toBeInTheDocument();
    expect(screen.getByText("hola")).toBeInTheDocument();
  });

  it("fijar/desfijar: hace PATCH {pinned} y reordena la lista de inmediato (optimista)", async () => {
    const { calls } = mockFetch();
    renderView();
    await screen.findByText(/¿Cómo está mi energía hoy\?/);

    const unpinnedRow = screen.getByText(/¿Cómo está mi energía hoy\?/).closest("li")!;
    fireEvent.click(within(unpinnedRow).getByRole("button", { name: es.chatLibrary.pin }));

    await waitFor(() => {
      const patch = calls.find((c) => c.url === "/api/chat/threads/t-chat" && c.init?.method === "PATCH");
      expect(patch).toBeDefined();
      expect(JSON.parse(String(patch!.init?.body))).toEqual({ pinned: true });
    });
    // Ahora ambas fijadas: t-chat pasa a estar primero en el orden (más
    // reciente entre las fijadas) — verificamos que su botón ya diga "unpin".
    const row = screen.getByText(/¿Cómo está mi energía hoy\?/).closest("li")!;
    expect(within(row).getByRole("button", { name: es.chatLibrary.unpin })).toBeInTheDocument();
  });

  it("eliminar: pide confirmación antes de borrar; cancelar no borra nada", async () => {
    const { calls } = mockFetch();
    renderView();
    await screen.findByText(/¿Cómo está mi energía hoy\?/);

    const row = screen.getByText(/¿Cómo está mi energía hoy\?/).closest("li")!;
    fireEvent.click(within(row).getByRole("button", { name: es.chatLibrary.delete }));

    expect(await screen.findByText(es.chatLibrary.deleteConfirmTitle)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: es.chatLibrary.deleteCancel }));

    expect(screen.queryByText(es.chatLibrary.deleteConfirmTitle)).not.toBeInTheDocument();
    expect(calls.some((c) => c.init?.method === "DELETE")).toBe(false);
    // La conversación sigue en la lista.
    expect(screen.getByText(/¿Cómo está mi energía hoy\?/)).toBeInTheDocument();
  });

  it("eliminar: confirmar hace DELETE y la quita de la lista (y del panel si estaba abierta)", async () => {
    const { calls } = mockFetch();
    renderView();
    const preview = await screen.findByText(/¿Cómo está mi energía hoy\?/);
    fireEvent.click(preview.closest("button")!); // la selecciona primero
    await screen.findByText("hola, ¿cómo estás?");

    const row = screen.getByText(/¿Cómo está mi energía hoy\?/).closest("li")!;
    fireEvent.click(within(row).getByRole("button", { name: es.chatLibrary.delete }));
    fireEvent.click(await screen.findByRole("button", { name: es.chatLibrary.deleteConfirmCta }));

    await waitFor(() => {
      expect(calls.some((c) => c.url === "/api/chat/threads/t-chat" && c.init?.method === "DELETE")).toBe(true);
    });
    await waitFor(() => expect(screen.queryByText(/¿Cómo está mi energía hoy\?/)).not.toBeInTheDocument());
    // El panel derecho vuelve a la pista de selección (la lectura abierta se borró).
    expect(screen.getByText(es.chatLibrary.selectHint)).toBeInTheDocument();
  });
});
