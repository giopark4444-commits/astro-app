import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { ThemeProvider } from "@/lib/theme/theme-provider";
import es from "@/messages/es.json";
import { cardById } from "@aluna/core";
import { TAROT_CARDS_ES } from "@/lib/content/tarot-es";
import { Ceremony } from "../ceremony";

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
    // La ceremonia (T3) monta ReadingChat al llegar a "reading", que dispara
    // su propio POST a /api/tarot/reading-chat (turno-0) — se responde
    // dormido (sin llaves en el test), como el latente real. Se distingue
    // por URL para no confundirse con el POST de guardado (mismo método).
    if (u === "/api/tarot/reading-chat") {
      return {
        ok: true,
        status: 200,
        headers: { get: () => "application/json" },
        json: async () => ({ available: false }),
      } as unknown as Response;
    }
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

function renderCeremony(onClose = vi.fn()) {
  render(
    <NextIntlClientProvider locale="es" messages={es}>
      <ThemeProvider initialTheme="observatory" initialMode="dark" persist={vi.fn()}>
        <Ceremony spreadId="three" onClose={onClose} />
      </ThemeProvider>
    </NextIntlClientProvider>,
  );
  return onClose;
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

  it("flujo completo con pregunta: lectura con 3 cartas y guardado POST correcto", async () => {
    const { calls } = mockFetch();
    renderCeremony();
    await advanceToReading({ question: "¿Cómo sigo con esto?" });

    fireEvent.click(screen.getByRole("button", { name: es.tarot.saveReading }));
    await waitFor(() => {
      expect(calls.some((c) => c.url === "/api/tarot/readings" && c.init?.method === "POST")).toBe(true);
    });
    const post = calls.find((c) => c.url === "/api/tarot/readings" && c.init?.method === "POST")!;
    expect(post.url).toBe("/api/tarot/readings");
    const body = JSON.parse(String(post.init?.body));
    expect(body.spread).toBe("three");
    expect(body.deck).toBe("rws");
    expect(body.question).toBe("¿Cómo sigo con esto?");
    expect(body.cards).toHaveLength(3);
    expect(body.cards.map((c: { position: string }) => c.position)).toEqual(["past", "present", "future"]);
    const ids = body.cards.map((c: { cardId: string }) => c.cardId);
    expect(new Set(ids).size).toBe(3);
    // Los nombres de las cartas guardadas están en la lectura visible.
    for (const id of ids) {
      const card = cardById(id);
      expect(card, id).toBeDefined();
      expect(screen.getAllByText(TAROT_CARDS_ES[card!.id]!.name).length).toBeGreaterThan(0);
    }
    expect(await screen.findByText(es.tarot.savedOk)).toBeInTheDocument();
  });

  it("'En silencio' avanza sin pregunta y el POST no lleva question", async () => {
    const { calls } = mockFetch();
    renderCeremony();
    await advanceToReading();

    fireEvent.click(screen.getByRole("button", { name: es.tarot.saveReading }));
    await waitFor(() => {
      expect(calls.some((c) => c.url === "/api/tarot/readings" && c.init?.method === "POST")).toBe(true);
    });
    const body = JSON.parse(
      String(calls.find((c) => c.url === "/api/tarot/readings" && c.init?.method === "POST")!.init?.body),
    );
    expect(body.question).toBeUndefined();
  });

  it("muestra el chat de la tirada al final de la lectura, dormido sin llaves", async () => {
    mockFetch();
    renderCeremony();
    await advanceToReading();

    expect(await screen.findByText(es.tarot.chatSectionTitle)).toBeInTheDocument();
    expect(await screen.findByText(es.tarot.chatDormantTitle)).toBeInTheDocument();
  });

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

  it("403 free_limit al guardar: nota suave con CTA a /perfil, sin savedOk", async () => {
    mockFetch(403);
    renderCeremony();
    await advanceToReading();

    fireEvent.click(screen.getByRole("button", { name: es.tarot.saveReading }));
    expect(await screen.findByText(es.tarot.ceremonyFreeLimit)).toBeInTheDocument();
    const cta = screen.getByRole("link", { name: es.tarot.ceremonyFreeLimitCta });
    expect(cta.getAttribute("href")).toBe("/perfil");
    expect(screen.queryByText(es.tarot.savedOk)).not.toBeInTheDocument();
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

  // Task 4 (split de layout del paso reading): el contenedor gana la clase
  // .readingPane y las cartas quedan en el carril izquierdo mientras prosa +
  // chat + guardar/volver quedan agrupadas en .readingSide — SOLO en este
  // paso. Estructural (no depende de @media, solo de las clases/DOM).
  it("el paso reading tiene .readingPane con .readingSide conteniendo prosa+chat+guardar", async () => {
    mockFetch();
    renderCeremony();
    await advanceToReading();

    const root = screen.getByTestId("ceremony");
    const pane = root.querySelector('[class*="readingPane"]');
    expect(pane).toBeInTheDocument();

    const side = pane!.querySelector('[class*="readingSide"]') as HTMLElement | null;
    expect(side).toBeInTheDocument();

    // La prosa, el chat y el guardar/volver viven DENTRO de .readingSide.
    expect(within(side!).getByTestId("reading-chat")).toBeInTheDocument();
    expect(within(side!).getByRole("button", { name: es.tarot.saveReading })).toBeInTheDocument();
    expect(within(side!).getByRole("button", { name: es.tarot.readingBack })).toBeInTheDocument();

    // Las cartas quedan en el carril izquierdo, FUERA de .readingSide.
    const cards = pane!.querySelector('[class*="readingCards"]');
    expect(cards).toBeInTheDocument();
    expect(side!.querySelector('[class*="readingCards"]')).toBeNull();
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
