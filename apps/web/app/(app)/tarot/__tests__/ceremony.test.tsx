import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { ThemeProvider } from "@/lib/theme/theme-provider";
import es from "@/messages/es.json";
import { cardById } from "@aluna/core";
import { TAROT_CARDS_ES } from "@/lib/content/tarot-es";
import { Ceremony, type CeremonyReadingBridge } from "../ceremony";

// La ceremonia es efímera (useReducer local, sin URL): cada test la recorre
// entera. Por defecto stubeamos prefers-reduced-motion=REDUCE para que cada
// paso ofrezca su resultado inmediato (sin timeouts de coreografía) — el
// camino con gesto sostenido se prueba aparte con reduce=false.
function stubReducedMotion(reduce: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduce && query.includes("prefers-reduced-motion"),
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

interface FetchCall {
  url: string;
  init: RequestInit | undefined;
}

function mockFetch(postStatus = 201): { calls: FetchCall[] } {
  const calls: FetchCall[] = [];
  global.fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    const u = String(url);
    calls.push({ url: u, init });
    if (postStatus === 201) {
      const body = JSON.parse(String(init?.body));
      return {
        ok: true,
        status: 201,
        headers: { get: () => "application/json" },
        json: async () => ({ reading: { id: "r-new", ...body } }),
      } as unknown as Response;
    }
    return {
      ok: false,
      status: postStatus,
      headers: { get: () => "application/json" },
      json: async () => ({ error: postStatus === 403 ? "free_limit" : "db" }),
    } as unknown as Response;
  }) as unknown as typeof fetch;
  return { calls };
}

// Segunda pasada (Gio, 2026-07-24: "la lectura sigue saliendo en el lado
// izquierdo mas no en interpretacion en el lado derecho... me gusta que diga
// conversa esta tirada"): la ceremonia ya NO renderiza prosa/ReadingChat/
// guardar/compartir — se los pasa al padre (tarot-view.tsx) vía `onReading`,
// que los muestra en el carril derecho real. Estos tests pasan su propio mock
// de `onReading` y operan el guardado a través del bridge (`bridge.onSave()`),
// tal como lo haría tarot-view.tsx al hacer click en su propio botón.
function renderCeremony(
  opts: { onClose?: () => void; onReading?: (data: CeremonyReadingBridge | null) => void } = {},
) {
  const onClose = opts.onClose ?? vi.fn();
  render(
    <NextIntlClientProvider locale="es" messages={es}>
      <ThemeProvider initialTheme="observatory" initialMode="dark" persist={vi.fn()}>
        <Ceremony spreadId="three" onClose={onClose} {...(opts.onReading ? { onReading: opts.onReading } : {})} />
      </ThemeProvider>
    </NextIntlClientProvider>,
  );
  return onClose;
}

/** Último dato no-null que recibió el mock de `onReading` (el bridge vivo). */
function lastBridge(onReading: ReturnType<typeof vi.fn>): CeremonyReadingBridge {
  const nonNull = onReading.mock.calls.filter(([data]) => data !== null);
  const last = nonNull.at(-1);
  if (!last) throw new Error("onReading nunca se llamó con datos: ¿la ceremonia llegó a 'reading'?");
  return last[0] as CeremonyReadingBridge;
}

/** Recorre question→shuffle→cut→fan→reveal y deja la ceremonia en reading. */
async function advanceToReading(opts: { question?: string } = {}) {
  // question
  expect(screen.getByText(es.tarot.questionTitle)).toBeInTheDocument();
  if (opts.question !== undefined) {
    fireEvent.change(screen.getByPlaceholderText(es.tarot.questionPlaceholder), {
      target: { value: opts.question },
    });
    fireEvent.click(screen.getByRole("button", { name: es.tarot.questionContinue }));
  } else {
    fireEvent.click(screen.getByRole("button", { name: es.tarot.questionSilent }));
  }

  // shuffle (reduced-motion: solo el botón accesible)
  fireEvent.click(await screen.findByRole("button", { name: es.tarot.shuffleForMe }));

  // cut: 3 montones, tocar uno reunifica (ritual, no re-aleatoriza)
  const piles = await screen.findAllByTestId("cut-pile");
  expect(piles.length).toBe(3);
  fireEvent.click(piles[1]!);

  // fan: las 78 boca abajo; elegir 3
  const fanCards = await screen.findAllByTestId("fan-card");
  expect(fanCards.length).toBe(78);
  fireEvent.click(fanCards[3]!);
  fireEvent.click(fanCards[20]!);
  fireEvent.click(fanCards[55]!);

  // reveal: voltear las 3
  const slots = await screen.findAllByTestId("reveal-card");
  expect(slots.length).toBe(3);
  // "Leer" no aparece hasta voltear TODAS
  expect(screen.queryByRole("button", { name: es.tarot.revealRead })).not.toBeInTheDocument();
  for (const slot of slots) fireEvent.click(slot);
  fireEvent.click(await screen.findByRole("button", { name: es.tarot.revealRead }));

  expect(await screen.findByText(es.tarot.readingTitle)).toBeInTheDocument();
}

describe("Ceremony (tirada de tres)", () => {
  beforeEach(() => {
    stubReducedMotion(true);
  });

  it("onReading: null en todos los pasos previos, y se puebla justo al llegar a 'reading'", async () => {
    mockFetch();
    const onReading = vi.fn();
    renderCeremony({ onReading });
    expect(onReading).toHaveBeenLastCalledWith(null);

    fireEvent.click(screen.getByRole("button", { name: es.tarot.questionSilent }));
    fireEvent.click(await screen.findByRole("button", { name: es.tarot.shuffleForMe }));
    fireEvent.click((await screen.findAllByTestId("cut-pile"))[0]!);
    const fanCards = await screen.findAllByTestId("fan-card");
    fireEvent.click(fanCards[0]!);
    fireEvent.click(fanCards[1]!);
    fireEvent.click(fanCards[2]!);
    const slots = await screen.findAllByTestId("reveal-card");
    for (const slot of slots) fireEvent.click(slot);
    // Justo antes de "Leer": todavía en reveal, sigue null.
    expect(onReading).toHaveBeenLastCalledWith(null);

    fireEvent.click(await screen.findByRole("button", { name: es.tarot.revealRead }));
    await waitFor(() => expect(lastBridge(onReading).reading.id).toBe("ceremony-live"));
    expect(lastBridge(onReading).save).toBe("idle");
  });

  it("flujo completo con pregunta: onReading expone 3 cartas + pregunta, y bridge.onSave hace el POST correcto", async () => {
    const { calls } = mockFetch();
    const onReading = vi.fn();
    renderCeremony({ onReading });
    await advanceToReading({ question: "¿Cómo sigo con esto?" });

    const bridge = lastBridge(onReading);
    expect(bridge.reading.id).toBe("ceremony-live");
    expect(bridge.reading.spread).toBe("three");
    expect(bridge.reading.question).toBe("¿Cómo sigo con esto?");
    expect(bridge.reading.cards).toHaveLength(3);
    expect(bridge.reading.cards.map((c) => c.position)).toEqual(["past", "present", "future"]);
    expect(bridge.save).toBe("idle");

    // Los nombres de las cartas guardadas están en la grilla visible.
    const ids = bridge.reading.cards.map((c) => c.cardId);
    expect(new Set(ids).size).toBe(3);
    for (const id of ids) {
      const card = cardById(id);
      expect(card, id).toBeDefined();
      expect(screen.getAllByText(TAROT_CARDS_ES[card!.id]!.name).length).toBeGreaterThan(0);
    }

    act(() => bridge.onSave());
    await waitFor(() => {
      expect(calls.some((c) => c.url === "/api/tarot/readings" && c.init?.method === "POST")).toBe(true);
    });
    const post = calls.find((c) => c.url === "/api/tarot/readings" && c.init?.method === "POST")!;
    const body = JSON.parse(String(post.init?.body));
    expect(body.spread).toBe("three");
    expect(body.deck).toBe("rws");
    expect(body.question).toBe("¿Cómo sigo con esto?");
    expect(body.cards).toEqual(bridge.reading.cards);

    // El bridge se re-reporta con save:"saved" tras el POST 201 (el padre es
    // quien muestra "savedOk" con este dato — ver tarot-view.test.tsx).
    await waitFor(() => {
      expect(lastBridge(onReading).save).toBe("saved");
    });
  });

  it("'En silencio' avanza sin pregunta: onReading trae question:null y el POST no lleva question", async () => {
    const { calls } = mockFetch();
    const onReading = vi.fn();
    renderCeremony({ onReading });
    await advanceToReading();

    const bridge = lastBridge(onReading);
    expect(bridge.reading.question).toBeNull();

    act(() => bridge.onSave());
    await waitFor(() => {
      expect(calls.some((c) => c.url === "/api/tarot/readings" && c.init?.method === "POST")).toBe(true);
    });
    const body = JSON.parse(
      String(calls.find((c) => c.url === "/api/tarot/readings" && c.init?.method === "POST")!.init?.body),
    );
    expect(body.question).toBeUndefined();
  });

  // El chat de la tirada ("Conversa esta tirada") ya no lo monta Ceremony —
  // vive en tarot-view.tsx vía <ReadingChat> (bridge.reading), y su propio
  // comportamiento dormido/con-proveedor ya está cubierto en
  // reading-chat.test.tsx. No hay equivalente que rehacer acá.

  it("el contador del fan avanza (1 de 3) y las elegidas dejan de ser elegibles", async () => {
    mockFetch();
    renderCeremony();
    fireEvent.click(screen.getByRole("button", { name: es.tarot.questionSilent }));
    fireEvent.click(await screen.findByRole("button", { name: es.tarot.shuffleForMe }));
    fireEvent.click((await screen.findAllByTestId("cut-pile"))[0]!);

    const count = (n: number) =>
      es.tarot.fanCount.replace("{n}", String(n)).replace("{total}", "3");
    expect(await screen.findByText(count(0))).toBeInTheDocument();
    const fanCards = await screen.findAllByTestId("fan-card");
    fireEvent.click(fanCards[10]!);
    expect(await screen.findByText(count(1))).toBeInTheDocument();
    // re-tocar la misma no suma
    fireEvent.click(fanCards[10]!);
    expect(screen.getByText(count(1))).toBeInTheDocument();
  });

  // T4: las etiquetas de posición ya no vienen de un mapa local (POSITION_KEY)
  // sino de positionLabelKey + SpreadLayout — este test cubre que ese camino
  // nuevo sigue rindiendo los mismos textos en fan y reveal.
  it("los labels de posición (Pasado/Presente/Futuro) se renderizan vía SpreadLayout en fan y reveal", async () => {
    mockFetch();
    renderCeremony();
    fireEvent.click(screen.getByRole("button", { name: es.tarot.questionSilent }));
    fireEvent.click(await screen.findByRole("button", { name: es.tarot.shuffleForMe }));
    fireEvent.click((await screen.findAllByTestId("cut-pile"))[0]!);

    await screen.findAllByTestId("fan-card");
    expect(screen.getByText(es.tarot.positionPast)).toBeInTheDocument();
    expect(screen.getByText(es.tarot.positionPresent)).toBeInTheDocument();
    expect(screen.getByText(es.tarot.positionFuture)).toBeInTheDocument();

    const fanCards = await screen.findAllByTestId("fan-card");
    fireEvent.click(fanCards[0]!);
    fireEvent.click(fanCards[1]!);
    fireEvent.click(fanCards[2]!);

    await screen.findAllByTestId("reveal-card");
    expect(screen.getByText(es.tarot.positionPast)).toBeInTheDocument();
    expect(screen.getByText(es.tarot.positionPresent)).toBeInTheDocument();
    expect(screen.getByText(es.tarot.positionFuture)).toBeInTheDocument();
  });

  it("403 free_limit al guardar: bridge.save llega a 'free_limit' y Ceremony muestra la nota con CTA a /perfil", async () => {
    mockFetch(403);
    const onReading = vi.fn();
    renderCeremony({ onReading });
    await advanceToReading();

    act(() => lastBridge(onReading).onSave());
    expect(await screen.findByText(es.tarot.ceremonyFreeLimit)).toBeInTheDocument();
    const cta = screen.getByRole("link", { name: es.tarot.ceremonyFreeLimitCta });
    expect(cta.getAttribute("href")).toBe("/perfil");
    await waitFor(() => {
      expect(lastBridge(onReading).save).toBe("free_limit");
    });
  });

  it("'volver al umbral' llama onClose", async () => {
    mockFetch();
    const onClose = renderCeremony();
    await advanceToReading();
    fireEvent.click(screen.getByRole("button", { name: es.tarot.readingBack }));
    expect(onClose).toHaveBeenCalled();
  });

  it("sin reduced-motion: sostener el mazo (pointerdown→pointerup) sella el orden y pasa al corte", async () => {
    stubReducedMotion(false);
    mockFetch();
    renderCeremony();
    fireEvent.click(screen.getByRole("button", { name: es.tarot.questionSilent }));

    const deck = await screen.findByTestId("shuffle-deck");
    fireEvent.pointerDown(deck);
    fireEvent.pointerUp(deck);
    expect((await screen.findAllByTestId("cut-pile")).length).toBe(3);
  });

  // Segunda pasada (Gio, 2026-07-24): prosa + ReadingChat + guardar/compartir
  // ya NO viven en .readingPane — se reportan vía onReading y tarot-view.tsx
  // los muestra en el carril derecho real (ver arriba). Acá solo debe quedar
  // la grilla de cartas + "volver al umbral"; nada de lo que se movió al
  // padre debe filtrarse dentro de este panel.
  it("el paso reading tiene .readingPane con SOLO la grilla de cartas + volver (sin prosa/chat/guardar)", async () => {
    mockFetch();
    renderCeremony();
    await advanceToReading();

    const root = screen.getByTestId("ceremony");
    const pane = root.querySelector('[class*="readingPane"]') as HTMLElement | null;
    expect(pane).toBeInTheDocument();

    const cards = pane!.querySelector('[class*="readingCards"]');
    expect(cards).toBeInTheDocument();
    expect(within(pane!).getByRole("button", { name: es.tarot.readingBack })).toBeInTheDocument();

    // Nada de lo que ahora vive en tarot-view.tsx se filtra acá.
    expect(within(pane!).queryByTestId("reading-chat")).not.toBeInTheDocument();
    expect(within(pane!).queryByRole("button", { name: es.tarot.saveReading })).not.toBeInTheDocument();
    expect(within(pane!).queryByText(es.tarot.savedOk)).not.toBeInTheDocument();
  });

  it("los pasos previos a reading NO llevan .readingPane", async () => {
    mockFetch();
    renderCeremony();
    const root = screen.getByTestId("ceremony");

    // question
    expect(root.querySelector('[class*="readingPane"]')).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: es.tarot.questionSilent }));

    // shuffle
    await screen.findByRole("button", { name: es.tarot.shuffleForMe });
    expect(root.querySelector('[class*="readingPane"]')).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: es.tarot.shuffleForMe }));

    // cut
    const piles = await screen.findAllByTestId("cut-pile");
    expect(root.querySelector('[class*="readingPane"]')).toBeNull();
    fireEvent.click(piles[0]!);

    // fan
    const fanCards = await screen.findAllByTestId("fan-card");
    expect(root.querySelector('[class*="readingPane"]')).toBeNull();
    fireEvent.click(fanCards[0]!);
    fireEvent.click(fanCards[1]!);
    fireEvent.click(fanCards[2]!);

    // reveal
    const slots = await screen.findAllByTestId("reveal-card");
    expect(root.querySelector('[class*="readingPane"]')).toBeNull();
    for (const slot of slots) fireEvent.click(slot);

    // reading (recién acá aparece)
    fireEvent.click(await screen.findByRole("button", { name: es.tarot.revealRead }));
    expect(await screen.findByText(es.tarot.readingTitle)).toBeInTheDocument();
    expect(root.querySelector('[class*="readingPane"]')).toBeInTheDocument();
  });
});
