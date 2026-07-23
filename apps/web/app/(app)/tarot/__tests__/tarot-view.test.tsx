import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { ThemeProvider } from "@/lib/theme/theme-provider";
import es from "@/messages/es.json";
import { dailyCard } from "@aluna/core";
import { TAROT_CARDS_ES } from "@/lib/content/tarot-es";
import { TarotView } from "../tarot-view";

// TarotView lee useSearchParams (deep-link ?mode=manual). Sin sesión de router
// en el test, se mockea con params vacíos → mode null → nada auto-abre.
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(""),
}));

// userId fijo por test; localDate se calcula con el reloj REAL (nunca fake
// timers: rompen `waitFor`/`findBy*` de RTL, que dependen de timers reales
// para su polling). El componente y el test calculan la MISMA fecha con la
// MISMA fórmula, así que dailyCard(userId, localDate) da la MISMA carta en
// ambos lados (mismo par userId+localDate → misma semilla, ver
// packages/core/src/tarot/daily.ts). Riesgo de flake solo si el test corre
// justo en el instante de un cambio de día local — negligible.
const USER_ID = "user-1";

function localDateKey(): string {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "utc";
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
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

interface FetchCall {
  url: string;
  init: RequestInit | undefined;
}

function mockFetch(readings: unknown[] = [], total = readings.length): { calls: FetchCall[] } {
  const calls: FetchCall[] = [];
  global.fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    const method = init?.method ?? "GET";
    if (method === "GET") {
      return { ok: true, json: async () => ({ readings, total }) } as unknown as Response;
    }
    const body = JSON.parse(String(init?.body));
    return {
      ok: true,
      status: 201,
      json: async () => ({
        reading: { id: "r-new", user_id: USER_ID, profile_id: null, notes: null, created_at: new Date().toISOString(), ...body },
      }),
    } as unknown as Response;
  }) as unknown as typeof fetch;
  return { calls };
}

describe("TarotView", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("monta con la carta del día boca abajo (dorso), sin nombre visible", async () => {
    mockFetch();
    renderView();
    const back = await screen.findByAltText(es.tarot.dailyFlipCta);
    expect((back as HTMLImageElement).src).toContain("/tarot/rws/back.webp");
    const localDate = localDateKey();
    const drawn = dailyCard(USER_ID, localDate, { reversals: true });
    expect(screen.queryByText(TAROT_CARDS_ES[drawn.card.id]!.name)).not.toBeInTheDocument();
  });

  it("tap voltea la carta, revela nombre/keywords/esencia y postea 'daily' la primera vez", async () => {
    const { calls } = mockFetch();
    renderView();
    const flipBtn = await screen.findByRole("button", { name: es.tarot.dailyFlipCta });
    fireEvent.click(flipBtn);

    const localDate = localDateKey();
    const drawn = dailyCard(USER_ID, localDate, { reversals: true });
    const content = TAROT_CARDS_ES[drawn.card.id]!;

    // nombre/keywords/essence viven ahora en DOS sitios en desktop (el hero de
    // la carta del día + el panel de interpretación, maestro-detalle Task 3):
    // se acotan a la <section> de la carta del día para no chocar con el panel.
    const dailySection = (await screen.findByText(es.tarot.dailyTitle)).closest("section")!;
    expect(within(dailySection).getByText(content.name)).toBeInTheDocument();
    expect(within(dailySection).getByText(content.essence)).toBeInTheDocument();
    for (const kw of content.keywords) {
      expect(within(dailySection).getByText(kw)).toBeInTheDocument();
    }

    await waitFor(() => {
      const post = calls.find((c) => c.init?.method === "POST");
      expect(post).toBeDefined();
    });
    const post = calls.find((c) => c.init?.method === "POST")!;
    expect(post.url).toBe("/api/tarot/readings");
    const body = JSON.parse(String(post.init?.body));
    expect(body).toMatchObject({
      spread: "daily",
      deck: "rws",
      cards: [{ cardId: drawn.card.id, reversed: drawn.reversed, position: "day" }],
    });

    // localStorage guarda la revelación para que persista entre montajes.
    expect(localStorage.getItem(`tarot-daily-${USER_ID}-${localDate}`)).toBeTruthy();
  });

  it("si ya estaba revelada Y guardada en localStorage, monta con la cara arriba y NO vuelve a postear", async () => {
    const localDate = localDateKey();
    localStorage.setItem(`tarot-daily-${USER_ID}-${localDate}`, "1");
    localStorage.setItem(`tarot-daily-saved-${USER_ID}-${localDate}`, "1");
    const { calls } = mockFetch();
    renderView();

    const drawn = dailyCard(USER_ID, localDate, { reversals: true });
    const content = TAROT_CARDS_ES[drawn.card.id]!;
    // Acotado al hero de la carta del día (el nombre también sale en el panel).
    await screen.findByText(es.tarot.dailyTitle);
    const dailySection = screen.getByText(es.tarot.dailyTitle).closest("section")!;
    expect(within(dailySection).getByText(content.name)).toBeInTheDocument();

    // Deja que cualquier microtask pendiente corra y confirma que no hubo POST.
    await waitFor(() => expect(calls.some((c) => c.init?.method === "GET")).toBe(true));
    expect(calls.some((c) => c.init?.method === "POST")).toBe(false);
  });

  it("la tarjeta 'Tres cartas' monta la ceremonia (paso de la pregunta)", async () => {
    mockFetch();
    renderView();
    expect(screen.queryByTestId("ceremony")).not.toBeInTheDocument();
    const threeCard = await screen.findByRole("button", { name: new RegExp(es.tarot.spreadThree) });
    fireEvent.click(threeCard);
    expect(await screen.findByTestId("ceremony")).toBeInTheDocument();
    expect(screen.getByText(es.tarot.questionTitle)).toBeInTheDocument();
  });

  it("si el POST del daily falla, NO se marca guardado y al remontar se reintenta una vez", async () => {
    // GET responde vacío; el POST rechaza (red caída) siempre.
    const calls: FetchCall[] = [];
    global.fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      if ((init?.method ?? "GET") === "POST") throw new Error("network down");
      return { ok: true, json: async () => ({ readings: [], total: 0 }) } as unknown as Response;
    }) as unknown as typeof fetch;

    const { unmount } = renderView();
    const flipBtn = await screen.findByRole("button", { name: es.tarot.dailyFlipCta });
    fireEvent.click(flipBtn);
    await waitFor(() => expect(calls.filter((c) => c.init?.method === "POST").length).toBe(1));

    const localDate = localDateKey();
    // Revelada visualmente, pero NO marcada como guardada en servidor.
    expect(localStorage.getItem(`tarot-daily-${USER_ID}-${localDate}`)).toBe("1");
    expect(localStorage.getItem(`tarot-daily-saved-${USER_ID}-${localDate}`)).toBeNull();

    unmount();
    renderView();
    // Al remontar: revelada-sin-guardar → reintenta el POST en background.
    await waitFor(() => expect(calls.filter((c) => c.init?.method === "POST").length).toBe(2));
  });

  it("cuando el POST del daily responde ok, se marca guardado y el remontaje no re-postea", async () => {
    const { calls } = mockFetch();
    const { unmount } = renderView();
    fireEvent.click(await screen.findByRole("button", { name: es.tarot.dailyFlipCta }));
    const localDate = localDateKey();
    await waitFor(() =>
      expect(localStorage.getItem(`tarot-daily-saved-${USER_ID}-${localDate}`)).toBe("1"),
    );
    unmount();
    renderView();
    await waitFor(() => expect(calls.filter((c) => c.init?.method === "GET").length).toBeGreaterThanOrEqual(2));
    expect(calls.filter((c) => c.init?.method === "POST").length).toBe(1);
  });

  it("al confirmarse el POST del daily, el diario se recarga sin recargar la página", async () => {
    const { calls } = mockFetch([], 0);
    renderView();
    await screen.findByText(es.tarot.diaryEmpty);
    const getsBeforeFlip = calls.filter((c) => c.init?.method === "GET").length;

    fireEvent.click(await screen.findByRole("button", { name: es.tarot.dailyFlipCta }));

    await waitFor(() =>
      expect(calls.filter((c) => c.init?.method === "GET").length).toBeGreaterThan(getsBeforeFlip),
    );
  });

  // T4: la grilla fija de 2 tarjetas fue reemplazada por <SpreadPicker> — ya
  // NO hay tirada "pronto"/deshabilitada; cualquier tirada primaria (ej. Cruz
  // celta) lanza la ceremonia digital igual que "Tres cartas".
  it("el picker de tiradas muestra 'Cruz celta' como tirada lanzable y la abre en la ceremonia", async () => {
    mockFetch();
    renderView();
    const celticCard = await screen.findByRole("button", { name: new RegExp(es.tarot.spreadCelticCross) });
    expect(screen.queryByTestId("ceremony")).not.toBeInTheDocument();
    fireEvent.click(celticCard);
    expect(await screen.findByTestId("ceremony")).toBeInTheDocument();
    expect(screen.getByText(es.tarot.questionTitle)).toBeInTheDocument();
  });

  it("el diario lista lo que trae el GET", async () => {
    const readings = [
      {
        id: "r1", user_id: USER_ID, profile_id: null, spread: "three", question: "¿Cómo sigo?",
        cards: [
          { cardId: "fool", reversed: false, position: "past" },
          { cardId: "magician", reversed: false, position: "present" },
          { cardId: "empress", reversed: true, position: "future" },
        ],
        notes: null, deck: "rws", created_at: "2026-07-10T12:00:00.000Z",
      },
      {
        id: "r2", user_id: USER_ID, profile_id: null, spread: "daily", question: null,
        cards: [{ cardId: "sun", reversed: false, position: "day" }],
        notes: null, deck: "rws", created_at: "2026-07-09T12:00:00.000Z",
      },
    ];
    mockFetch(readings, 2);
    renderView();

    const diaryTitle = await screen.findByText(es.tarot.diaryTitle);
    const diarySection = diaryTitle.closest("section") ?? diaryTitle.parentElement!;
    expect(within(diarySection).getByText(es.tarot.diarySpreadThree)).toBeInTheDocument();
    expect(within(diarySection).getByText(es.tarot.diarySpreadDaily)).toBeInTheDocument();
  });

  it("el diario vacío muestra el estado vacío", async () => {
    mockFetch([], 0);
    renderView();
    expect(await screen.findByText(es.tarot.diaryEmpty)).toBeInTheDocument();
  });

  it("el diario en error muestra el mensaje de error con botón reintentar", async () => {
    global.fetch = vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })) as unknown as typeof fetch;
    renderView();
    expect(await screen.findByText(es.tarot.diaryError)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: es.tarot.diaryRetry })).toBeInTheDocument();
    expect(screen.queryByText(es.tarot.diaryEmpty)).not.toBeInTheDocument();
  });

  it("servidor-como-verdad: si el GET trae un daily de HOY, monta revelada y no re-postea", async () => {
    const localDate = localDateKey();
    const drawn = dailyCard(USER_ID, localDate, { reversals: true });
    const content = TAROT_CARDS_ES[drawn.card.id]!;
    const { calls } = mockFetch(
      [
        {
          id: "r-today", user_id: USER_ID, profile_id: null, spread: "daily", question: null,
          cards: [{ cardId: drawn.card.id, reversed: drawn.reversed, position: "day" }],
          notes: null, deck: "rws", created_at: new Date().toISOString(),
        },
      ],
      1,
    );
    renderView();

    // Acotado al hero de la carta del día (el nombre también sale en el panel).
    await screen.findByText(es.tarot.dailyTitle);
    const dailySection = screen.getByText(es.tarot.dailyTitle).closest("section")!;
    expect(within(dailySection).getByText(content.name)).toBeInTheDocument();
    await waitFor(() => expect(localStorage.getItem(`tarot-daily-${USER_ID}-${localDate}`)).toBe("1"));
    expect(localStorage.getItem(`tarot-daily-saved-${USER_ID}-${localDate}`)).toBe("1");
    expect(calls.some((c) => c.init?.method === "POST")).toBe(false);
  });

  it("servidor-como-verdad: si el GET trae un daily de AYER, monta boca abajo y el flip postea normal", async () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { calls } = mockFetch(
      [
        {
          id: "r-yesterday", user_id: USER_ID, profile_id: null, spread: "daily", question: null,
          cards: [{ cardId: "fool", reversed: false, position: "day" }],
          notes: null, deck: "rws", created_at: yesterday,
        },
      ],
      1,
    );
    renderView();

    const back = await screen.findByAltText(es.tarot.dailyFlipCta);
    expect((back as HTMLImageElement).src).toContain("/tarot/rws/back.webp");

    const flipBtn = screen.getByRole("button", { name: es.tarot.dailyFlipCta });
    fireEvent.click(flipBtn);
    await waitFor(() => {
      const post = calls.find((c) => c.init?.method === "POST");
      expect(post).toBeDefined();
    });
  });

  it("con más lecturas guardadas que las visibles (free), muestra freeLimitNote", async () => {
    const readings = Array.from({ length: 7 }, (_, i) => ({
      id: `r${i}`, user_id: USER_ID, profile_id: null, spread: "three" as const, question: null,
      cards: [
        { cardId: "fool", reversed: false, position: "past" },
        { cardId: "magician", reversed: false, position: "present" },
        { cardId: "empress", reversed: false, position: "future" },
      ],
      notes: null, deck: "rws", created_at: "2026-07-10T12:00:00.000Z",
    }));
    mockFetch(readings, 12);
    renderView();
    await screen.findByText(es.tarot.diaryTitle);
    const note = es.tarot.freeLimitNote.replace("{count}", "7").replace("{total}", "12");
    expect(await screen.findByText(note)).toBeInTheDocument();
  });
});
