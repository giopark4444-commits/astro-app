import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";
import { CameraCapture } from "../camera-capture";

// getUserMedia real no existe en jsdom (ni <video>.play(), ni un <canvas> 2D
// real — mismo motivo por el que resize-image.ts se mockea en vez de probarse
// con canvas real, ver mano-view.test.tsx). Acá SÍ tocamos el canvas
// directamente porque `snap()` no hace matemática de píxeles (nada que un
// canvas falso invalide) — solo llama drawImage/toBlob, así que mockear esos
// dos verifica el cableado real sin fragilidad.
function stubTrack() {
  return { stop: vi.fn() };
}

function stubStream(tracks = [stubTrack()]) {
  return { getTracks: () => tracks } as unknown as MediaStream;
}

function renderCamera(onCapture = vi.fn(), onCancel = vi.fn()) {
  const utils = render(
    <NextIntlClientProvider locale="es" messages={es}>
      <CameraCapture onCapture={onCapture} onCancel={onCancel} />
    </NextIntlClientProvider>,
  );
  return { ...utils, onCapture, onCancel };
}

describe("CameraCapture", () => {
  const originalMediaDevices = navigator.mediaDevices;
  let playSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    playSpy = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
  });

  afterEach(() => {
    playSpy.mockRestore();
    Object.defineProperty(navigator, "mediaDevices", { value: originalMediaDevices, configurable: true });
    vi.restoreAllMocks();
  });

  it("pide la cámara (facingMode environment) y muestra el snap habilitado al quedar lista", async () => {
    const getUserMedia = vi.fn().mockResolvedValue(stubStream());
    Object.defineProperty(navigator, "mediaDevices", { value: { getUserMedia }, configurable: true });

    renderCamera();

    await waitFor(() => expect(screen.getByRole("button", { name: es.mano.cameraSnap })).toBeEnabled());
    expect(getUserMedia).toHaveBeenCalledWith({ video: { facingMode: "environment" }, audio: false });
    expect(screen.queryByText(es.mano.cameraLoading)).not.toBeInTheDocument();
  });

  it("muestra el aviso de carga hasta que el stream está listo", async () => {
    let resolveStream!: (s: MediaStream) => void;
    const getUserMedia = vi.fn(
      () =>
        new Promise<MediaStream>((resolve) => {
          resolveStream = resolve;
        }),
    );
    Object.defineProperty(navigator, "mediaDevices", { value: { getUserMedia }, configurable: true });

    renderCamera();

    expect(screen.getByText(es.mano.cameraLoading)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: es.mano.cameraSnap })).toBeDisabled();

    resolveStream(stubStream());
    await waitFor(() => expect(screen.getByRole("button", { name: es.mano.cameraSnap })).toBeEnabled());
  });

  it("sin getUserMedia (no soportado) cae directo al estado de error", async () => {
    Object.defineProperty(navigator, "mediaDevices", { value: undefined, configurable: true });

    renderCamera();

    expect(await screen.findByText(es.mano.cameraError)).toBeInTheDocument();
  });

  it("si getUserMedia rechaza (permiso denegado) muestra el error", async () => {
    const getUserMedia = vi.fn().mockRejectedValue(new Error("NotAllowedError"));
    Object.defineProperty(navigator, "mediaDevices", { value: { getUserMedia }, configurable: true });

    renderCamera();

    expect(await screen.findByText(es.mano.cameraError)).toBeInTheDocument();
  });

  it("Cancelar en el estado de error dispara onCancel", async () => {
    Object.defineProperty(navigator, "mediaDevices", { value: undefined, configurable: true });
    const { onCancel } = renderCamera();

    fireEvent.click(await screen.findByRole("button", { name: es.mano.cameraCancel }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("Cancelar con la cámara lista dispara onCancel (el padre desmonta y ahí se corta el stream)", async () => {
    const track = stubTrack();
    const getUserMedia = vi.fn().mockResolvedValue(stubStream([track]));
    Object.defineProperty(navigator, "mediaDevices", { value: { getUserMedia }, configurable: true });
    const { onCancel } = renderCamera();

    await waitFor(() => expect(screen.getByRole("button", { name: es.mano.cameraSnap })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: es.mano.cameraCancel }));

    // El botón Cancelar solo notifica: no es su trabajo cortar el stream. En
    // mano-view.tsx/summary-mano.tsx, onCancel hace setShowCamera(false), lo
    // que DESMONTA <CameraCapture> — y ahí el cleanup del useEffect (probado
    // abajo, "desmontar con la cámara activa...") corta el track de verdad.
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(track.stop).not.toHaveBeenCalled();
  });

  it("desmontar con la cámara activa detiene el stream (nunca queda prendida de fondo)", async () => {
    const track = stubTrack();
    const getUserMedia = vi.fn().mockResolvedValue(stubStream([track]));
    Object.defineProperty(navigator, "mediaDevices", { value: { getUserMedia }, configurable: true });
    const { unmount } = renderCamera();

    await waitFor(() => expect(getUserMedia).toHaveBeenCalled());
    unmount();
    await waitFor(() => expect(track.stop).toHaveBeenCalledTimes(1));
  });

  it("Capturar dibuja el frame actual y entrega un File jpeg vía onCapture", async () => {
    const getUserMedia = vi.fn().mockResolvedValue(stubStream());
    Object.defineProperty(navigator, "mediaDevices", { value: { getUserMedia }, configurable: true });
    const drawImage = vi.fn();
    const getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D);
    const toBlobSpy = vi
      .spyOn(HTMLCanvasElement.prototype, "toBlob")
      .mockImplementation(function (this: HTMLCanvasElement, cb: BlobCallback) {
        cb(new Blob(["fake-jpeg"], { type: "image/jpeg" }));
      });

    const { onCapture } = renderCamera();
    await waitFor(() => expect(screen.getByRole("button", { name: es.mano.cameraSnap })).toBeEnabled());

    const video = document.querySelector("video") as HTMLVideoElement;
    Object.defineProperty(video, "videoWidth", { value: 640, configurable: true });
    Object.defineProperty(video, "videoHeight", { value: 480, configurable: true });

    fireEvent.click(screen.getByRole("button", { name: es.mano.cameraSnap }));

    expect(drawImage).toHaveBeenCalledWith(video, 0, 0);
    expect(onCapture).toHaveBeenCalledTimes(1);
    const call = onCapture.mock.calls[0];
    const file = call?.[0] as File;
    expect(file.name).toBe("captura-mano.jpg");
    expect(file.type).toBe("image/jpeg");

    getContextSpy.mockRestore();
    toBlobSpy.mockRestore();
  });

  it("Capturar sin videoWidth (video aún no listo) no llama a onCapture", async () => {
    const getUserMedia = vi.fn().mockResolvedValue(stubStream());
    Object.defineProperty(navigator, "mediaDevices", { value: { getUserMedia }, configurable: true });

    const { onCapture } = renderCamera();
    await waitFor(() => expect(screen.getByRole("button", { name: es.mano.cameraSnap })).toBeEnabled());

    fireEvent.click(screen.getByRole("button", { name: es.mano.cameraSnap }));

    expect(onCapture).not.toHaveBeenCalled();
  });
});
