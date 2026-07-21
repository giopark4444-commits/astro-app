// Integración del maestro-detalle de Tarot (Task 3): el umbral recableado al
// patrón panel/sheet de la serie (espejo de numeros/horoscopo-selection). El
// panel derecho (desktop) y el bottom-sheet (móvil) rinden el ÚNICO
// renderizador TarotInterpretation según la TarotSelection viva.
//
// Harness = mockFetch del umbral (GET /api/tarot/readings del diario + GET
// /api/tarot/deck del mazo, ambos devuelven forma inocua → rwsCtx) + stub de
// matchMedia (desktop por defecto: el router escribe el panel; móvil: abre el
// sheet). Verifica los 5 comportamientos del brief:
//   1. aterrizaje: panel con hint (sin revelar) → flip → panel con essence
//   2. clic en el diario → panel con la lectura guardada (pregunta+cartas+prosa)
//   3. clic en una carta de la lectura → panel de la carta suelta → volver
//   4. móvil: clic en el diario → bottom-sheet (mismo contenido)
//   5. la carta suelta muestra su imagen vía cardImageUrl(id, deckCtx)
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { ThemeProvider } from "@/lib/theme/theme-provider";
import { dailyCard } from "@aluna/core";
import { TAROT_CARDS_ES } from "@/lib/content/tarot-es";
import es from "@/messages/es.json";
import { TarotView } from "../tarot-view";

// TarotView lee useSearchParams (deep-link ?mode=manual): mock con params
// vacíos → mode null → el maestro-detalle se comporta igual que antes.
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(""),
}));

const USER_ID = "user-1";

function localDateKey(): string {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "utc";
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

// Lectura "tres cartas" fija para los tests del diario/carta.
const THREE_READING = {
  id: "r1",
  user_id: USER_ID,
  profile_id: null,
  spread: "three",
  question: "¿Cómo sigo adelante?",
  cards: [
    { cardId: "fool", reversed: false, position: "past" },
    { cardId: "magician", reversed: false, position: "present" },
    { cardId: "empress", reversed: true, position: "future" },
  ],
  notes: null,
  deck: "rws",
  created_at: "2026-07-10T12:00:00.000Z",
};

function mockFetch(readings: unknown[] = [], total = readings.length) {
  global.fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    const u = String(url);
    // GET /api/tarot/deck → forma sin manifiesto → deckCtxFromManifest cae a
    // rwsCtx(""); GET /api/tarot/readings → el diario.
    if (u.includes("/api/tarot/deck")) {
      return { ok: true, json: async () => ({ available: false }) } as unknown as Response;
    }
    const method = init?.method ?? "GET";
    if (method === "GET") {
      return { ok: true, json: async () => ({ readings, total }) } as unknown as Response;
    }
    return { ok: true, status: 201, json: async () => ({ reading: {} }) } as unknown as Response;
  }) as unknown as typeof fetch;
}

function renderView() {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <ThemeProvider initialTheme="observatory" initialMode="dark" persist={vi.fn()}>
        <TarotView userId={USER_ID} />
      </ThemeProvider>
    </NextIntlClientProvider>,
  );
}

const getPanel = (c: HTMLElement) => c.querySelector('[class*="interpPanel"]') as HTMLElement | null;

// La fila del diario ("Tres cartas") comparte texto con la tarjeta de tirada
// del mismo nombre — se hace clic acotando a la <section> del diario.
async function clickDiaryThree() {
  const diarySection = (await screen.findByText(es.tarot.diaryTitle)).closest("section")!;
  fireEvent.click(within(diarySection).getByRole("button", { name: new RegExp(es.tarot.diarySpreadThree) }));
}

beforeEach(() => {
  localStorage.clear();
  // Default: desktop → el router escribe el panel derecho (setSelected).
  vi.stubGlobal("matchMedia", (q: string) => ({
    matches: false,
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
});

describe("TarotView — maestro-detalle (panel/sheet)", () => {
  it("aterriza con el hint del panel (carta sin revelar) y tras el flip muestra la essence", async () => {
    mockFetch();
    const { container } = renderView();

    // Panel por defecto = kind daily SIN revelar → solo el hint.
    const panel = getPanel(container)!;
    expect(panel).toBeTruthy();
    await waitFor(() => expect(within(panel).getByText(es.tarot.interpHint)).toBeTruthy());

    const localDate = localDateKey();
    const drawn = dailyCard(USER_ID, localDate, { reversals: true });
    const content = TAROT_CARDS_ES[drawn.card.id]!;
    expect(within(panel).queryByText(content.essence)).toBeNull();

    // Flip: el panel (kind daily) se actualiza por props (revealed) y muestra el
    // nombre + la prosa del día (la essence viaja DENTRO de la prosa — el
    // párrafo suelto se retiró por duplicado, gate visual post-merge).
    fireEvent.click(screen.getByRole("button", { name: es.tarot.dailyFlipCta }));
    await waitFor(() => expect(panel.textContent).toContain(content.essence));
    expect(within(panel).getByText(content.name)).toBeTruthy();
  });

  it("clic en una lectura del diario → el panel muestra la lectura guardada (pregunta + cartas)", async () => {
    mockFetch([THREE_READING], 1);
    const { container } = renderView();
    const panel = getPanel(container)!;

    // El diario lista la lectura; el panel aún muestra el default (no la lectura).
    await screen.findByText(es.tarot.diaryTitle);
    expect(within(panel).queryByText(THREE_READING.question)).toBeNull();

    // Clic en la fila del diario → el panel pasa a la lectura guardada.
    await clickDiaryThree();

    await waitFor(() => expect(within(panel).getByText(THREE_READING.question)).toBeTruthy());
    expect(within(panel).getByText(TAROT_CARDS_ES.fool!.name)).toBeTruthy();
    expect(within(panel).getByText(TAROT_CARDS_ES.magician!.name)).toBeTruthy();
  });

  it("clic en una carta de la lectura → panel de la carta suelta → 'volver' regresa a la lectura", async () => {
    mockFetch([THREE_READING], 1);
    const { container } = renderView();
    const panel = getPanel(container)!;

    await clickDiaryThree();
    await waitFor(() => expect(within(panel).getByText(THREE_READING.question)).toBeTruthy());

    // Clic en la carta "El Loco" (botón dentro del panel de la lectura).
    fireEvent.click(within(panel).getByText(TAROT_CARDS_ES.fool!.name).closest("button")!);

    // Panel de la carta suelta: su camino (upright) + botón volver; ya no la pregunta.
    await waitFor(() => expect(within(panel).getByText(TAROT_CARDS_ES.fool!.upright.path)).toBeTruthy());
    expect(within(panel).queryByText(THREE_READING.question)).toBeNull();
    const back = within(panel).getByRole("button", { name: es.tarot.backToReading });

    // Volver → regresa a la lectura guardada (from).
    fireEvent.click(back);
    await waitFor(() => expect(within(panel).getByText(THREE_READING.question)).toBeTruthy());
  });

  it("la carta suelta muestra su imagen con cardImageUrl(id, deckCtx)", async () => {
    mockFetch([THREE_READING], 1);
    const { container } = renderView();
    const panel = getPanel(container)!;

    await clickDiaryThree();
    await waitFor(() => expect(within(panel).getByText(THREE_READING.question)).toBeTruthy());
    fireEvent.click(within(panel).getByText(TAROT_CARDS_ES.fool!.name).closest("button")!);

    // La imagen de la carta suelta usa el resolver central (rwsCtx por el mock).
    const img = await within(panel).findByAltText(TAROT_CARDS_ES.fool!.name);
    expect((img as HTMLImageElement).src).toContain("/tarot/rws/fool.webp");
  });

  it("móvil: clic en el diario abre el bottom-sheet con el mismo contenido", async () => {
    vi.stubGlobal("matchMedia", (q: string) => ({
      matches: q.includes("max-width: 1079px"),
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    mockFetch([THREE_READING], 1);
    renderView();

    await clickDiaryThree();

    // Móvil → no escribe el panel: abre el sheet (role dialog) con la lectura.
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(THREE_READING.question)).toBeTruthy();
    expect(within(dialog).getByText(TAROT_CARDS_ES.fool!.name)).toBeTruthy();
  });
});
