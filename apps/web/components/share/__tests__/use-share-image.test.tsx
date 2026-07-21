import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";
import { ThemeProvider } from "@/lib/theme/theme-provider";
import type { ShareLensParams } from "@/lib/share/types";
import { useShareImage } from "../use-share-image";

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <NextIntlClientProvider locale="es" messages={es}>
      <ThemeProvider initialTheme="observatory" initialMode="dark" persist={vi.fn()}>
        {children}
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}

function fakeBlobResponse() {
  return { ok: true, blob: () => Promise.resolve(new Blob(["x"], { type: "image/jpeg" })) };
}

describe("useShareImage", () => {
  const writeTextMock = vi.fn();

  beforeEach(() => {
    writeTextMock.mockReset().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText: writeTextMock } });
    global.fetch = vi.fn().mockResolvedValue(fakeBlobResponse()) as unknown as typeof fetch;
    URL.createObjectURL = vi.fn(() => "blob:mock-url");
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });

  afterEach(() => {
    // Nota: NO vi.restoreAllMocks() acá — resetearía también el mock global
    // de window.matchMedia de vitest.setup.ts (vi.fn() sin implementación
    // "original" a la que volver), rompiendo el resto de la suite.
    vi.mocked(HTMLAnchorElement.prototype.click).mockRestore();
    // @ts-expect-error -- limpia los mocks del navigator entre tests
    delete navigator.canShare;
    // @ts-expect-error -- idem
    delete navigator.share;
  });

  it("construye la query string por lente (mismos nombres de campo que lib/share/validate.ts)", () => {
    const cases: Array<[ShareLensParams, RegExp[]]> = [
      [{ lens: "numeros", number: 22, labelKey: "expression" }, [/lens=numeros/, /number=22/, /labelKey=expression/]],
      [{ lens: "carta", body: "moon", sign: "cancer" }, [/lens=carta/, /body=moon/, /sign=cancer/]],
      [{ lens: "pilares", dayStem: "jia" }, [/lens=pilares/, /dayStem=jia/]],
      [{ lens: "tarot", cardId: "fool", reversed: true }, [/lens=tarot/, /cardId=fool/, /reversed=1/]],
      [{ lens: "horoscopo", sign: "leo" }, [/lens=horoscopo/, /sign=leo/]],
    ];
    for (const [params, patterns] of cases) {
      const { result } = renderHook(() => useShareImage(params), { wrapper });
      for (const re of patterns) expect(result.current.imageUrl).toMatch(re);
    }
  });

  it("posición de tarot es opcional pero se serializa si viene", () => {
    const { result } = renderHook(
      () => useShareImage({ lens: "tarot", cardId: "sun", reversed: false, position: "present" }),
      { wrapper },
    );
    expect(result.current.imageUrl).toMatch(/position=present/);
  });

  it("shareLinks arma wa.me / t.me / twitter.com con el caption codificado", () => {
    const { result } = renderHook(() => useShareImage({ lens: "numeros", number: 7, labelKey: "lifePath" }), { wrapper });
    expect(result.current.shareLinks.whatsapp).toMatch(/^https:\/\/wa\.me\/\?text=/);
    expect(result.current.shareLinks.telegram).toMatch(/^https:\/\/t\.me\/share\/url\?url=/);
    expect(result.current.shareLinks.twitter).toMatch(/^https:\/\/twitter\.com\/intent\/tweet\?text=/);
    expect(decodeURIComponent(result.current.shareLinks.whatsapp.split("text=")[1]!)).toBe(result.current.caption);
  });

  it("download(): trae el blob, crea un enlace descargable y lo dispara", async () => {
    const { result } = renderHook(() => useShareImage({ lens: "numeros", number: 7, labelKey: "lifePath" }), { wrapper });
    await act(async () => {
      await result.current.download();
    });
    expect(fetch).toHaveBeenCalledWith(result.current.imageUrl);
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
    // El revoke es diferido (setTimeout 1s): revocar síncrono tras click()
    // puede cancelar la descarga en Firefox/Safari.
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url"), { timeout: 2000 });
  });

  it("shareNative(): solo llama navigator.share si canShare da luz verde", async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { canShare: vi.fn(() => true), share: shareMock });
    const { result } = renderHook(() => useShareImage({ lens: "numeros", number: 7, labelKey: "lifePath" }), { wrapper });
    await act(async () => {
      await result.current.shareNative();
    });
    expect(shareMock).toHaveBeenCalledTimes(1);
    const call = shareMock.mock.calls[0]![0];
    expect(call.files[0]).toBeInstanceOf(File);
    expect(call.text).toBe(result.current.caption);
  });

  it("copyCaption(): escribe el caption y vuelve a 'sin copiar' tras el timeout", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { result } = renderHook(() => useShareImage({ lens: "numeros", number: 7, labelKey: "lifePath" }), { wrapper });
    await act(async () => {
      await result.current.copyCaption();
    });
    expect(writeTextMock).toHaveBeenCalledWith(result.current.caption);
    expect(result.current.copied).toBe(true);
    act(() => vi.advanceTimersByTime(1600));
    expect(result.current.copied).toBe(false);
    vi.useRealTimers();
  });

  it("el tema por defecto es el tema activo de la app cuando es un ShareTheme válido", () => {
    const { result } = renderHook(() => useShareImage({ lens: "numeros", number: 7, labelKey: "lifePath" }), { wrapper });
    expect(result.current.theme).toBe("observatory");
  });
});
