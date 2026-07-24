// Task 7 (HD7): ensamblaje del dashboard maestro-detalle de /hoy.
// La columna izquierda apila 8 secciones en orden fijo; la derecha (sticky en
// desktop) monta el chat de Aluna embebido. Se quitan el saludo "Hola" y la
// fila de lentes (redundantes con el TopNav) y el viejo askCta.
//
// HubView es un client component: se renderiza directo (a diferencia de
// perfil/page.tsx que es server y se testea sobre la fuente). El ocultado del
// chat en móvil es por CSS (patrón perfil: interpCol display:none), no por
// matchMedia — gatear el montaje por viewport rompería la hidratación SSR
// (mismo motivo por el que carta/pilares/numeros nunca gatean el render por
// matchMedia, solo los clicks). Por eso la garantía "móvil sin chat" se
// verifica sobre la fuente del CSS (display:none base + reveal en @media 1080),
// igual que perfil-layout.test.tsx verifica su estructura sobre la fuente.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { Aspect } from "@aluna/core";
import type { Commitment } from "@/lib/memory-commitments";
import es from "@/messages/es.json";
import { HubView } from "../hub-view";
import styles from "../hub.module.css";
import chatStyles from "../../preguntar/chat.module.css";

const { mockActive, dismissCommitmentAction } = vi.hoisted(() => ({
  mockActive: {
    current: { id: "profile-1", name: "Gio", birth_date: "1990-01-01" } as {
      id: string;
      name: string;
      birth_date: string;
    } | null,
  },
  dismissCommitmentAction: vi.fn(async () => {}),
}));

vi.mock("@/lib/profiles/profiles-provider", () => ({ useProfiles: () => ({ active: mockActive.current }) }));
// El chat embebido (ChatView) lee useSearchParams; el resto de HubView ya no usa
// useRouter tras quitar el askCta, pero se mockea por si acaso.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(""),
}));
vi.mock("../../actions", () => ({ dismissCommitmentAction }));

const TRANSIT_ASPECT: Aspect = {
  a: "sun", b: "moon", aspect: "trine", angle: 120, orb: 1.2, applying: true, harmony: "soft",
};

// Mock de fetch por URL/cuerpo: transitos con ≥1 aspecto (para que la tarjeta de
// clima se pinte) + respuestas benignas para los demás endpoints (los títulos
// de sección se pintan igual, en estado loading/error, así que basta con no
// reventar).
function installFetch() {
  global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    const body = init?.body ? (JSON.parse(String(init.body)) as { kind?: string }) : {};
    const json = async (): Promise<unknown> => {
      if (url.includes("/api/chart")) {
        if (body.kind === "transits") {
          return {
            transitAspects: [TRANSIT_ASPECT],
            chart: { bodies: [{ body: "sun", longitude: 0 }, { body: "moon", longitude: 120 }] },
          };
        }
        return {};
      }
      if (url.includes("/api/scores")) return { general: [], astros: [], numeros: [], pilares: [] };
      if (url.includes("/api/chat/thread")) return { threadId: null, messages: [] };
      return {};
    };
    return { ok: true, status: 200, headers: { get: () => "application/json" }, json } as unknown as Response;
  }) as unknown as typeof fetch;
}

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextIntlClientProvider locale="es" messages={es}>
      {children}
    </NextIntlClientProvider>
  );
}

function commitment(): Commitment {
  return {
    id: "c1",
    description: "Un año de estabilidad financiera",
    kind: "manifestation",
    status: "open",
    due_at: null,
    source_ref: "manifestation:m1",
    created_at: "2026-01-01T00:00:00.000Z",
  };
}

describe("HubView — dashboard maestro-detalle (HD7)", () => {
  beforeEach(() => {
    mockActive.current = { id: "profile-1", name: "Gio", birth_date: "1990-01-01" };
    dismissCommitmentAction.mockClear();
    installFetch();
  });

  it("apila las secciones de la izquierda en el orden del contrato (consolidación Gio 2026-07-23: carta+clima en una ventana, + numerología y lectura de mano)", async () => {
    render(<HubView commitments={[commitment()]} />, { wrapper: Providers });

    // a→j: proactiva, energía, carta (con el clima consolidado en la MISMA
    // ventana), horóscopo occ, horóscopo or, numerología, pilares, tarot, mano.
    const markers = [
      await screen.findByText(new RegExp(es.hoy.proactive.title)), // "✦ Aluna te recuerda"
      screen.getByText(es.hoy.energyTitle), // "¿Cómo estás hoy?"
      screen.getByText(es.hoy.summaryChartTitle), // "Tu carta"
      screen.getByText(new RegExp(es.carta.weatherTitle)), // "☾ Tu clima de hoy" — AHORA dentro de la misma ventana que "Tu carta"
      screen.getByText(es.hoy.summaryHoroscopeWesternTitle),
      screen.getByText(es.hoy.summaryHoroscopeEasternTitle),
      screen.getByText(es.hoy.summaryNumerologyTitle),
      screen.getByText(es.hoy.summaryPillarsTitle),
      screen.getByText(es.hoy.tarotFanTitle),
      screen.getByText(es.hoy.summaryManoTitle), // de último, pedido explícito de Gio
    ];

    for (let i = 1; i < markers.length; i++) {
      const rel = markers[i - 1]!.compareDocumentPosition(markers[i]!);
      expect(
        rel & Node.DOCUMENT_POSITION_FOLLOWING,
        `sección ${i} después de la ${i - 1}`,
      ).toBeTruthy();
    }
  });

  it("carta y clima ya NO son ventanas separadas: comparten el mismo contenedor <section class=\"card\">", async () => {
    render(<HubView commitments={[commitment()]} />, { wrapper: Providers });

    const chartTitle = await screen.findByText(es.hoy.summaryChartTitle);
    const weatherHeading = screen.getByText(new RegExp(es.carta.weatherTitle));
    const chartCard = chartTitle.closest("section.card");
    const weatherCard = weatherHeading.closest("section.card");
    expect(chartCard).not.toBeNull();
    expect(chartCard).toBe(weatherCard);
  });

  it("monta el chat de Aluna (ChatView embebido) en el carril derecho interpCol, con el título del panel", () => {
    const { container } = render(<HubView commitments={[]} />, { wrapper: Providers });

    const interpCol = container.querySelector(`.${CSS.escape(styles.interpCol!)}`);
    expect(interpCol).not.toBeNull();

    // ChatView embebido usa .wrapEmbedded (no el .wrap de página) — montado dentro del carril derecho.
    const embedded = interpCol!.querySelector(`.${CSS.escape(chatStyles.wrapEmbedded!)}`);
    expect(embedded).not.toBeNull();

    // Título del panel (span .cardH2 = "Pregúntale a Aluna") dentro del carril derecho.
    const title = within(interpCol as HTMLElement).getAllByText(es.hoy.askAluna)[0]!;
    expect(title.className).toContain(styles.cardH2!);
  });

  it("no muestra el saludo «Hola», ni la fila de lentes, ni el viejo askCta", () => {
    render(<HubView commitments={[]} />, { wrapper: Providers });

    expect(screen.queryByText(es.hoy.greeting)).toBeNull(); // "Hola,"
    expect(screen.queryByText(es.hoy.lenses)).toBeNull(); // encabezado "Tus lentes"
    expect(screen.queryByText(es.hoy.lensSub.tarot)).toBeNull(); // subtítulo de un tile de lente
    expect(screen.queryByPlaceholderText(es.hoy.askPlaceholder)).toBeNull(); // input del askCta
    expect(screen.queryByRole("button", { name: es.hoy.askButton })).toBeNull(); // botón del askCta
  });
});

// Móvil: el chat vive en interpCol, oculto por CSS (display:none) — se verifica
// sobre la fuente del módulo (jsdom no aplica el CSS de los CSS Modules), igual
// que perfil-layout.test.tsx protege su estructura sobre la fuente.
describe("hub.module.css — interpCol oculto en móvil, visible en desktop", () => {
  const css = readFileSync(resolve(process.cwd(), "app/(app)/hoy/hub.module.css"), "utf8");

  it("oculta .interpCol por defecto (móvil)", () => {
    expect(css).toMatch(/\.interpCol\s*\{[^}]*display:\s*none/);
  });

  it("revela .interpCol sticky dentro del @media desktop (min-width: 1080px)", () => {
    const media = css.slice(css.indexOf("min-width: 1080px"));
    expect(media).toMatch(/\.interpCol\s*\{[^}]*display:\s*flex/); // columna: panel Interpretación + chat
    expect(media).toMatch(/\.interpCol\s*\{[^}]*position:\s*sticky/);
  });
});
