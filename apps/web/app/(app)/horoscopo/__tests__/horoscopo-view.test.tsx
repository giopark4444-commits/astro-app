import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";
import { HoroscopoView } from "../horoscopo-view";

// mockActive: permite que un solo test simule un perfil activo (sign arranca
// en null, como en producción) sin afectar a los demás, que asumen "sin
// perfil". vi.hoisted porque vi.mock() se iza sobre los imports: sin esto, la
// factory de abajo no podría referenciar esta variable de módulo.
const { mockActive } = vi.hoisted(() => ({ mockActive: { current: null as { id: string } | null } }));

vi.mock("@/lib/profiles/profiles-provider", () => ({ useProfiles: () => ({ active: mockActive.current }) }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const PAYLOAD = {
  sign: "aquarius", period: "today", tz: "utc",
  range: { fromIso: "2026-07-13T00:00:00Z", toIso: "2026-07-13T23:59:59Z" },
  houses: [{ body: "sun", sign: "cancer", house: 6, retrograde: false }],
  signAspects: [{ body: "saturn", sign: "aries", aspect: "sextile", harmony: "soft" }],
  events: [{ kind: "lunation", atIso: "2026-07-13T10:00:00Z", phase: "full", sign: "capricorn", longitude: 291, eclipse: null }],
  areas: [{ area: "work", score: 62, tone: "high", drivers: [{ body: "jupiter", house: 10, favorable: true }] }],
};

/** Promesa controlable a mano: deja resolver un fetch mockeado en el momento
 *  exacto que el test necesita, para poder inspeccionar el DOM ANTES de que
 *  la siguiente petición asíncrona se asiente (clave para cazar parpadeos). */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => { resolve = res; });
  return { promise, resolve };
}

beforeEach(() => {
  mockActive.current = null;
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => PAYLOAD })) as unknown as typeof fetch;
});

function renderView() {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <HoroscopoView />
    </NextIntlClientProvider>,
  );
}

describe("HoroscopoView", () => {
  it("pinta los 12 chips de signos y carga el payload (Luna Llena visible)", async () => {
    renderView();
    expect(screen.getAllByRole("tab").length).toBeGreaterThanOrEqual(2); // tabs de tradición
    // "Luna Llena" aparece dos veces a propósito (el evento en "El cielo del
    // periodo" Y la prosa compuesta la nombra también) → *AllBy* en vez de getBy.
    await waitFor(() => expect(screen.getAllByText(/Luna Llena/).length).toBeGreaterThan(0));
    expect(screen.getAllByRole("radio", { name: /.+/ })).toHaveLength(12); // chips de signo
  });
  it("sin perfil, arranca en Aries (primer signo) y pide al backend", async () => {
    renderView();
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]![1]!.body as string);
    expect(body.sign).toBe("aries");
    expect(body.period).toBe("today");
  });

  it("con perfil activo, no vuelve a mostrar 'loading' cuando el signo se resuelve desde null (regresión parpadeo T8 review)", async () => {
    mockActive.current = { id: "profile-1" };
    const first = deferred<{ ok: boolean; json: () => Promise<unknown> }>();
    const second = deferred<{ ok: boolean; json: () => Promise<unknown> }>();
    let calls = 0;
    global.fetch = vi.fn(() => {
      calls += 1;
      return calls === 1 ? first.promise : second.promise;
    }) as unknown as typeof fetch;

    renderView();
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    // 1ª carga: sign=null, el backend resuelve el Sol natal → "aquarius". Eso
    // cambia `sign` (null → "aquarius"), que está en las deps del efecto, así
    // que el efecto se re-ejecuta y dispara una 2ª fetch (con otro signo, para
    // simular que de verdad viaja un payload distinto en cada llamada).
    await act(async () => {
      first.resolve({ ok: true, json: async () => ({ ...PAYLOAD, sign: "aquarius" }) });
    });
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));

    // La 2ª fetch queda deliberadamente sin resolver (never .resolve()'d). Si
    // el efecto reseteara a "loading" en esa re-ejecución (el bug de T8
    // review), ya sería visible AQUÍ, antes de que la 2ª fetch complete —
    // justo el parpadeo loading→ready→loading que el fix evita.
    expect(screen.queryByText("Leyendo el cielo…")).not.toBeInTheDocument();
    expect(screen.getAllByText(/Luna Llena/).length).toBeGreaterThan(0);

    void second; // nunca se resuelve a propósito; ver comentario arriba.
  });
});
