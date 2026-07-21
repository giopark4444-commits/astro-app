// Integración del maestro-detalle: tocar en la columna técnica actualiza el
// panel de interpretación (desktop). matchMedia se burla como desktop, así que
// `select` escribe en `selected` (panel derecho) y no abre el sheet.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { ThemeProvider } from "@/lib/theme/theme-provider";
import type { BodyPosition, ChartResult } from "@aluna/core";
import es from "@/messages/es.json";
import { CartaView } from "../carta-view";
import cartaStyles from "../carta.module.css";

const FIXTURE_PROFILE = {
  id: "p1",
  name: "Fixture",
  birth_date: "1990-01-01",
  birth_time: "12:00",
  time_known: true,
  place_name: "Bogotá",
  latitude: 4.7,
  longitude: -74.1,
  time_zone: "America/Bogota",
  gender: "x",
};

vi.mock("@/lib/profiles/profiles-provider", () => ({ useProfiles: () => ({ active: FIXTURE_PROFILE }) }));

function body(overrides: Partial<BodyPosition> & { body: string }): BodyPosition {
  return {
    longitude: 0, signDegree: 0, degree: 0, minute: 0, second: 0,
    speed: 1, retrograde: false, house: 1, dignity: null, sign: "aries",
    ...overrides,
  };
}

function makeChart(overrides: Partial<ChartResult> = {}): ChartResult {
  return {
    bodies: [
      body({ body: "sun", sign: "leo", house: 5, dignity: "domicile" }),
      body({ body: "moon", sign: "cancer", house: 4, dignity: "domicile" }),
    ],
    houses: {
      system: "placidus",
      cusps: [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330],
      ascendant: 0,
      midheaven: 270,
    },
    aspects: [{ a: "sun", b: "moon", aspect: "trine", angle: 120, orb: 2.1, applying: true, harmony: "soft" }],
    distribution: {
      elements: { fire: 3, earth: 1, air: 0, water: 3 },
      modalities: { cardinal: 2, fixed: 3, mutable: 2 },
      polarities: { yang: 4, yin: 3 },
      dominantElement: "fire",
      dominantModality: "fixed",
    },
    patterns: [],
    meta: { julianDayUt: 2451545, julianDayEt: 2451545.0007, utcHour: 12, zodiac: "tropical" },
    ...overrides,
  };
}

const CHART = makeChart();

beforeEach(() => {
  // matches:false para "(max-width: 1079px)" = desktop → el router de selección
  // escribe el panel derecho (setSelected), no el sheet.
  vi.stubGlobal("matchMedia", (q: string) => ({
    matches: false, media: q, addEventListener: () => {}, removeEventListener: () => {},
  }));
  global.fetch = vi.fn(async () => ({
    ok: true,
    json: async () => ({ chart: CHART, solar: false, transitAspects: [] }),
  })) as unknown as typeof fetch;
});

function renderView() {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <ThemeProvider initialTheme="observatory" initialMode="dark" persist={vi.fn()}>
        <CartaView />
      </ThemeProvider>
    </NextIntlClientProvider>,
  );
}

/** La sección técnica que envuelve una tabla (h3 → <section>). */
function sectionOf(headingName: string) {
  return screen.getByRole("heading", { name: headingName, level: 3 }).closest("section") as HTMLElement;
}

describe("CartaView maestro-detalle", () => {
  it("arranca con el núcleo tejido en el panel", async () => {
    renderView();
    // La cabecera del panel de interpretación (desktop) está presente desde el
    // arranque, con la selección por defecto = núcleo.
    expect(await screen.findByText("Interpretación")).toBeInTheDocument();
  });

  it("clic en fila de posiciones → panel muestra ese cuerpo", async () => {
    renderView();
    await screen.findByText("Interpretación");
    // El cuerpo del Sol aún no está tejido en el panel.
    expect(screen.queryByText(/Tu Sol es tu identidad esencial/)).not.toBeInTheDocument();
    // La celda "cuerpo" de la fila del Sol en la tabla de Posiciones es un botón.
    const posSection = sectionOf("Posiciones");
    const solCell = within(posSection).getByRole("button", { name: /Sol/ });
    fireEvent.click(solCell);
    // Ahora el panel derecho teje la esencia del Sol.
    expect(await screen.findByText(/Tu Sol es tu identidad esencial/)).toBeInTheDocument();
  });

  it("Modo Pro tiene efecto inmediato en el estado inicial (Núcleo + Lectura del Núcleo)", async () => {
    renderView();
    await screen.findByText("Interpretación");
    // Aterrizaje: tab Núcleo + lectura del núcleo, SIN tocar nada más.
    expect(screen.queryByText(/Día juliano/)).not.toBeInTheDocument();
    expect(screen.queryByText("El núcleo, en datos")).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Modo Pro" })[0]!);
    // Izquierda: la cabecera técnica del chart aparece al pie de la rueda (sin cambiar de tab).
    expect(await screen.findByText(/Día juliano/)).toBeInTheDocument();
    // Derecha: la Lectura del Núcleo gana su desglose técnico.
    expect(await screen.findByText("El núcleo, en datos")).toBeInTheDocument();
  });

  it("Modo Pro revela dignidades/velocidad en la tabla y tiers en el panel", async () => {
    renderView();
    await screen.findByText("Interpretación");
    // Sin Pro la tabla no muestra la columna técnica (dignidad · velocidad).
    expect(screen.queryByText(/°\/d/)).not.toBeInTheDocument();
    // Activar Modo Pro (hay dos toggles equivalentes: pie de rueda + móvil).
    fireEvent.click(screen.getAllByRole("button", { name: "Modo Pro" })[0]!);
    // La tabla de Posiciones revela la velocidad (detalle Pro) — una por cuerpo.
    expect((await screen.findAllByText(/°\/d/)).length).toBeGreaterThan(0);
    // Al seleccionar un cuerpo, el panel abre el selector de profundidad (tiers).
    const posSection = sectionOf("Posiciones");
    fireEvent.click(within(posSection).getByRole("button", { name: /Sol/ }));
    expect(await screen.findByRole("tab", { name: "Profunda" })).toBeInTheDocument();
  });

  it("cambiar de tipo de carta resetea la selección al núcleo", async () => {
    renderView();
    await screen.findByText("Interpretación");
    // Seleccionar el Sol: el panel teje su esencia.
    const posSection = sectionOf("Posiciones");
    fireEvent.click(within(posSection).getByRole("button", { name: /Sol/ }));
    expect(await screen.findByText(/Tu Sol es tu identidad esencial/)).toBeInTheDocument();
    // Cambiar el tipo de carta (natal → Tu Clima/transits): es OTRO chart — la
    // selección del Sol quedó apuntando al chart anterior. El panel debe volver
    // al núcleo, no sostener la esencia del Sol del chart viejo.
    fireEvent.click(screen.getByRole("tab", { name: "Tu Clima" }));
    expect(await screen.findByText("Lectura del núcleo")).toBeInTheDocument();
    expect(screen.queryByText(/Tu Sol es tu identidad esencial/)).not.toBeInTheDocument();
  });
});

/** La sección técnica que envuelve el bloque de Balance (h4 → ancestro <section>). */
function balanceSectionOf(headingName: string) {
  // Hay dos <h4> "Elementos"/"Modalidades": uno en el pane núcleo (dentro de un
  // <div>, sin <section>) y otro en el pane balance (dentro de un <section>).
  // Se busca el que SÍ tiene un ancestro <section>.
  const headings = screen.getAllByText(headingName);
  const withSection = headings.map((h) => h.closest("section")).find((s): s is HTMLElement => s !== null);
  if (!withSection) throw new Error(`ninguna "${headingName}" está dentro de un <section>`);
  return withSection;
}

describe("CartaView móvil sin Pro (review Fable: balance + router)", () => {
  beforeEach(() => {
    // matches:true para "(max-width: 1079px)" = móvil → el router de
    // selección abre el sheet (setSheetSel), no el panel derecho.
    vi.stubGlobal("matchMedia", (q: string) => ({
      matches: q.includes("max-width: 1079px"),
      media: q, addEventListener: () => {}, removeEventListener: () => {},
    }));
  });

  it("ítem 1: el pane balance NO es descendiente de .mobileLamina; el de posiciones SÍ (y ambos siguen dentro de .techCard)", async () => {
    const { container } = renderView();
    await screen.findByText("Interpretación");

    // "Elementos" está visible en el DOM (barras de Elementos/Modalidades sin Pro).
    expect(screen.getAllByText("Elementos").length).toBeGreaterThan(0);

    const lamina = container.querySelector(`.${CSS.escape(cartaStyles.mobileLamina!)}`);
    const techCard = container.querySelector(`.${CSS.escape(cartaStyles.techCard!)}`);
    expect(lamina).not.toBeNull();
    expect(techCard).not.toBeNull();

    const balanceSection = balanceSectionOf("Elementos");
    const posSection = sectionOf("Posiciones");

    expect(lamina!.contains(balanceSection)).toBe(false);
    expect(techCard!.contains(balanceSection)).toBe(true);
    expect(lamina!.contains(posSection)).toBe(true);
  });

  it("ítem 4: clic en fila de aspectario en móvil abre el dialog con prosa del glosario (trígono → 120°) y el panel desktop no cambia", async () => {
    renderView();
    await screen.findByText("Interpretación");

    const aspSection = sectionOf("Aspectos");
    fireEvent.click(within(aspSection).getByRole("button", { name: /Trígono/ }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/120°/)).toBeInTheDocument();

    // El panel desktop (siempre montado, oculto por CSS en móvil) no cambió:
    // sigue en el núcleo, no tejió el aspecto.
    expect(screen.getByText("Lectura del núcleo")).toBeInTheDocument();
  });
});
