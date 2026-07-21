import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";
import { ThemeProvider } from "@/lib/theme/theme-provider";
import type { ShareLensParams } from "@/lib/share/types";
import { ShareModal } from "../share-modal";

const writeTextMock = vi.fn();
const NUMEROS_PARAMS: ShareLensParams = { lens: "numeros", number: 7, labelKey: "lifePath" };

function renderModal(params: ShareLensParams = NUMEROS_PARAMS) {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <ThemeProvider initialTheme="observatory" initialMode="dark" persist={vi.fn()}>
        <ShareModal open onClose={vi.fn()} params={params} />
      </ThemeProvider>
    </NextIntlClientProvider>,
  );
}

function previewSrc() {
  return screen.getByAltText(es.share.previewAlt).getAttribute("src")!;
}

describe("ShareModal", () => {
  beforeEach(() => {
    writeTextMock.mockReset().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText: writeTextMock } });
    // jsdom no implementa Web Share API — explícito por test para no depender
    // del entorno; cada test que necesite canShareFiles:true lo mockea.
    Object.assign(navigator, { canShare: undefined, share: undefined });
  });
  afterEach(() => {
    // @ts-expect-error -- limpia los mocks del navigator entre tests
    delete navigator.canShare;
    // @ts-expect-error -- idem
    delete navigator.share;
  });

  it("arranca en formato story, tema observatory (tema activo de la app) y detalle encendido", () => {
    renderModal();
    expect(previewSrc()).toMatch(/format=story/);
    expect(previewSrc()).toMatch(/theme=observatory/);
    expect(previewSrc()).toMatch(/detail=1/);
    expect(screen.getByRole("button", { name: es.share.formatStory })).toHaveAttribute("aria-pressed", "true");
  });

  it("cambiar el formato actualiza el src del preview", () => {
    renderModal();
    fireEvent.click(screen.getByRole("button", { name: es.share.formatFeed }));
    expect(previewSrc()).toMatch(/format=feed/);
  });

  it("cambiar el tema actualiza el src del preview y marca el swatch activo", () => {
    renderModal();
    const auroraDot = screen.getByRole("button", { name: es.share.themeNames.aurora });
    fireEvent.click(auroraDot);
    expect(previewSrc()).toMatch(/theme=aurora/);
    expect(auroraDot).toHaveAttribute("aria-pressed", "true");
  });

  it("apagar 'mostrar detalle' actualiza el src del preview (detail=0)", () => {
    renderModal();
    fireEvent.click(screen.getByRole("button", { name: es.share.showDetail }));
    expect(previewSrc()).toMatch(/detail=0/);
  });

  it("'Mostrar el nombre' arranca apagado (default OFF, name=0) y no se consulta profileId sin uno", () => {
    renderModal();
    expect(previewSrc()).toMatch(/name=0/);
    expect(screen.getByRole("button", { name: es.share.showName })).toHaveAttribute("aria-pressed", "false");
  });

  it("prender 'Mostrar el nombre' actualiza el src del preview (name=1)", () => {
    renderModal();
    fireEvent.click(screen.getByRole("button", { name: es.share.showName }));
    expect(previewSrc()).toMatch(/name=1/);
    expect(screen.getByRole("button", { name: es.share.showName })).toHaveAttribute("aria-pressed", "true");
  });

  it("con profileId en los params de la lente, se reenvía en el src del preview", () => {
    renderModal({ lens: "numeros", number: 7, labelKey: "lifePath", profileId: "11111111-1111-1111-1111-111111111111" });
    expect(previewSrc()).toMatch(/profileId=11111111-1111-1111-1111-111111111111/);
  });

  it("la nota de privacidad nunca promete nombre — solo excluye fecha/hora/lugar", () => {
    renderModal();
    expect(screen.getByText(es.share.privacyNote)).toBeInTheDocument();
  });

  it("sin soporte de compartir archivos, muestra los 3 links de escritorio en vez de 'Compartir'", () => {
    renderModal();
    expect(screen.queryByRole("button", { name: es.share.share })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: `${es.share.share} WhatsApp` })).toHaveAttribute("target", "_blank");
    expect(screen.getByRole("link", { name: `${es.share.share} Telegram` })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: `${es.share.share} X` })).toBeInTheDocument();
  });

  it("con soporte de compartir archivos, muestra el botón primario 'Compartir' en vez de los links", async () => {
    Object.assign(navigator, { canShare: vi.fn(() => true), share: vi.fn().mockResolvedValue(undefined) });
    renderModal();
    await waitFor(() => expect(screen.getByRole("button", { name: es.share.share })).toBeInTheDocument());
    expect(screen.queryByRole("link", { name: `${es.share.share} WhatsApp` })).not.toBeInTheDocument();
  });

  it("copiar caption escribe en el portapapeles y muestra el estado 'copiado'", async () => {
    renderModal();
    fireEvent.click(screen.getByRole("button", { name: es.share.copyCaption }));
    await waitFor(() => expect(writeTextMock).toHaveBeenCalledTimes(1));
    expect(writeTextMock.mock.calls[0]![0]).toContain("aluna.plus");
    await waitFor(() => expect(screen.getByRole("button", { name: es.share.copied })).toBeInTheDocument());
  });
});
