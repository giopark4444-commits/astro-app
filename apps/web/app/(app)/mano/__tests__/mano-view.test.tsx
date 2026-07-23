import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";

// Mismo patrón de mocks que numeros-selection.test.tsx (useProfiles con perfil
// fijo) y area-reading-sheet.test.tsx (fetch mockeado, sin stream). El
// reescalado client-side (canvas/FileReader) se mockea aparte: jsdom no tiene
// un <canvas> 2D real, así que probar el pixel-pushing no tiene sentido acá —
// ./resize-image ya es su propio módulo exactamente para poder mockearlo.
const PROFILE_ID = "profile-1";
vi.mock("@/lib/profiles/profiles-provider", () => ({
  useProfiles: () => ({ active: { id: PROFILE_ID, name: "Fixture", birth_date: "1990-02-04" } }),
}));

vi.mock("../resize-image", () => ({
  resizePalmPhoto: vi.fn(),
}));

import { resizePalmPhoto } from "../resize-image";
import { ManoView } from "../mano-view";
import styles from "../mano.module.css";

function renderView() {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <ManoView />
    </NextIntlClientProvider>,
  );
}

function makeFile(name = "palma.jpg"): File {
  return new File(["contenido-falso"], name, { type: "image/jpeg" });
}

function uploadFile(container: HTMLElement, file: File = makeFile()): void {
  const input = container.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
}

const domTitle = (key: "captureTitleDominant", side: string) => es.mano[key].replace("{side}", side);

const GOOD_FEATURES = {
  image_quality: { usable: true, issues: [] },
  mano: { declarada: "dominante" },
  forma: { elemento: "tierra" },
  lineas: [],
  montes: [],
};

const BAD_FEATURES = {
  image_quality: {
    usable: false,
    issues: ["desenfocada"],
    guidance: "Abre bien la palma y repite con más luz de frente.",
  },
  mano: { declarada: "dominante" },
  forma: {},
  lineas: [],
  montes: [],
};

const SECTIONS = {
  forma: "Tu palma cuadrada revela una energía práctica y de tierra.",
  lineas: "Tu línea de vida es profunda y continua.",
  montes: "El monte de Venus está prominente.",
  marcas: "Sin marcas relevantes visibles esta vez.",
  sintesis: "En síntesis, tu mano habla de estabilidad y ternura.",
  consejo: "Respira y confía en tu propio ritmo.",
};

describe("ManoView", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    vi.mocked(resizePalmPhoto).mockReset().mockResolvedValue({ data: "ZmFrZS1iYXNlNjQ=", mime: "image/jpeg" });
    fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it("intro renderiza con el sello de privacidad y las elecciones de mano", () => {
    renderView();

    expect(screen.getByText(es.mano.title)).toBeInTheDocument();
    expect(screen.getByText(es.mano.privacySeal)).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: es.mano.handCountTwo })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: es.mano.sideRightLabel })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: es.mano.start })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("flujo feliz de 1 mano: analysis → reading → secciones, con CTA a /preguntar y aviso de puente astral pendiente", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url === "/api/palm-analysis") {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ available: true, features: GOOD_FEATURES }) });
      }
      if (url === "/api/palm-reading") {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ available: true, sections: SECTIONS, hasNatal: false }) });
      }
      throw new Error(`unexpected fetch: ${url}`);
    });
    const { container } = renderView();

    // Elegir "una mano" y comenzar.
    fireEvent.click(screen.getByRole("tab", { name: es.mano.handCountOne }));
    fireEvent.click(screen.getByRole("button", { name: es.mano.start }));

    // Captura de la mano dominante (derecha por default).
    await screen.findByText(domTitle("captureTitleDominant", es.mano.sideRight));
    uploadFile(container);

    // Secciones de la lectura, con el "consejo" destacado y el CTA a Aluna.
    await waitFor(() => expect(screen.getByText(SECTIONS.sintesis)).toBeInTheDocument());
    expect(screen.getByText(SECTIONS.forma)).toBeInTheDocument();
    expect(screen.getByText(SECTIONS.consejo)).toBeInTheDocument();
    expect(screen.getByText(SECTIONS.marcas)).toBeInTheDocument();

    // Sin puente astral (no vino en `sections`) y sin carta (hasNatal:false): el
    // aviso de "completa tu perfil" reemplaza a la sección, no se inventa nada.
    expect(screen.getByText(es.mano.noNatalNote)).toBeInTheDocument();

    const cta = screen.getByRole("link", { name: es.mano.askAluna });
    expect(cta.getAttribute("href")).toBe(`/preguntar?q=${encodeURIComponent(es.mano.askQuestion)}`);
    expect(screen.getByRole("button", { name: es.mano.readAgain })).toBeInTheDocument();

    // Y quedó guardada en localStorage (solo texto — sin foto ni inventario).
    const raw = localStorage.getItem(`aluna.palm.${PROFILE_ID}`);
    expect(raw).toBeTruthy();
    const saved = JSON.parse(raw!);
    expect(saved.sections.sintesis).toBe(SECTIONS.sintesis);
    expect(saved.manos).toEqual(["dominante"]);
  });

  it("2 manos: tras la dominante pasa a capturar la pasiva, y /api/palm-reading recibe ambos inventarios", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url === "/api/palm-analysis") {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ available: true, features: GOOD_FEATURES }) });
      }
      if (url === "/api/palm-reading") {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ available: true, sections: SECTIONS, hasNatal: true }) });
      }
      throw new Error(`unexpected fetch: ${url}`);
    });
    const { container } = renderView();

    // Default: "las dos manos", dominante = derecha.
    fireEvent.click(screen.getByRole("button", { name: es.mano.start }));

    await screen.findByText(domTitle("captureTitleDominant", es.mano.sideRight));
    uploadFile(container, makeFile("derecha.jpg"));

    // Pasa a capturar la mano pasiva — la opuesta (izquierda).
    await screen.findByText(es.mano.captureTitlePassive.replace("{side}", es.mano.sideLeft));
    uploadFile(container, makeFile("izquierda.jpg"));

    await waitFor(() => expect(screen.getByText(SECTIONS.sintesis)).toBeInTheDocument());
    // Con carta (hasNatal:true) no debe aparecer el aviso de perfil incompleto.
    expect(screen.queryByText(es.mano.noNatalNote)).toBeNull();

    const analysisCalls = fetchMock.mock.calls.filter((call) => call[0] === "/api/palm-analysis");
    expect(analysisCalls).toHaveLength(2);

    const readingCall = fetchMock.mock.calls.find((call) => call[0] === "/api/palm-reading")!;
    const body = JSON.parse(readingCall[1].body);
    expect(body.hands.dominante).toBeTruthy();
    expect(body.hands.pasiva).toBeTruthy();
    expect(body.profileId).toBe(PROFILE_ID);
    expect(body.locale).toBe("es");
  });

  it("foto mala: usable:false muestra la guía de retoma en vez de avanzar", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url === "/api/palm-analysis") {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ available: true, features: BAD_FEATURES }) });
      }
      throw new Error(`unexpected fetch: ${url}`);
    });
    const { container } = renderView();

    fireEvent.click(screen.getByRole("tab", { name: es.mano.handCountOne }));
    fireEvent.click(screen.getByRole("button", { name: es.mano.start }));
    await screen.findByText(domTitle("captureTitleDominant", es.mano.sideRight));
    uploadFile(container);

    await waitFor(() => expect(screen.getByText(es.mano.retakeTitle)).toBeInTheDocument());
    expect(screen.getByText(BAD_FEATURES.image_quality.guidance)).toBeInTheDocument();
    expect(screen.getByText("desenfocada")).toBeInTheDocument();

    // "Retomar esta mano" vuelve a la MISMA captura (dominante), no avanza a la lectura.
    fireEvent.click(screen.getByRole("button", { name: es.mano.retakeCta }));
    await screen.findByText(domTitle("captureTitleDominant", es.mano.sideRight));
    expect(fetchMock.mock.calls.filter((call) => call[0] === "/api/palm-reading")).toHaveLength(0);
  });

  it("dormido: {available:false} en el análisis muestra el estado dormido del oráculo", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ available: false }) });
    const { container } = renderView();

    fireEvent.click(screen.getByRole("tab", { name: es.mano.handCountOne }));
    fireEvent.click(screen.getByRole("button", { name: es.mano.start }));
    await screen.findByText(domTitle("captureTitleDominant", es.mano.sideRight));
    uploadFile(container);

    await waitFor(() => expect(screen.getByText(es.mano.dormantTitle)).toBeInTheDocument());
    expect(screen.getByText(es.mano.dormantBody)).toBeInTheDocument();
  });

  it("foto muy pesada (413) invita a elegir otra, sin tratarla como error genérico", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 413, json: async () => ({ available: false, error: "too_large" }) });
    const { container } = renderView();

    fireEvent.click(screen.getByRole("tab", { name: es.mano.handCountOne }));
    fireEvent.click(screen.getByRole("button", { name: es.mano.start }));
    await screen.findByText(domTitle("captureTitleDominant", es.mano.sideRight));
    uploadFile(container);

    await waitFor(() => expect(screen.getByText(es.mano.tooLargeTitle)).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: es.mano.tooLargeCta }));
    await screen.findByText(domTitle("captureTitleDominant", es.mano.sideRight));
  });

  it("nublado: fetch que falla (red) cae a error con Reintentar, sin perder la mano en curso", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));
    const { container } = renderView();

    fireEvent.click(screen.getByRole("tab", { name: es.mano.handCountOne }));
    fireEvent.click(screen.getByRole("button", { name: es.mano.start }));
    await screen.findByText(domTitle("captureTitleDominant", es.mano.sideRight));
    uploadFile(container);

    await waitFor(() => expect(screen.getByText(es.mano.error)).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: es.mano.retry }));
    await screen.findByText(domTitle("captureTitleDominant", es.mano.sideRight));
  });

  it("localStorage restaura la última lectura al montar, sin pedir nada a la red", async () => {
    localStorage.setItem(
      `aluna.palm.${PROFILE_ID}`,
      JSON.stringify({
        sections: SECTIONS,
        hasNatal: true,
        fecha: "2026-07-20T12:00:00.000Z",
        manos: ["dominante", "pasiva"],
      }),
    );

    renderView();

    await waitFor(() => expect(screen.getByText(SECTIONS.sintesis)).toBeInTheDocument());
    expect(screen.getByRole("button", { name: es.mano.readAgain })).toBeInTheDocument();
    expect(screen.queryByText(es.mano.privacySeal)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("'Leer de nuevo' vuelve a la intro sin borrar la lectura restaurada previamente", async () => {
    localStorage.setItem(
      `aluna.palm.${PROFILE_ID}`,
      JSON.stringify({ sections: SECTIONS, hasNatal: true, fecha: "2026-07-20T12:00:00.000Z", manos: ["dominante"] }),
    );
    renderView();
    await waitFor(() => expect(screen.getByText(SECTIONS.sintesis)).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: es.mano.readAgain }));

    expect(screen.getByText(es.mano.privacySeal)).toBeInTheDocument();
    // El registro previo sigue en el dispositivo — reiniciar la ceremonia no lo borra.
    expect(localStorage.getItem(`aluna.palm.${PROFILE_ID}`)).toBeTruthy();
  });
});

// Task 5: maestro-detalle 2 columnas en desktop (mismo patrón que numeros/
// pilares/carta/horoscopo/tarot) — ManoView es un client component normal
// (a diferencia de perfil/page.tsx), así que se verifica render-y-DOM real,
// no la fuente. El CSS de layout en sí (grid/align-items:start/sticky) vive
// en @media y jsdom no lo aplica — eso queda verificado por code review +
// paridad de valores con el resto de la serie (ver mano.module.css).
describe("ManoView — estructura maestro-detalle (deskCols > leftCol + interpCol)", () => {
  beforeEach(() => {
    localStorage.clear();
    global.fetch = vi.fn() as unknown as typeof fetch;
  });

  it("intro: leftCol tiene los controles de siempre; interpCol muestra el panel explicativo (vista previa de las 6 secciones)", () => {
    const { container } = renderView();

    const deskCols = container.querySelector(`.${CSS.escape(styles.deskCols!)}`);
    const leftCol = container.querySelector(`.${CSS.escape(styles.leftCol!)}`);
    const interpCol = container.querySelector(`.${CSS.escape(styles.interpCol!)}`);
    expect(deskCols).not.toBeNull();
    expect(leftCol).not.toBeNull();
    expect(interpCol).not.toBeNull();
    // Ambos carriles son hijos de deskCols (mismo anidamiento que el resto de la serie).
    expect(leftCol!.parentElement).toBe(deskCols);
    expect(interpCol!.parentElement).toBe(deskCols);

    // leftCol: introP1/introP2 + sello + controles siguen ahí (móvil-safe: NO
    // se movieron al panel derecho, ver mano-view.tsx IntroScreen).
    expect(leftCol).toHaveTextContent(es.mano.introP1);
    expect(leftCol).toHaveTextContent(es.mano.introP2);
    expect(screen.getByText(es.mano.privacySeal)).toBeInTheDocument();

    // interpCol: panel explicativo — NO duplica introP1/introP2, previene las
    // 6 secciones con los mismos labels `section.*` de la lectura real.
    expect(interpCol).not.toHaveTextContent(es.mano.introP1);
    for (const label of Object.values(es.mano.section)) {
      expect(interpCol).toHaveTextContent(label as string);
    }
  });

  it("captura/análisis/avisos (sin lectura todavía): interpCol sigue mostrando el panel explicativo, no queda vacío", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ available: false }) });
    global.fetch = fetchMock as unknown as typeof fetch;
    vi.mocked(resizePalmPhoto).mockResolvedValue({ data: "ZmFrZS1iYXNlNjQ=", mime: "image/jpeg" });
    const { container } = renderView();

    fireEvent.click(screen.getByRole("tab", { name: es.mano.handCountOne }));
    fireEvent.click(screen.getByRole("button", { name: es.mano.start }));
    await screen.findByText(domTitle("captureTitleDominant", es.mano.sideRight));

    const interpCol = container.querySelector(`.${CSS.escape(styles.interpCol!)}`);
    expect(interpCol).toHaveTextContent(es.mano.section.forma);

    uploadFile(container);
    await waitFor(() => expect(screen.getByText(es.mano.dormantTitle)).toBeInTheDocument());
    expect(container.querySelector(`.${CSS.escape(styles.interpCol!)}`)).toHaveTextContent(es.mano.section.sintesis);
  });

  it("con la lectura lista: leftCol queda compacto (solo resumen + acciones, SIN las secciones); interpCol tiene el resultado completo", async () => {
    localStorage.setItem(
      `aluna.palm.${PROFILE_ID}`,
      JSON.stringify({ sections: SECTIONS, hasNatal: false, fecha: "2026-07-20T12:00:00.000Z", manos: ["dominante"] }),
    );
    const { container } = renderView();
    await waitFor(() => expect(screen.getByText(SECTIONS.sintesis)).toBeInTheDocument());

    const leftCol = container.querySelector(`.${CSS.escape(styles.leftCol!)}`);
    const interpCol = container.querySelector(`.${CSS.escape(styles.interpCol!)}`);

    // Izquierda: resumen + acciones, nada de las secciones/consejo.
    expect(leftCol).toHaveTextContent(es.mano.readAgain);
    expect(leftCol).not.toHaveTextContent(SECTIONS.sintesis);
    expect(leftCol).not.toHaveTextContent(es.mano.section.forma);

    // Derecha: el resultado completo — secciones + aviso de puente astral pendiente.
    expect(interpCol).toHaveTextContent(SECTIONS.sintesis);
    expect(interpCol).toHaveTextContent(SECTIONS.consejo);
    expect(interpCol).toHaveTextContent(es.mano.noNatalNote);
    expect(interpCol).not.toHaveTextContent(es.mano.readAgain);
  });
});
