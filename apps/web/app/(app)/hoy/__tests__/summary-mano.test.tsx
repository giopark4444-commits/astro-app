// Tarjeta-resumen de Lectura de mano del dashboard (pedido de Gio: "una
// ventana para subir la foto de la mano y que sea interpretada") — a
// diferencia de las otras Summary*, esta SÍ dispara un flujo real (subir foto
// → analizar → tejer lectura) contra los MISMOS 2 endpoints y el MISMO
// storage por dispositivo que /mano (mano/__tests__/mano-view.test.tsx es el
// espejo completo; acá solo la versión compacta de una mano).
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";

vi.mock("../../mano/resize-image", () => ({
  resizePalmPhoto: vi.fn(),
}));

// CameraCapture (getUserMedia real) tiene su propio test dedicado
// (mano/__tests__/camera-capture.test.tsx) — acá se mockea como stub
// interactivo para probar SOLO el toggle "Tomar foto" ↔ "Elegir foto".
vi.mock("../../mano/camera-capture", () => ({
  CameraCapture: ({ onCapture, onCancel }: { onCapture: (f: File) => void; onCancel: () => void }) => (
    <div data-testid="camera-capture-stub">
      <button type="button" onClick={() => onCapture(new File(["foto"], "camara.jpg", { type: "image/jpeg" }))}>
        stub-snap
      </button>
      <button type="button" onClick={onCancel}>
        stub-cancel
      </button>
    </div>
  ),
}));

import { resizePalmPhoto } from "../../mano/resize-image";
import { SummaryMano } from "../summary-mano";

const PROFILE_ID = "profile-1";

function renderSummary() {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <SummaryMano profileId={PROFILE_ID} />
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

const GOOD_FEATURES = {
  image_quality: { usable: true, issues: [] },
  mano: { declarada: "dominante" },
  forma: { elemento: "tierra" },
  lineas: [],
  montes: [],
};

const SECTIONS = {
  forma: "Tu palma cuadrada revela una energía práctica.",
  lineas: "Tu línea de vida es profunda y continua.",
  sintesis: "En síntesis, tu mano habla de estabilidad y ternura.",
};

describe("SummaryMano", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    vi.mocked(resizePalmPhoto).mockReset().mockResolvedValue({ data: "ZmFrZS1iYXNlNjQ=", mime: "image/jpeg" });
    fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it("sin lectura guardada: sello de privacidad + botón de subir foto, sin pedir nada a la red", () => {
    renderSummary();
    expect(screen.getByText(es.hoy.summaryManoTitle)).toBeInTheDocument();
    expect(screen.getByText(es.mano.privacySeal)).toBeInTheDocument();
    expect(screen.getByText(es.mano.captureCta)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("ofrece Tomar foto (cámara) como opción primaria y Elegir foto como respaldo", () => {
    renderSummary();
    expect(screen.getByRole("button", { name: es.mano.cameraCta })).toBeInTheDocument();
    expect(screen.getByText(es.mano.cameraOr)).toBeInTheDocument();
    expect(screen.getByText(es.mano.captureCta)).toBeInTheDocument();
    expect(screen.queryByTestId("camera-capture-stub")).not.toBeInTheDocument();
  });

  it("Tomar foto abre la cámara y capturar entrega el archivo al mismo flujo que Elegir foto", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url === "/api/palm-analysis") {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ available: true, features: GOOD_FEATURES }) });
      }
      if (url === "/api/palm-reading") {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ available: true, sections: SECTIONS, hasNatal: true }) });
      }
      throw new Error(`unexpected fetch: ${url}`);
    });
    renderSummary();

    fireEvent.click(screen.getByRole("button", { name: es.mano.cameraCta }));
    expect(screen.getByTestId("camera-capture-stub")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "stub-snap" }));
    await waitFor(() => expect(screen.getByText(SECTIONS.sintesis)).toBeInTheDocument());
  });

  it("Cancelar en la cámara vuelve a las opciones de captura", () => {
    renderSummary();
    fireEvent.click(screen.getByRole("button", { name: es.mano.cameraCta }));
    fireEvent.click(screen.getByRole("button", { name: "stub-cancel" }));

    expect(screen.getByRole("button", { name: es.mano.cameraCta })).toBeInTheDocument();
    expect(screen.queryByTestId("camera-capture-stub")).not.toBeInTheDocument();
  });

  it("con una lectura ya guardada (de acá o de /mano, mismo storage), la muestra directo sin red", () => {
    localStorage.setItem(
      `aluna.palm.${PROFILE_ID}`,
      JSON.stringify({ sections: SECTIONS, hasNatal: true, fecha: "2026-07-20T12:00:00.000Z", manos: ["dominante"] }),
    );
    renderSummary();

    expect(screen.getByText(SECTIONS.sintesis)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("flujo feliz: subir foto → analizar → tejer lectura → síntesis, guardado en el MISMO storage que /mano", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url === "/api/palm-analysis") {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ available: true, features: GOOD_FEATURES }) });
      }
      if (url === "/api/palm-reading") {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ available: true, sections: SECTIONS, hasNatal: true }) });
      }
      throw new Error(`unexpected fetch: ${url}`);
    });
    const { container } = renderSummary();

    uploadFile(container);
    await waitFor(() => expect(screen.getByText(SECTIONS.sintesis)).toBeInTheDocument());

    // Una sola mano ("dominante"), a diferencia de /mano completo.
    const analysisCall = fetchMock.mock.calls.find((c) => c[0] === "/api/palm-analysis")!;
    expect(JSON.parse(analysisCall[1].body).hand).toBe("dominante");
    const readingCall = fetchMock.mock.calls.find((c) => c[0] === "/api/palm-reading")!;
    const readingBody = JSON.parse(readingCall[1].body);
    expect(readingBody.hands.dominante).toBeTruthy();
    expect(readingBody.hands.pasiva).toBeUndefined();
    expect(readingBody.profileId).toBe(PROFILE_ID);

    // Guardó en el MISMO storage que /mano (aluna.palm.<profileId>).
    const raw = localStorage.getItem(`aluna.palm.${PROFILE_ID}`);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!).sections.sintesis).toBe(SECTIONS.sintesis);

    // CTA a la ceremonia completa sigue disponible.
    expect(screen.getByRole("link", { name: new RegExp(es.hoy.summaryManoCta) })).toHaveAttribute("href", "/mano");
  });

  it("dormido: {available:false} muestra el estado dormido del oráculo", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ available: false }) });
    const { container } = renderSummary();

    uploadFile(container);
    await waitFor(() => expect(screen.getByText(new RegExp(es.mano.dormantBody))).toBeInTheDocument());
  });

  it("error de red: aviso + Reintentar vuelve al botón de subir", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));
    const { container } = renderSummary();

    uploadFile(container);
    await waitFor(() => expect(screen.getByText(es.mano.error)).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: es.mano.retry }));
    expect(screen.getByText(es.mano.captureCta)).toBeInTheDocument();
  });
});
